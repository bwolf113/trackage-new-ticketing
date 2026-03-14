/* app/api/admin/update-order/route.js
   POST { order_id, customer_name, customer_email }
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const ALLOWED_STATUSES = ['completed', 'pending_payment', 'cancelled', 'refunded', 'failed'];

export async function POST(req) {
  try {
    const { order_id, customer_name, customer_email, status } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

    const updates = { updated_at: new Date().toISOString() };
    if (customer_name  !== undefined) updates.customer_name  = customer_name;
    if (customer_email !== undefined) updates.customer_email = customer_email;
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
    }

    const supabase = adminSupabase();
    const { error } = await supabase.from('orders').update(updates).eq('id', order_id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
