/* app/api/organiser/dashboard/route.js
   GET — returns dashboard stats for an organiser.
   Auth: Bearer token
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  try {
    const { organiser, errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;
    const organiser_id = organiser.id;

    const supabase = adminSupabase();

    // Fetch all events for this organiser
    const { data: events } = await supabase
      .from('events')
      .select('id, name, start_time, venue_name, status')
      .eq('organiser_id', organiser_id)
      .order('start_time', { ascending: false });

    const eventIds = (events || []).map(e => e.id);

    if (eventIds.length === 0) {
      return Response.json({
        stats: { total_events: 0, total_revenue: 0, tickets_sold: 0, completed_orders: 0 },
        upcoming_events: [],
        recent_orders: [],
      });
    }

    // Date filter
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    // Fetch completed orders for those events
    let orderQuery = supabase
      .from('orders')
      .select('id, status, total, booking_fee, stripe_fee, customer_name, customer_email, created_at, event_id')
      .in('event_id', eventIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (from) orderQuery = orderQuery.gte('created_at', from);
    if (to)   orderQuery = orderQuery.lte('created_at', to + 'T23:59:59');

    const { data: orders } = await orderQuery;

    const completedOrders = orders || [];
    const totalGross       = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalBookingFees = completedOrders.reduce((s, o) => s + (o.booking_fee || 0), 0);
    const totalStripeFees  = completedOrders.reduce((s, o) => s + (o.stripe_fee || 0), 0);
    const totalRevenue     = totalGross - totalBookingFees;
    const totalPayout      = totalRevenue - totalStripeFees;

    // Count tickets sold from order_items
    let ticketsSold = 0;
    if (completedOrders.length > 0) {
      const orderIds = completedOrders.map(o => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity')
        .in('order_id', orderIds);
      ticketsSold = (items || []).reduce((s, i) => s + (i.quantity || 0), 0);
    }

    // Upcoming events (future start_time, published)
    const now = new Date().toISOString();
    const upcoming = (events || [])
      .filter(e => e.start_time > now && e.status === 'published')
      .slice(0, 5);

    // Recent 10 orders
    const recentOrders = completedOrders.slice(0, 10).map(o => ({
      ...o,
      event_name: (events || []).find(e => e.id === o.event_id)?.name || '',
    }));

    return Response.json({
      stats: {
        total_events:     eventIds.length,
        total_revenue:    totalRevenue,
        total_stripe_fees: totalStripeFees,
        total_payout:     totalPayout,
        tickets_sold:     ticketsSold,
        completed_orders: completedOrders.length,
      },
      upcoming_events: upcoming,
      recent_orders:   recentOrders,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
