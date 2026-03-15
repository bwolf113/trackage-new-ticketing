/* app/api/admin/event-attendees/[id]/route.js
   GET   — attendee list
   PATCH — manually check in all attendees for an order (body: { order_id })
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req, { params }) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  const { id: eventId } = await params;
  const supabase = adminSupabase();

  const [{ data: event }, { data: orders }] = await Promise.all([
    supabase.from('events').select('id, name, start_time, venue_name').eq('id', eventId).single(),
    supabase.from('orders')
      .select('id, customer_name, customer_email, marketing_consent, checked_in_at')
      .eq('event_id', eventId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false }),
  ]);

  // Fetch order_items separately to avoid FK join issues
  const orderIds = (orders || []).map(o => o.id);
  let allItems = [];
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, ticket_name, quantity')
      .in('order_id', orderIds);
    allItems = items || [];
  }

  // Group items by order_id
  const itemsByOrder = {};
  for (const item of allItems) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  // Fetch order_attendees check-in data
  let allOA = [];
  if (orderIds.length > 0) {
    const { data: oa } = await supabase
      .from('order_attendees')
      .select('id, order_id, checked_in_at')
      .in('order_id', orderIds);
    allOA = oa || [];
  }

  const oaByOrder = {};
  for (const row of allOA) {
    if (!oaByOrder[row.order_id]) oaByOrder[row.order_id] = [];
    oaByOrder[row.order_id].push(row);
  }

  const attendees = (orders || []).map(o => {
    const oa = oaByOrder[o.id] || [];
    const checkedRows = oa.filter(a => a.checked_in_at);
    const lastCheckedAt = checkedRows.length > 0
      ? checkedRows.reduce((max, a) => a.checked_in_at > max ? a.checked_in_at : max, '')
      : (oa.length === 0 ? o.checked_in_at : null);
    return {
      order_id:          o.id,
      order_ref:         (o.id || '').slice(0, 8).toUpperCase(),
      customer_name:     o.customer_name,
      customer_email:    o.customer_email,
      marketing_consent: o.marketing_consent || false,
      tickets:           itemsByOrder[o.id] || [],
      total_qty:         (itemsByOrder[o.id] || []).reduce((s, t) => s + (t.quantity || 0), 0),
      checkin_total:     oa.length || (o.checked_in_at ? 1 : 0),
      checkin_count:     checkedRows.length || (o.checked_in_at ? 1 : 0),
      checked_in_at:     lastCheckedAt,
    };
  });

  return Response.json({ event, attendees });
}

export async function PATCH(req, { params }) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  const { id: eventId } = await params;
  const { order_id, undo } = await req.json();
  if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

  const supabase = adminSupabase();

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
