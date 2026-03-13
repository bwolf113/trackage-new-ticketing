/* app/api/order-by-session/[sessionId]/route.js
   Fetches order by Stripe session ID using separate queries (no FK joins needed).
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req, { params }) {
  const { sessionId } = await params;
  const supabase = adminSupabase();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, total, booking_fee, discount, coupon_code, customer_email, created_at, event_id')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !order) {
    return Response.json({ order: null }, { status: 200 });
  }

  const [{ data: orderItems }, { data: event }] = await Promise.all([
    supabase.from('order_items').select('ticket_name, quantity, unit_price').eq('order_id', order.id),
    order.event_id
      ? supabase.from('events').select('name, start_time, venue_name').eq('id', order.event_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return Response.json({
    order: {
      ...order,
      order_items: orderItems || [],
      events: event || null,
    },
  });
}
