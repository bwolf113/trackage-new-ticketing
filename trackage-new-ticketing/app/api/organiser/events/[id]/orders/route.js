/* app/api/organiser/events/[id]/orders/route.js
   GET — orders for an event (query: organiser_id)
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

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, booking_fee, customer_name, customer_email, customer_phone, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  // Fetch tickets for summary
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, name, price, inventory, status')
    .eq('event_id', eventId)
    .order('price');

  // Ticket sales summary from completed orders
  const completedOrders   = (orders || []).filter(o => o.status === 'completed');
  const completedOrderIds = completedOrders.map(o => o.id);

  let ticketSummary = (tickets || []).map(t => ({ ...t, sold: 0 }));
  let totalRevenue = 0;
  let totalTicketsSold = 0;

  if (completedOrderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('ticket_name, quantity')
      .in('order_id', completedOrderIds);

    const soldByName = {};
    for (const item of items || []) {
      if (item.ticket_name) soldByName[item.ticket_name] = (soldByName[item.ticket_name] || 0) + (item.quantity || 0);
      totalTicketsSold += item.quantity || 0;
    }
    ticketSummary = (tickets || []).map(t => ({
      ...t,
      sold: soldByName[t.name] ?? 0,
    }));
    totalRevenue = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
  }

  const compOrders = completedOrders.filter(o => !o.total || o.total === 0);
  let compTicketsCount = 0;
  if (compOrders.length > 0) {
    const { data: compItems } = await supabase
      .from('order_items')
      .select('quantity')
      .in('order_id', compOrders.map(o => o.id));
    compTicketsCount = (compItems || []).reduce((s, i) => s + (i.quantity || 0), 0);
  }

  return Response.json({
    event,
    orders: orders || [],
    ticketSummary,
    stats: {
      total_revenue:      totalRevenue,
      tickets_sold:       totalTicketsSold,
      order_count:        completedOrders.length,
      comp_tickets_count: compTicketsCount,
    },
  });
}
