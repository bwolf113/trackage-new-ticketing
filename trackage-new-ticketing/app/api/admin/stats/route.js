/* app/api/admin/stats/route.js
   Admin GET — returns dashboard stats using service role key (bypasses RLS).
   Query: ?filter=this_month|last_month|custom&start=ISO&end=ISO
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { start, end };
}

export async function GET(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const filter      = searchParams.get('filter') || 'this_month';
  const customStart = searchParams.get('start');
  const customEnd   = searchParams.get('end');

  const now = new Date();
  let start, end;

  if (filter === 'this_month') {
    ({ start, end } = getMonthRange(now));
  } else if (filter === 'last_month') {
    ({ start, end } = getMonthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  } else {
    start = customStart || getMonthRange(now).start;
    end   = customEnd   || getMonthRange(now).end;
  }

  const supabase = adminSupabase();

  // Fetch orders with their event's organiser_id via join
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, stripe_fee, event_id, created_at, events(organiser_id)')
    .eq('status', 'completed')
    .gte('created_at', start)
    .lte('created_at', end);

  const orderIds = (orders || []).map(o => o.id);
  let ticketCount = 0;
  if (orderIds.length) {
    const { data: items } = await supabase
      .from('order_items')
      .select('quantity')
      .in('order_id', orderIds);
    ticketCount = (items || []).reduce((s, i) => s + (i.quantity || 0), 0);
  }

  const totalRevenue = (orders || []).reduce((s, o) => s + (o.total || 0), 0);

  // Group by organiser via events join
  const byOrg = {};
  (orders || []).forEach(o => {
    const orgId = o.events?.organiser_id;
    if (!orgId) return;
    if (!byOrg[orgId]) byOrg[orgId] = { revenue: 0, orders: 0 };
    byOrg[orgId].revenue += o.total || 0;
    byOrg[orgId].orders  += 1;
  });

  const orgIds = Object.keys(byOrg);
  let leaderboard = [];
  if (orgIds.length) {
    const { data: orgs } = await supabase
      .from('organisers')
      .select('id, name')
      .in('id', orgIds);
    leaderboard = (orgs || []).map(o => ({ ...o, ...byOrg[o.id] }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  const { count: activeOrgCount } = await supabase
    .from('organisers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  return Response.json({
    totalRevenue,
    totalTickets: ticketCount,
    totalStripeFees: (orders || []).reduce((s, o) => s + (o.stripe_fee || 0), 0),
    orderCount: (orders || []).length,
    activeOrgCount: activeOrgCount || 0,
    leaderboard,
  });
}
