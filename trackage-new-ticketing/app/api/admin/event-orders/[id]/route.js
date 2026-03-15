/* app/api/admin/event-orders/[id]/route.js */
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

  const [{ data: event }, { data: orders }, { data: tickets }] = await Promise.all([
    supabase.from('events')
      .select('id, name, start_time, venue_name, organiser_id')
      .eq('id', eventId).single(),
    supabase.from('orders')
      .select('id, status, total, booking_fee, customer_name, customer_email, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    supabase.from('tickets')
      .select('id, name, price, inventory')
      .eq('event_id', eventId)
      .order('price'),
  ]);

  // Fetch organiser name separately
  let organiser = null;
  const organiserId = event?.organiser_id;
  if (organiserId) {
    const { data: org } = await supabase.from('organisers').select('name').eq('id', organiserId).single();
    organiser = org;
  }

  // Revenue from completed orders
  const completedOrders   = (orders || []).filter(o => o.status === 'completed');
  const completedOrderIds = completedOrders.map(o => o.id);
  const completedIdSet    = new Set(completedOrderIds);

  // Fetch order_items for all completed orders for this event
  const allItems = [];
  if (completedOrderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('ticket_name, quantity, order_id')
      .in('order_id', completedOrderIds);
    for (const item of items || []) {
      if (completedIdSet.has(item.order_id)) allItems.push(item);
    }
  }

  // Sum sold by ticket_name
  const soldByName = {};
  for (const item of allItems) {
    const qty = item.quantity || 0;
    if (item.ticket_name) soldByName[item.ticket_name] = (soldByName[item.ticket_name] || 0) + qty;
  }

  // Build per-ticket-type summary
  const ticketSummary = (tickets || []).map(t => ({
    name:      t.name,
    price:     t.price,
    inventory: t.inventory,
    sold:      soldByName[t.name] ?? 0,
  }));

  const totalRevenue     = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalTicketsSold = allItems.reduce((s, i) => s + (i.quantity || 0), 0);

  return Response.json({
    event: event ? { ...event, organisers: organiser } : null,
    orders: orders || [],
    ticketSummary,
    stats: {
      total_revenue: totalRevenue,
      tickets_sold:  totalTicketsSold,
      order_count:   completedOrders.length,
    },
  });
}
