/* app/api/confirm-order/route.js
   POST — Verify payment via Stripe and process order if webhook hasn't already.
   Called by the success page as a fallback when the webhook is delayed or unreachable.
*/
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, ticketConfirmationEmail, bookingFeeReceiptEmail, adminNewOrderEmail } from '../../../lib/sendEmail';
import { generateQRPublicURL } from '../../../lib/qrcode';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export async function POST(req) {
  try {
    const { session_id } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id required' }, { status: 400 });

    const supabase = adminSupabase();

    // ── Get Stripe key ──────────────────────────────────────────────
    let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!process.env.STRIPE_FORCE_TEST) {
      try {
        const { data: setting } = await supabase
          .from('settings').select('value').eq('key', 'stripe').single();
        if (setting?.value) {
          const cfg  = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
          const mode = cfg.active_mode || 'test';
          if (cfg[mode]?.secret_key) stripeSecretKey = cfg[mode].secret_key;
        }
      } catch {}
    }
    if (!stripeSecretKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const stripe = new Stripe(stripeSecretKey);

    // ── Find the order by session ID ────────────────────────────────
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, event_id, customer_email, organiser_id, total, booking_fee, discount, coupon_code')
      .eq('stripe_session_id', session_id)
      .single();

    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Already processed — return immediately
    if (order.status === 'completed') {
      return Response.json({ ok: true, already_completed: true });
    }

    // ── Verify payment with Stripe ──────────────────────────────────
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not confirmed by Stripe' }, { status: 402 });
    }

    const orderId = order.id;
    const eventId = order.event_id || session.metadata?.event_id;

    // ── Mark order completed ────────────────────────────────────────
    const qrToken = crypto.randomUUID();
    await supabase.from('orders').update({
      status:                'completed',
      stripe_payment_intent: session.payment_intent || null,
      customer_email:        session.customer_email || session.customer_details?.email || order.customer_email || null,
      qr_token:              qrToken,
      updated_at:            new Date().toISOString(),
    }).eq('id', orderId);

    console.log(`[confirm-order] Order ${orderId} → completed`);

    // ── Update ticket sold counts ───────────────────────────────────
    const { data: orderItems } = await supabase
      .from('order_items').select('ticket_name, quantity').eq('order_id', orderId);

    for (const item of orderItems || []) {
      if (!item.ticket_name || !eventId) continue;
      const { data: t } = await supabase.from('tickets')
        .select('id, sold')
        .eq('name', item.ticket_name)
        .eq('event_id', eventId)
        .maybeSingle();
      if (t) {
        await supabase.from('tickets')
          .update({ sold: (t.sold || 0) + (item.quantity || 0) })
          .eq('id', t.id);
      }
    }

    // ── Create order_attendee rows ──────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const attendeeInserts = [];
    for (const item of orderItems || []) {
      for (let i = 0; i < (item.quantity || 1); i++) {
        attendeeInserts.push({
          order_id:    orderId,
          ticket_name: item.ticket_name,
          qr_token:    crypto.randomUUID(),
        });
      }
    }
    let attendees = [];
    if (attendeeInserts.length > 0) {
      const { data: createdAttendees, error: attendeeError } = await supabase
        .from('order_attendees')
        .insert(attendeeInserts)
        .select('id, ticket_name, qr_token');
      if (attendeeError) {
        console.error('[confirm-order] order_attendees insert failed:', attendeeError.message);
      } else if (createdAttendees) {
        attendees = await Promise.all(createdAttendees.map(async (a) => {
          const qrUrl = await generateQRPublicURL(
            `${siteUrl}/scan/${a.qr_token}`,
            `qr-${a.id.slice(0, 8)}`
          );
          return { ...a, qr_url: qrUrl };
        }));
      }
    }
    console.log(`[confirm-order] Created ${attendees.length} attendee QR codes for order ${orderId}`);

    // ── Fetch full order data for emails ─────────────────────────────
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('*, order_items(id, ticket_name, quantity, unit_price)')
      .eq('id', orderId)
      .single();

    const { data: eventData } = eventId
      ? await supabase.from('events').select('id, name, start_time, venue_name, organiser_id').eq('id', eventId).single()
      : { data: null };

    const items  = fullOrder?.order_items || [];
    const toEmail = fullOrder?.customer_email;

    // ── Fetch organiser ─────────────────────────────────────────────
    let organiserData = null;
    const orgId = fullOrder?.organiser_id || eventData?.organiser_id;
    if (orgId) {
      const { data: org } = await supabase.from('organisers')
        .select('id, name, email, vat_number').eq('id', orgId).single();
      organiserData = org;
    }

    // ── Send emails ─────────────────────────────────────────────────
    if (toEmail && fullOrder) {
      const ticketResult = await sendEmail({
        to:      toEmail,
        subject: `Your tickets for ${eventData?.name || 'the event'} — #${orderId.slice(0, 8).toUpperCase()}`,
        html:    await ticketConfirmationEmail({ order: fullOrder, event: eventData, orderItems: items, organiser: organiserData, attendees }),
      });
      console.log(`[confirm-order] Ticket email to ${toEmail}:`, ticketResult);
    }

    if (toEmail && fullOrder && (fullOrder.booking_fee || 0) > 0) {
      const receiptResult = await sendEmail({
        to:      toEmail,
        subject: `Booking fee receipt — ${eventData?.name || 'Event'} — #${orderId.slice(0, 8).toUpperCase()}`,
        html:    await bookingFeeReceiptEmail({ order: fullOrder, event: eventData, receiptNumber: orderId.slice(0, 8).toUpperCase() }),
      });
      console.log(`[confirm-order] Receipt email to ${toEmail}:`, receiptResult);
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'team@trackagescheme.com';
    if (fullOrder) {
      const adminResult = await sendEmail({
        to:      adminEmail,
        subject: `New order #${orderId.slice(0, 8).toUpperCase()} — ${fmt(fullOrder.total)} — ${eventData?.name || ''}`,
        html:    await adminNewOrderEmail({ order: fullOrder, event: eventData, orderItems: items }),
      });
      console.log(`[confirm-order] Admin notification to ${adminEmail}:`, adminResult);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[confirm-order] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
