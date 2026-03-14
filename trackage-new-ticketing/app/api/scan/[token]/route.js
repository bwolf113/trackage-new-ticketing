/* app/api/scan/[token]/route.js
   Mobile app scan endpoint.

   GET  /api/scan/{token}  → look up ticket status (does NOT check it in)
   POST /api/scan/{token}  → check the ticket in (marks checked_in_at)
                             Requires Authorization: Bearer <supabase_access_token>

   Lookup priority:
     1. order_attendees.qr_token  (individual ticket — one per physical ticket)
     2. orders.qr_token           (legacy: pre-attendees orders)
     3. orders.id                 (fallback for very old QR codes)

   Response shape (both methods):
   {
     valid: true | false,
     status: "ok" | "already_used" | "not_found" | "cancelled",
     checked_in_at: ISO string | null,
     attendee: { ticket_name, ticket_number, total_tickets } | null,
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

// Returns { attendee, order, eventName } or { order, eventName } for legacy tokens
async function lookupToken(token) {
  const supabase = supabaseAdmin();

  // 1. Try order_attendees.qr_token first
  const { data: attendee } = await supabase
    .from('order_attendees')
    .select('id, order_id, ticket_name, qr_token, checked_in_at')
    .eq('qr_token', token)
    .maybeSingle();

  if (attendee) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, customer_name, customer_email, total, event_id, order_items(ticket_name, quantity, unit_price)')
      .eq('id', attendee.order_id)
      .single();
    if (!order) return null;

    // Count total attendees for this order for display (ticket X of N)
    const { count } = await supabase
      .from('order_attendees')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', attendee.order_id);

    const { data: allAttendees } = await supabase
      .from('order_attendees')
      .select('id')
      .eq('order_id', attendee.order_id)
      .order('created_at', { ascending: true });

    const ticketNumber = (allAttendees || []).findIndex(a => a.id === attendee.id) + 1;

    let eventName = null;
    if (order.event_id) {
      const { data: ev } = await supabase.from('events').select('name').eq('id', order.event_id).single();
      eventName = ev?.name || null;
    }

    return { attendee, attendeeNumber: ticketNumber, totalAttendees: count || 1, order, eventName };
  }

  // 2. Legacy: try orders.qr_token
  let { data: order, error } = await supabase
    .from('orders')
    .select('id, qr_token, status, checked_in_at, customer_name, customer_email, total, event_id, order_items(ticket_name, quantity, unit_price)')
    .eq('qr_token', token)
    .single();

  // 3. Fallback: match by order id
  if (error || !order) {
    ({ data: order, error } = await supabase
      .from('orders')
      .select('id, qr_token, status, checked_in_at, customer_name, customer_email, total, event_id, order_items(ticket_name, quantity, unit_price)')
      .eq('id', token)
      .single());
  }

  if (error || !order) return null;

  let eventName = null;
  if (order.event_id) {
    const { data: ev } = await supabase.from('events').select('name').eq('id', order.event_id).single();
    eventName = ev?.name || null;
  }

  return { attendee: null, order, eventName };
}

function buildResponse({ attendee, attendeeNumber, totalAttendees, order, eventName }) {
  const orderRef   = (order.id || '').slice(0, 8).toUpperCase();
  const checkedAt  = attendee ? attendee.checked_in_at : order.checked_in_at;
  const isCancelled = order.status === 'cancelled' || order.status === 'failed';

  const attendeeInfo = attendee
    ? { ticket_name: attendee.ticket_name, ticket_number: attendeeNumber, total_tickets: totalAttendees }
    : null;

  const orderInfo = {
    ref:           orderRef,
    customer_name: order.customer_name,
    event_name:    eventName,
    tickets:       order.order_items || [],
  };

  if (isCancelled) return { valid: false, status: 'cancelled',    checked_in_at: null,     attendee: attendeeInfo, order: orderInfo };
  if (checkedAt)   return { valid: false, status: 'already_used', checked_in_at: checkedAt, attendee: attendeeInfo, order: orderInfo };
  return               { valid: true,  status: 'ok',           checked_in_at: null,     attendee: attendeeInfo, order: orderInfo };
}

// GET — check ticket status without checking in (no auth required)
export async function GET(req, { params }) {
  const { token } = await params;
  const result = await lookupToken(token);
  if (!result) return Response.json({ valid: false, status: 'not_found', checked_in_at: null, attendee: null, order: null }, { status: 404 });
  return Response.json(buildResponse(result));
}

// POST — check the ticket in (requires organiser auth)
export async function POST(req, { params }) {
  const { token } = await params;

  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();
  if (!accessToken) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) return Response.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: organiser } = await supabase
    .from('organisers').select('id').eq('user_id', user.id).single();
  if (!organiser) return Response.json({ error: 'Organiser not found' }, { status: 403 });

  const result = await lookupToken(token);
  if (!result) return Response.json({ valid: false, status: 'not_found', checked_in_at: null, attendee: null, order: null }, { status: 404 });

  const { attendee, order, eventName } = result;

  // Verify organiser owns this event
  if (order.event_id) {
    const { data: event } = await supabase
      .from('events').select('organiser_id').eq('id', order.event_id).single();
    if (!event || event.organiser_id !== organiser.id) {
      return Response.json({ error: 'Forbidden: this ticket does not belong to your event' }, { status: 403 });
    }
  }

  const isCancelled = order.status === 'cancelled' || order.status === 'failed';
  if (isCancelled) return Response.json(buildResponse(result), { status: 403 });

  const checkedAt = attendee ? attendee.checked_in_at : order.checked_in_at;
  if (checkedAt)  return Response.json(buildResponse(result), { status: 409 });

  // Mark the individual attendee (or legacy order) as checked in
  const now = new Date().toISOString();
  if (attendee) {
    const { error } = await supabase
      .from('order_attendees').update({ checked_in_at: now }).eq('id', attendee.id);
    if (error) return Response.json({ valid: false, status: 'error', error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('orders').update({ checked_in_at: now }).eq('id', order.id);
    if (error) return Response.json({ valid: false, status: 'error', error: error.message }, { status: 500 });
  }

  // Build response using original result (checked_in_at still null) so status is 'ok',
  // then override checked_in_at with the timestamp we just wrote.
  return Response.json({ ...buildResponse(result), checked_in_at: now });
}
