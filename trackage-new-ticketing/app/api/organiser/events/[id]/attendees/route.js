/* app/api/organiser/events/[id]/attendees/route.js
   GET — attendee list for an event (query: organiser_id)
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req, { params }) {
  const { id: eventId } = await params;
  const { searchParams } = new URL(req.url);
  const organiser_id = searchParams.get('organiser_id');
  if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

  const supabase = adminSupabase();

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('id, name, start_time, venue_name, organiser_id')
    .eq('id', eventId)
    .single();

  if (!event || event.organiser_id !== organiser_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Completed orders for this event
  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, customer_phone, total, created_at, qr_token, marketing_consent')
    .eq('event_id', eventId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (!orders?.length) {
    return Response.json({ event, attendees: [] });
  }

  const orderIds = orders.map(o => o.id);

  // Fetch order items
  const { data: items } = await supabase
    .from('order_items')
    .select('order_id, ticket_name, quantity, unit_price')
    .in('order_id', orderIds);

  const itemsByOrder = {};
  for (const item of items || []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  const attendees = orders.map(order => ({
    order_id:          order.id,
    name:              order.customer_name   || '—',
    email:             order.customer_email  || '—',
    phone:             order.customer_phone  || '—',
    total:             order.total,
    created_at:        order.created_at,
    qr_token:          order.qr_token,
    marketing_consent: order.marketing_consent || false,
    tickets:           itemsByOrder[order.id] || [],
    ticket_summary:    (itemsByOrder[order.id] || [])
      .map(i => `${i.quantity}× ${i.ticket_name}`)
      .join(', '),
  }));

  return Response.json({ event, attendees });
}
