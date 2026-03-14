/* app/api/admin/resend-ticket/route.js */
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
    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

    const supabase = adminSupabase();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, status, total, booking_fee, customer_name, customer_email,
        qr_token, event_id, organiser_id,
        events ( id, name, start_time, venue_name ),
        organisers ( id, name, vat_number ),
        order_items ( id, ticket_name, quantity, unit_price )
      `)
      .eq('id', order_id)
      .single();

    if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (!order.customer_email) return Response.json({ error: 'Order has no email address' }, { status: 400 });

    // Fetch per-ticket attendees (for multi-QR email)
    const { data: attendees } = await supabase
      .from('order_attendees')
      .select('id, ticket_name, qr_token')
      .eq('order_id', order_id)
      .order('created_at', { ascending: true });

    const result = await sendEmail({
      to: order.customer_email,
      subject: `🎫 Your tickets for ${order.events?.name || 'the event'} — #${order_id.slice(0, 8).toUpperCase()}`,
      html: await ticketConfirmationEmail({
        order,
        event: order.events,
        orderItems: order.order_items || [],
        organiser: order.organisers,
        attendees: attendees || [],
      }),
    });

    if (!result.success) return Response.json({ error: result.error }, { status: 500 });
    return Response.json({ success: true, to: order.customer_email });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
