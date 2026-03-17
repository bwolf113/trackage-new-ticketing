/* app/api/admin/orders/route.js
   GET — list orders with pagination, filtering, search (service-role, bypasses RLS)
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  try {
    const supabase = adminSupabase();
    const url = new URL(req.url);

    const tab       = url.searchParams.get('tab') || 'all';
    const search    = url.searchParams.get('search') || '';
    const eventId   = url.searchParams.get('event_id') || 'all';
    const page      = parseInt(url.searchParams.get('page') || '1');
    const pageSize  = parseInt(url.searchParams.get('page_size') || '25');

    // ── Counts per status ───────────────────────────────────────────
    const statuses = ['completed', 'pending_payment', 'cancelled', 'refunded', 'failed'];
    const countResults = await Promise.all(
      statuses.map(s =>
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', s)
      )
    );
    const counts = { all: 0 };
    statuses.forEach((s, i) => {
      counts[s] = countResults[i].count || 0;
      counts.all += counts[s];
    });

    // ── Orders query ────────────────────────────────────────────────
    let q = supabase
      .from('orders')
      .select(`
        id, status, total, customer_name, customer_email, customer_phone,
        created_at, event_id, booking_fee, discount, coupon_code,
        stripe_session_id,
        events ( name ),
        order_items ( id, quantity, unit_price, ticket_name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (tab !== 'all') q = q.eq('status', tab);
    if (eventId !== 'all') q = q.eq('event_id', eventId);
    if (search) {
      q = q.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data: orders, count: total, error } = await q;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // ── Events list for filter dropdown ──────────────────────────────
    const { data: events } = await supabase.from('events').select('id, name').order('name');

    return Response.json({ orders: orders || [], total: total || 0, counts, events: events || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
