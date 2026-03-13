/* app/api/organiser/resend-ticket/route.js
   POST — resend ticket email for an order, verified by organiser ownership.
   Body: { order_id, organiser_id }
*/
import { createClient } from '@supabase/supabase-js';
import { sendEmail, ticketConfirmationEmail } from '../../../../lib/sendEmail';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const { order_id, organiser_id } = await req.json();
    if (!order_id)      return Response.json({ error: 'order_id required' },      { status: 400 });
    if (!organiser_id)  return Response.json({ error: 'organiser_id required' },  { status: 400 });

    const supabase = adminSupabase();

    // Fetch order with related data (separate queries to avoid FK issues)
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, total, booking_fee, customer_name, customer_email, qr_token, event_id, organiser_id')
      .eq('id', order_id)
      .single();

    if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (!order.customer_email) return Response.json({ error: 'Order has no email address' }, { status: 400 });

    // Verify the order belongs to an event owned by this organiser
    const { data: event } = order.event_id
      ? await supabase.from('events').select('id, name, start_time, venue_name, organiser_id').eq('id', order.event_id).single()
      : { data: null };

    if (!event || event.organiser_id !== organiser_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch order items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, ticket_name, quantity, unit_price')
      .eq('order_id', order_id);

    // Fetch organiser for VAT info
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id, name, vat_number')
      .eq('id', organiser_id)
      .single();

    const result = await sendEmail({
      to:      order.customer_email,
      subject: `🎫 Your tickets for ${event?.name || 'the event'} — #${order_id.slice(0, 8).toUpperCase()}`,
      html:    await ticketConfirmationEmail({
        order,
        event,
        orderItems: orderItems || [],
        organiser,
      }),
    });

    if (!result.success) return Response.json({ error: result.error }, { status: 500 });
    return Response.json({ success: true, to: order.customer_email });
  } catch (err) {
    console.error('Resend ticket error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
