/* app/api/admin/event-attendees/[id]/route.js */
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req, { params }) {
  const { id: eventId } = await params;
  const supabase = adminSupabase();

  const [{ data: event }, { data: orders }] = await Promise.all([
    supabase.from('events').select('id, name, start_time, venue_name').eq('id', eventId).single(),
    supabase.from('orders')
      .select('id, customer_name, customer_email, marketing_consent')
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

  const attendees = (orders || []).map(o => ({
    order_ref:         (o.id || '').slice(0, 8).toUpperCase(),
    customer_name:     o.customer_name,
    customer_email:    o.customer_email,
    marketing_consent: o.marketing_consent || false,
    tickets:           itemsByOrder[o.id] || [],
    total_qty:         (itemsByOrder[o.id] || []).reduce((s, t) => s + (t.quantity || 0), 0),
  }));

  return Response.json({ event, attendees });
}
