/* app/api/admin/reports/route.js
   Admin POST — returns full reports data using service role key (bypasses RLS).
   Body: { start, end, compStart?, compEnd? }
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function fetchKpis(supabase, start, end) {
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, event_id, organiser_id, booking_fee, stripe_fee, created_at')
    .eq('status', 'completed')
    .gte('created_at', start)
    .lte('created_at', end);

  const orderIds = (orders || []).map(o => o.id);
  let ticketCount = 0;
  if (orderIds.length) {
    const { data: items } = await supabase
      .from('order_items').select('quantity').in('order_id', orderIds);
    ticketCount = (items || []).reduce((s, i) => s + (i.quantity || 0), 0);
  }

  const totalRevenue     = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
  const totalBookingFees = (orders || []).reduce((s, o) => s + (o.booking_fee || 0), 0);
  const totalStripeFees  = (orders || []).reduce((s, o) => s + (o.stripe_fee || 0), 0);

  return {
    totalRevenue,
    totalBookingFees,
    totalStripeFees,
    ticketCount,
    orderCount: (orders || []).length,
    orders,
  };
}

export async function POST(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { start, end, compStart, compEnd } = await req.json();
  const supabase = adminSupabase();

  // Primary period KPIs
  const primary = await fetchKpis(supabase, start, end);

  // Organiser ranking
  const byOrg = {};
  (primary.orders || []).forEach(o => {
    if (!o.organiser_id) return;
    if (!byOrg[o.organiser_id]) byOrg[o.organiser_id] = { revenue: 0, orders: 0 };
    byOrg[o.organiser_id].revenue += o.total || 0;
    byOrg[o.organiser_id].orders  += 1;
  });

  const orgIds = Object.keys(byOrg);
  let orgRanking = [];
  if (orgIds.length) {
    const { data: orgs } = await supabase.from('organisers').select('id, name').in('id', orgIds);
    orgRanking = (orgs || []).map(o => ({ ...o, ...byOrg[o.id] })).sort((a, b) => b.revenue - a.revenue);
  }

  // Event performance
  const { data: events } = await supabase
    .from('events')
    .select('id, name, start_time, end_time, status')
    .order('start_time', { ascending: false })
    .limit(20);

  // Build event performance from orders (event_id lives on orders, not order_items)
  const evtMap = {};
  for (const o of primary.orders || []) {
    if (!o.event_id) continue;
    if (!evtMap[o.event_id]) evtMap[o.event_id] = { revenue: 0, tickets: 0 };
    evtMap[o.event_id].revenue += o.total || 0;
  }
  // Count tickets per event from order_items
  const orderIds = (primary.orders || []).map(o => o.id);
  if (orderIds.length) {
    // Build order→event lookup
    const orderEventMap = {};
    (primary.orders || []).forEach(o => { if (o.event_id) orderEventMap[o.id] = o.event_id; });

    const { data: evtItems } = await supabase
      .from('order_items')
      .select('order_id, quantity')
      .in('order_id', orderIds);
    (evtItems || []).forEach(i => {
      const eventId = orderEventMap[i.order_id];
      if (!eventId) return;
      if (!evtMap[eventId]) evtMap[eventId] = { revenue: 0, tickets: 0 };
      evtMap[eventId].tickets += i.quantity || 0;
    });
  }
  let eventPerf = (events || []).map(e => ({ ...e, ...(evtMap[e.id] || { revenue: 0, tickets: 0 }) }))
    .sort((a, b) => b.revenue - a.revenue);

  // Comparison period (optional)
  let prevKpis = null;
  if (compStart && compEnd) {
    const prev = await fetchKpis(supabase, compStart, compEnd);
    prevKpis = {
      totalRevenue: prev.totalRevenue,
      totalBookingFees: prev.totalBookingFees,
      totalStripeFees: prev.totalStripeFees,
      ticketCount: prev.ticketCount,
      orderCount: prev.orderCount,
    };
  }

  return Response.json({
    kpis: {
      totalRevenue: primary.totalRevenue,
      totalBookingFees: primary.totalBookingFees,
      totalStripeFees: primary.totalStripeFees,
      ticketCount: primary.ticketCount,
      orderCount: primary.orderCount,
    },
    orgRanking,
    eventPerf,
    prevKpis,
  });
}
