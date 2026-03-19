/* app/api/organiser/crm/reports/route.js
   GET — CRM global reports for an organiser (auth via Bearer token)
   Query: from (YYYY-MM-DD), to (YYYY-MM-DD)
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req) {
  const { organiser: authOrganiser, errorResponse } = await getOrganiserFromRequest(req);
  if (errorResponse) return errorResponse;
  const organiser_id = authOrganiser.id;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  const supabase = adminSupabase();

  const { data: events } = await supabase
    .from('events').select('id, name').eq('organiser_id', organiser_id);

  if (!events?.length) {
    return Response.json({ summary: { total_revenue: 0, total_tickets: 0, total_orders: 0 }, daily_sales: [], by_event: [] });
  }

  const eventIds = events.map(e => e.id);

  let q = supabase
    .from('orders')
    .select('id, total, booking_fee, stripe_fee, created_at, event_id')
    .in('event_id', eventIds)
    .eq('status', 'completed')
    .order('created_at', { ascending: true });

  if (from) q = q.gte('created_at', from);
  if (to)   q = q.lte('created_at', to + 'T23:59:59');

  const { data: orders } = await q;
  const paidOrders = (orders || []).filter(o => (o.total || 0) > 0);

  const orderIds = paidOrders.map(o => o.id);
  let allItems = [];
  if (orderIds.length) {
    const { data: items } = await supabase
      .from('order_items').select('order_id, quantity').in('order_id', orderIds);
    allItems = items || [];
  }

  const totalGross       = paidOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalBookingFees = paidOrders.reduce((s, o) => s + (o.booking_fee || 0), 0);
  const totalStripeFees  = paidOrders.reduce((s, o) => s + (o.stripe_fee || 0), 0);
  const totalTicketRevenue = totalGross - totalBookingFees; // face value only
  const totalPayout      = totalTicketRevenue - totalStripeFees;
  const totalTickets     = allItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalOrders      = paidOrders.length;

  // Daily map
  const dailyMap     = {};
  const orderDateMap = {};
  for (const o of paidOrders) {
    const date = o.created_at?.slice(0, 10);
    if (!date) continue;
    orderDateMap[o.id] = date;
    if (!dailyMap[date]) dailyMap[date] = { revenue: 0, tickets: 0 };
    dailyMap[date].revenue += (o.total || 0) - (o.booking_fee || 0);
  }
  for (const item of allItems) {
    const date = orderDateMap[item.order_id];
    if (date) dailyMap[date].tickets = (dailyMap[date].tickets || 0) + (item.quantity || 0);
  }
  const daily_sales = Object.keys(dailyMap).sort().map(date => ({
    date,
    revenue: parseFloat(dailyMap[date].revenue.toFixed(2)),
    tickets: dailyMap[date].tickets,
  }));

  // Per-event breakdown
  const orderEventMap = {};
  const eventRevMap   = {};
  const eventOrdMap   = {};
  const eventTixMap   = {};
  for (const o of paidOrders) {
    orderEventMap[o.id]    = o.event_id;
    eventRevMap[o.event_id] = (eventRevMap[o.event_id] || 0) + ((o.total || 0) - (o.booking_fee || 0));
    eventOrdMap[o.event_id] = (eventOrdMap[o.event_id] || 0) + 1;
  }
  for (const item of allItems) {
    const eid = orderEventMap[item.order_id];
    if (eid) eventTixMap[eid] = (eventTixMap[eid] || 0) + (item.quantity || 0);
  }
  const by_event = events
    .map(e => ({
      event_id:   e.id,
      event_name: e.name,
      revenue:    parseFloat((eventRevMap[e.id] || 0).toFixed(2)),
      tickets:    eventTixMap[e.id] || 0,
      orders:     eventOrdMap[e.id] || 0,
    }))
    .filter(e => e.orders > 0)
    .sort((a, b) => b.revenue - a.revenue);

  return Response.json({
    summary: { total_revenue: totalTicketRevenue, total_stripe_fees: totalStripeFees, total_payout: totalPayout, total_tickets: totalTickets, total_orders: totalOrders },
    daily_sales,
    by_event,
  });
}
