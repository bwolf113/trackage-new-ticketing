/* app/api/scan/[token]/route.js
   Mobile app scan endpoint.

   GET  /api/scan/{token}  → look up ticket status (does NOT check it in)
   POST /api/scan/{token}  → check the ticket in (marks checked_in_at)
                             Requires Authorization: Bearer <supabase_access_token>

   Response shape (both methods):
   {
     valid: true | false,
     status: "ok" | "already_used" | "not_found" | "cancelled",
     checked_in_at: ISO string | null,
     order: { ref, customer_name, event_name, tickets: [...] } | null
   }
*/

import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function lookupOrder(token) {
  const supabase = supabaseAdmin();

  // Support both qr_token (UUID) and order id (fallback)
  let { data: order, error } = await supabase
    .from('orders')
    .select('id, qr_token, status, checked_in_at, customer_name, customer_email, total, event_id, order_items(ticket_name, quantity, unit_price)')
    .eq('qr_token', token)
    .single();

  // Fallback: try matching by order id directly
  if (error || !order) {
    ({ data: order, error } = await supabase
      .from('orders')
      .select('id, qr_token, status, checked_in_at, customer_name, customer_email, total, event_id, order_items(ticket_name, quantity, unit_price)')
      .eq('id', token)
      .single());
  }

  if (error || !order) return null;

  // Fetch event name
  let eventName = null;
  if (order.event_id) {
    const { data: ev } = await supabase
      .from('events')
      .select('name')
      .eq('id', order.event_id)
      .single();
    eventName = ev?.name || null;
  }

  return { order, eventName };
}

function buildResponse(order, eventName) {
  const orderRef = (order.id || '').slice(0, 8).toUpperCase();

  if (order.status === 'cancelled' || order.status === 'failed') {
    return {
      valid: false,
      status: 'cancelled',
      checked_in_at: null,
      order: {
        ref: orderRef,
        customer_name: order.customer_name,
        event_name: eventName,
        tickets: order.order_items || [],
      },
    };
  }

  if (order.checked_in_at) {
    return {
      valid: false,
      status: 'already_used',
      checked_in_at: order.checked_in_at,
      order: {
        ref: orderRef,
        customer_name: order.customer_name,
        event_name: eventName,
        tickets: order.order_items || [],
      },
    };
  }

  return {
    valid: true,
    status: 'ok',
    checked_in_at: null,
    order: {
      ref: orderRef,
      customer_name: order.customer_name,
      event_name: eventName,
      tickets: order.order_items || [],
    },
  };
}

// GET — check ticket status without checking in (no auth required)
export async function GET(req, { params }) {
  const { token } = await params;
  const result = await lookupOrder(token);

  if (!result) {
    return Response.json({ valid: false, status: 'not_found', checked_in_at: null, order: null }, { status: 404 });
  }

  return Response.json(buildResponse(result.order, result.eventName));
}

// POST — check the ticket in (requires organiser auth)
export async function POST(req, { params }) {
  const { token } = await params;

  // Verify organiser auth via Bearer token
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();

  if (!accessToken) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Look up the organiser record for this user
  const { data: organiser } = await supabase
    .from('organisers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!organiser) {
    return Response.json({ error: 'Organiser not found' }, { status: 403 });
  }

  const result = await lookupOrder(token);

  if (!result) {
    return Response.json({ valid: false, status: 'not_found', checked_in_at: null, order: null }, { status: 404 });
  }

  const { order, eventName } = result;

  // Verify the organiser owns the event this ticket belongs to
  if (order.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select('organiser_id')
      .eq('id', order.event_id)
      .single();

    if (!event || event.organiser_id !== organiser.id) {
      return Response.json({ error: 'Forbidden: this ticket does not belong to your event' }, { status: 403 });
    }
  }

  // Already checked in — return the existing state without modifying
  if (order.checked_in_at) {
    return Response.json(buildResponse(order, eventName), { status: 409 });
  }

  // Cancelled / failed orders cannot be checked in
  if (order.status === 'cancelled' || order.status === 'failed') {
    return Response.json(buildResponse(order, eventName), { status: 403 });
  }

  // Mark as checked in
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('orders')
    .update({ checked_in_at: now })
    .eq('id', order.id);

  if (error) {
    return Response.json({ valid: false, status: 'error', error: error.message }, { status: 500 });
  }

  order.checked_in_at = now;
  return Response.json({ ...buildResponse(order, eventName), checked_in_at: now });
}
