/* app/api/organiser/events/[id]/attendees/route.js
   GET   — attendee list for an event (auth via Bearer token)
   PATCH — manually check in all attendees for an order (auth via Bearer token)
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req, { params }) {
  const { id: eventId } = await params;
  const { organiser, errorResponse } = await getOrganiserFromRequest(req);
  if (errorResponse) return errorResponse;

  const supabase = adminSupabase();

  // Verify ownership
  const { data: event } = await supabase
    .from('events')
    .select('id, name, start_time, venue_name, organiser_id')
    .eq('id', eventId)
    .single();

  if (!event || event.organiser_id !== organiser.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Completed orders for this event
  const { data: orders } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, customer_phone, total, booking_fee, created_at, qr_token, marketing_consent, checked_in_at')
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

  // Fetch order_attendees check-in data
  const { data: orderAttendees } = await supabase
    .from('order_attendees')
    .select('id, order_id, checked_in_at')
    .in('order_id', orderIds);

  const attendeesByOrder = {};
  for (const row of orderAttendees || []) {
    if (!attendeesByOrder[row.order_id]) attendeesByOrder[row.order_id] = [];
    attendeesByOrder[row.order_id].push(row);
  }

  const attendees = orders.map(order => {
    const oa = attendeesByOrder[order.id] || [];
    const checkedRows = oa.filter(a => a.checked_in_at);
    // For legacy orders (no order_attendees), fall back to orders.checked_in_at
    const lastCheckedAt = checkedRows.length > 0
      ? checkedRows.reduce((max, a) => a.checked_in_at > max ? a.checked_in_at : max, '')
      : (oa.length === 0 ? order.checked_in_at : null);
    return {
      order_id:           order.id,
      name:               order.customer_name   || '—',
      email:              order.customer_email  || '—',
      phone:              order.customer_phone  || '—',
      total:              (order.total || 0) - (order.booking_fee || 0),
      created_at:         order.created_at,
      qr_token:           order.qr_token,
      marketing_consent:  order.marketing_consent || false,
      tickets:            itemsByOrder[order.id] || [],
      ticket_summary:     (itemsByOrder[order.id] || [])
        .map(i => `${i.quantity}× ${i.ticket_name}`)
        .join(', '),
      checkin_total:   oa.length || (order.checked_in_at ? 1 : 0),
      checkin_count:   checkedRows.length || (order.checked_in_at ? 1 : 0),
      checked_in_at:   lastCheckedAt,
    };
  });

  return Response.json({ event, attendees });
}

export async function PATCH(req, { params }) {
  const { id: eventId } = await params;
  const { organiser, errorResponse } = await getOrganiserFromRequest(req);
  if (errorResponse) return errorResponse;

  const { order_id, undo } = await req.json();
  if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

  const supabase = adminSupabase();

  // Verify ownership
  const { data: event } = await supabase
    .from('events').select('organiser_id').eq('id', eventId).single();
  if (!event || event.organiser_id !== organiser.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify order belongs to this event
  const { data: order } = await supabase
    .from('orders').select('id, event_id').eq('id', order_id).single();
  if (!order || order.event_id !== eventId) {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }

  if (undo) {
    const { error } = await supabase
      .from('order_attendees')
      .update({ checked_in_at: null })
      .eq('order_id', order_id);
    await supabase.from('orders').update({ checked_in_at: null }).eq('id', order_id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, checked_in_at: null });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('order_attendees')
    .update({ checked_in_at: now })
    .eq('order_id', order_id)
    .is('checked_in_at', null);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, checked_in_at: now });
}
