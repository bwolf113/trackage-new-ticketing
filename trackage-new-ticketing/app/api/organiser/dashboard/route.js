/* app/api/organiser/dashboard/route.js
   GET — returns dashboard stats for an organiser.
   Query: organiser_id
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const organiser_id = searchParams.get('organiser_id');
    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

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

    // Fetch completed orders for those events
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total, customer_name, customer_email, created_at, event_id')
      .in('event_id', eventIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    const completedOrders = orders || [];
    const totalRevenue = completedOrders.reduce((s, o) => s + (o.total || 0), 0);

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
