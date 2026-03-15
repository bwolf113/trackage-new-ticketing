/* app/api/organiser/update-order/route.js
   POST { order_id, customer_name, customer_email }
   Auth: Bearer token — verifies the order belongs to the authenticated organiser.
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const { organiser, errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;

    const { order_id, customer_name, customer_email } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });
    const organiser_id = organiser.id;

    const supabase = adminSupabase();

    // Verify the order belongs to an event owned by this organiser
    const { data: order } = await supabase
      .from('orders')
      .select('id, event_id')
      .eq('id', order_id)
      .single();

    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    const { data: event } = order.event_id
      ? await supabase.from('events').select('organiser_id').eq('id', order.event_id).single()
      : { data: null };

    if (!event || event.organiser_id !== organiser_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (customer_name  !== undefined) updates.customer_name  = customer_name;
    if (customer_email !== undefined) updates.customer_email = customer_email;

    const { error } = await supabase.from('orders').update(updates).eq('id', order_id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
