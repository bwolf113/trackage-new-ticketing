/* app/api/webhook/route.js */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, ticketConfirmationEmail, bookingFeeReceiptEmail, adminNewOrderEmail } from '../../../lib/sendEmail';
import { generateQRPublicURL } from '../../../lib/qrcode';

export async function POST(req) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Supabase env vars not set' }, { status: 500 });
  }

  // ── Get Stripe key from Supabase settings ──────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  let webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_FORCE_TEST) {
    try {
      const { data: setting } = await supabase
        .from('settings').select('value').eq('key', 'stripe').single();
      if (setting?.value) {
        const cfg  = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        const mode = cfg.active_mode || 'test';
        if (cfg[mode]?.secret_key)  stripeSecretKey = cfg[mode].secret_key;
        if (cfg[mode]?.webhook_secret) webhookSecret = cfg[mode].webhook_secret;
      }
    } catch {}
  } else {
    console.log('STRIPE_FORCE_TEST: using .env.local test keys');
  }

  if (!stripeSecretKey) {
    return Response.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);

  // ── Verify signature ───────────────────────────────────────────
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }
  if (!signature) {
    console.error('Missing stripe-signature header');
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return Response.json({ error: err.message }, { status: 400 });
  }

  console.log(`Webhook: ${event.type}`);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (!orderId) { console.warn('No order_id in metadata'); break; }

        // Idempotency: skip if already processed
        const { data: existingOrder } = await supabase
          .from('orders').select('id, status').eq('id', orderId).single();
        if (existingOrder?.status === 'completed') {
          console.log(`Order ${orderId} already completed — skipping`);
          break;
        }

        // Generate unique QR token for this order
        const qrToken = crypto.randomUUID();

        // Mark order completed
        await supabase.from('orders').update({
          status:                'completed',
          stripe_payment_intent: session.payment_intent || null,
          customer_email:        session.customer_email || session.customer_details?.email || null,
          qr_token:              qrToken,
          updated_at:            new Date().toISOString(),
        }).eq('id', orderId);

        console.log(`Order ${orderId} → completed`);

        // Update ticket sold counts via ticket_name
        const { data: orderItems } = await supabase
          .from('order_items').select('ticket_name, quantity').eq('order_id', orderId);

        const eventId = session.metadata?.event_id;
        for (const item of orderItems || []) {
          if (!item.ticket_name || !eventId) continue;
          const { data: t } = await supabase.from('tickets').select('id, sold').eq('name', item.ticket_name).eq('event_id', eventId).maybeSingle();
          if (t) await supabase.from('tickets').update({ sold: (t.sold || 0) + (item.quantity || 0) }).eq('id', t.id);
        }

        // ── Create one order_attendee row per physical ticket ─────
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
            console.error('order_attendees insert failed:', attendeeError.message);
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
        console.log(`Created ${attendees.length} attendee QR codes for order ${orderId}`);

        // ── Fetch full order data for emails ──────────────────────
        const { data: order } = await supabase
          .from('orders')
          .select('*, order_items(id, ticket_name, quantity, unit_price)')
          .eq('id', orderId)
          .single();

        const { data: eventData } = order?.event_id
          ? await supabase.from('events').select('id, name, start_time, venue_name').eq('id', order.event_id).single()
          : { data: null };

        const items = order?.order_items || [];
        const toEmail = order?.customer_email;

        // ── Fetch organiser for VAT number ────────────────────────
        let organiserData = null;
        if (order?.organiser_id) {
          const { data: org } = await supabase.from('organisers').select('id, name, email, vat_number').eq('id', order.organiser_id).single();
          organiserData = org;
        } else if (eventData?.organiser_id) {
          const { data: org } = await supabase.from('organisers').select('id, name, email, vat_number').eq('id', eventData.organiser_id).single();
          organiserData = org;
        }

        // ── 1. Ticket confirmation email (no attachment — QR in body) ─
        if (toEmail && order) {
          const ticketResult = await sendEmail({
            to:      toEmail,
            subject: `🎫 Your tickets for ${eventData?.name || 'the event'} — #${orderId.slice(0,8).toUpperCase()}`,
            html:    await ticketConfirmationEmail({ order, event: eventData, orderItems: items, organiser: organiserData, attendees }),
          });
          console.log(`Ticket email to ${toEmail}:`, ticketResult);
        }

        // ── 2. Booking fee receipt email ──────────────────────────
        if (toEmail && order && (order.booking_fee || 0) > 0) {
          const receiptResult = await sendEmail({
            to:      toEmail,
            subject: `🧾 Booking fee receipt — ${eventData?.name || 'Event'} — #${orderId.slice(0,8).toUpperCase()}`,
            html:    await bookingFeeReceiptEmail({ order, event: eventData, receiptNumber: orderId.slice(0,8).toUpperCase() }),
          });
          console.log(`Receipt email to ${toEmail}:`, receiptResult);
        }

        // ── 2. Admin notification ─────────────────────────────────
        const adminEmail = process.env.ADMIN_EMAIL || 'team@trackagescheme.com';
        if (order) {
          const adminResult = await sendEmail({
            to:      adminEmail,
            subject: `💰 New order #${orderId.slice(0,8).toUpperCase()} — ${fmt(order.total)} — ${eventData?.name || ''}`,
            html:    await adminNewOrderEmail({ order, event: eventData, orderItems: items }),
          });
          console.log(`Admin notification to ${adminEmail}:`, adminResult);
        }

        // ── 3. Email campaign conversion tracking ───────────────
        const utmId = session.metadata?.utm_id;
        if (utmId && toEmail) {
          try {
            // Verify the campaign exists
            const { data: camp } = await supabase
              .from('email_campaigns').select('id').eq('id', utmId).single();
            if (camp) {
              await supabase.from('email_events').insert({
                campaign_id: utmId,
                email: toEmail,
                event_type: 'converted',
                metadata: { order_id: orderId, total: order?.total },
              });
              // Increment converted_count
              const { data: campData } = await supabase
                .from('email_campaigns').select('converted_count').eq('id', utmId).single();
              if (campData) {
                await supabase.from('email_campaigns')
                  .update({ converted_count: (campData.converted_count || 0) + 1 })
                  .eq('id', utmId);
              }
              console.log(`Email conversion tracked: campaign ${utmId}, order ${orderId}`);
            }
          } catch (convErr) {
            console.error('Email conversion tracking error:', convErr.message);
          }
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        const { data: orders } = await supabase
          .from('orders').select('id').eq('stripe_payment_intent', pi.id).limit(1);
        if (orders?.length) {
          await supabase.from('orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', orders[0].id);
          console.log(`Order ${orders[0].id} → failed`);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', orderId);
          console.log(`Order ${orderId} → cancelled`);
        }
        break;
      }

      default:
        console.log(`Unhandled: ${event.type}`);
    }
  } catch (err) {
    // Log but return 200 — returning 5xx causes Stripe to retry, which can double-process
    console.error('Webhook processing error:', err);
  }

  return Response.json({ received: true });
}

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
