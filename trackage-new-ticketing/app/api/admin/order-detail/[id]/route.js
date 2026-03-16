/* app/api/admin/order-detail/[id]/route.js
   Fetches full order data using service role key (bypasses RLS).
   Uses separate queries instead of nested joins to avoid FK-relationship issues.
*/
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
  const { id } = await params;
  const supabase = adminSupabase();

  // 1. Fetch the order itself
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, status, total, booking_fee, discount, coupon_code,
      customer_name, customer_email, customer_phone,
      stripe_payment_intent, stripe_session_id,
      admin_note, public_note, qr_token,
      created_at, updated_at, event_id, organiser_id
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
    return Response.json({ error: error?.message || 'Not found' }, { status: 404 });
  }

  // 2. Fetch order_items and event
  const [{ data: orderItems }, { data: event }] = await Promise.all([
    supabase.from('order_items').select('id, ticket_name, quantity, unit_price').eq('order_id', id),
    order.event_id
      ? supabase.from('events').select('id, name, start_time, venue_name, organiser_id').eq('id', order.event_id).single()
      : Promise.resolve({ data: null }),
  ]);

  // 3. Fetch organiser via order.organiser_id OR event.organiser_id (checkout doesn't save organiser_id on order)
  const organiserId = order.organiser_id || event?.organiser_id;
  const { data: organiser } = organiserId
    ? await supabase.from('organisers').select('id, name').eq('id', organiserId).single()
    : { data: null };

  return Response.json({
    order: {
      ...order,
      order_items: orderItems || [],
      events: event || null,
      organisers: organiser || null,
    },
  });
}
