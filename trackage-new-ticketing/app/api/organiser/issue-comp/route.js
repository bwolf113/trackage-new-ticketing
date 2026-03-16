/* app/api/organiser/issue-comp/route.js
   POST — issue complimentary tickets to attendees
   Body: { event_id, attendees: [{ first_name, last_name, email, quantity, ticket_id }] }
   Auth: Bearer token
*/
import { createClient } from '@supabase/supabase-js';
import { sendEmail, ticketConfirmationEmail } from '../../../../lib/sendEmail';
import { generateQRPublicURL } from '../../../../lib/qrcode.js';
import crypto from 'crypto';
import { getOrganiserFromRequest } from '../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const { organiser, errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { event_id, attendees } = body;
    const organiser_id = organiser.id;

    if (!event_id)          return Response.json({ error: 'event_id required' },  { status: 400 });
    if (!attendees?.length) return Response.json({ error: 'attendees required' }, { status: 400 });

    const supabase = adminSupabase();

    // Verify ownership
    const { data: event } = await supabase
      .from('events')
      .select('id, name, start_time, venue_name, organiser_id')
      .eq('id', event_id)
      .single();

    if (!event || event.organiser_id !== organiser_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch organiser for email template
    const { data: organiserData } = await supabase
      .from('organisers')
      .select('id, name, vat_number')
      .eq('id', organiser_id)
      .single();

    // Fetch tickets for this event
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, name, price')
      .eq('event_id', event_id);

    const ticketMap = Object.fromEntries((tickets || []).map(t => [t.id, t]));
    const firstTicket = (tickets || [])[0];

    const results = [];

    for (const attendee of attendees) {
      const { first_name, last_name, email, quantity = 1, ticket_id } = attendee;

      if (!email || !first_name) {
        results.push({ email: email || '?', success: false, error: 'Missing name or email' });
        continue;
      }

      const ticket = ticketMap[ticket_id] || firstTicket;
      if (!ticket) {
        results.push({ email, success: false, error: 'No ticket type available for this event' });
        continue;
      }

      const customerName = `${first_name} ${last_name || ''}`.trim();
      const qty = Math.max(1, parseInt(quantity) || 1);
      const qrToken = crypto.randomUUID();

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          event_id,
          organiser_id,
          status:         'completed',
          total:          0,
          booking_fee:    0,
          customer_name:  customerName,
          customer_email: email,
          qr_token:       qrToken,
        })
        .select('id, total, customer_name, customer_email, qr_token, event_id')
        .single();

      if (orderErr || !order) {
        results.push({ email, success: false, error: orderErr?.message || 'Failed to create order' });
        continue;
      }

      // Create order items
      await supabase.from('order_items').insert({
        order_id:    order.id,
        ticket_id:   ticket.id,
        ticket_name: ticket.name,
        quantity:    qty,
        unit_price:  0,
      });

      // Create one order_attendee per ticket (with individual QR tokens)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tickets.trackagescheme.com';
      const attendeeInserts = Array.from({ length: qty }, () => ({
        order_id:    order.id,
        ticket_name: ticket.name,
        qr_token:    crypto.randomUUID(),
      }));
      const { data: createdAttendees } = await supabase
        .from('order_attendees')
        .insert(attendeeInserts)
        .select('id, ticket_name, qr_token');

      // Generate QR images for each attendee
      const attendees = await Promise.all((createdAttendees || []).map(async (a) => {
        const qrUrl = await generateQRPublicURL(
          `${siteUrl}/scan/${a.qr_token}`,
          `qr-${a.id.slice(0, 8)}`
        );
        return { ...a, qr_url: qrUrl };
      }));

      // Build and send ticket email with individual QR codes
      const html = await ticketConfirmationEmail({
        order,
        event,
        orderItems: [{ ticket_name: ticket.name, quantity: qty, unit_price: 0 }],
        organiser: organiserData,
        attendees,
      });

      const emailResult = await sendEmail({
        to:      email,
        subject: `🎫 Your complimentary ticket${qty > 1 ? 's' : ''} — ${event.name}`,
        html,
      });

      results.push({
        email,
        success:  emailResult.success,
        order_id: order.id,
        quantity: qty,
        error:    emailResult.success ? undefined : emailResult.error,
      });
    }

    const successfulResults = results.filter(r => r.success);
    return Response.json({
      success:      successfulResults.length > 0,
      sent:         successfulResults.length,
      tickets_sent: successfulResults.reduce((s, r) => s + (r.quantity || 1), 0),
      failed:       results.filter(r => !r.success).length,
      results,
    });
  } catch (err) {
    console.error('Issue comp error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
