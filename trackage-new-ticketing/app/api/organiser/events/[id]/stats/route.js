/* app/api/organiser/events/[id]/stats/route.js
   GET — event sales stats (query: organiser_id)
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

  // Fetch ticket types
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, name, price, inventory, sold')
    .eq('event_id', eventId);

  const ticketTypes = tickets || [];
  // Fetch all completed orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, created_at')
    .eq('event_id', eventId)
    .eq('status', 'completed')
    .order('created_at', { ascending: true });

  const allOrders = orders || [];
  const paidOrders = allOrders.filter(o => (o.total || 0) > 0);
  const compOrders = allOrders.filter(o => (o.total || 0) === 0);

  const allOrderIds = allOrders.map(o => o.id);
  const paidOrderIdSet = new Set(paidOrders.map(o => o.id));
  const compOrderIdSet = new Set(compOrders.map(o => o.id));

  // Fetch all order items
  let orderItems = [];
  if (allOrderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, ticket_name, quantity, unit_price')
      .in('order_id', allOrderIds);
    orderItems = items || [];
  }

  const paidItems = orderItems.filter(i => paidOrderIdSet.has(i.order_id));
  const compItems = orderItems.filter(i => compOrderIdSet.has(i.order_id));

  const totalTicketsSold  = paidItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalCompTickets  = compItems.reduce((s, i) => s + (i.quantity || 0), 0);

  // Build date-indexed maps
  const orderDateMap = {};
  for (const o of allOrders) {
    orderDateMap[o.id] = o.created_at ? o.created_at.slice(0, 10) : null;
  }

  // Daily global (paid tickets + revenue)
  const dailyMap = {};
  for (const item of paidItems) {
    const date = orderDateMap[item.order_id];
    if (!date) continue;
    if (!dailyMap[date]) dailyMap[date] = { tickets: 0, revenue: 0 };
    dailyMap[date].tickets += item.quantity || 0;
  }
  for (const order of paidOrders) {
    const date = order.created_at ? order.created_at.slice(0, 10) : null;
    if (!date) continue;
    if (!dailyMap[date]) dailyMap[date] = { tickets: 0, revenue: 0 };
    dailyMap[date].revenue += order.total || 0;
  }

  const sortedDates = Object.keys(dailyMap).sort();
  const dailySales = sortedDates.map(date => ({
    date,
    tickets: dailyMap[date].tickets,
    revenue:  parseFloat(dailyMap[date].revenue.toFixed(2)),
  }));

  // Daily by ticket type (paid orders)
  const typeByDay = {};
  const allTypeNames = [...new Set(
    paidItems.map(i => i.ticket_name || 'Unknown')
  )];

  for (const item of paidItems) {
    const date = orderDateMap[item.order_id];
    if (!date) continue;
    const name = item.ticket_name || 'Unknown';
    if (!typeByDay[date]) typeByDay[date] = {};
    typeByDay[date][name] = (typeByDay[date][name] || 0) + (item.quantity || 0);
  }

  const dailyByType = sortedDates.map(date => {
    const entry = { date };
    for (const name of allTypeNames) {
      entry[name] = typeByDay[date]?.[name] || 0;
    }
    return entry;
  });

  return Response.json({
    event,
    summary: {
      total_tickets_sold: totalTicketsSold,
      total_comp_tickets: totalCompTickets,
      total_ticket_types: ticketTypes.length,
    },
    daily_sales:      dailySales,
    daily_by_type:    dailyByType,
    ticket_type_names: allTypeNames,
  });
}
