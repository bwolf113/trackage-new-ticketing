/* app/api/organiser/crm/segments/route.js
   GET — recipient counts per email segment for an organiser (auth via Bearer token)
   Excludes unsubscribed emails from all counts.
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isMaltese(phone) {
  if (!phone) return false;
  const p = phone.replace(/[\s\-()]/g, '');
  return p.startsWith('+356') || p.startsWith('00356') || /^[279]\d{7}$/.test(p);
}

export async function GET(req) {
  const { organiser: authOrganiser, errorResponse } = await getOrganiserFromRequest(req);
  if (errorResponse) return errorResponse;
  const organiser_id = authOrganiser.id;

  const supabase = adminSupabase();

  const { data: events } = await supabase
    .from('events').select('id, name').eq('organiser_id', organiser_id)
    .order('start_time', { ascending: false });

  if (!events?.length) {
    return Response.json({ counts: { all: 0, loyal: 0, local: 0, foreign: 0 }, events: [] });
  }

  const eventIds = events.map(e => e.id);

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_email, customer_phone, event_id')
    .in('event_id', eventIds)
    .eq('status', 'completed')
    .eq('marketing_consent', true);

  const allOrders = orders || [];

  // ── Fetch unsubscribed emails for this organiser ───────────────
  const { data: unsubs } = await supabase
    .from('email_unsubscribes')
    .select('email')
    .eq('organiser_id', organiser_id);

  const unsubSet = new Set((unsubs || []).map(u => u.email));

  // all unique emails (minus unsubscribed)
  const allEmails = new Set();
  for (const o of allOrders) {
    if (o.customer_email && !unsubSet.has(o.customer_email)) allEmails.add(o.customer_email);
  }

  // loyal: appeared in more than 3 distinct events
  const emailEvents = {};
  for (const o of allOrders) {
    if (!o.customer_email || unsubSet.has(o.customer_email)) continue;
    if (!emailEvents[o.customer_email]) emailEvents[o.customer_email] = new Set();
    emailEvents[o.customer_email].add(o.event_id);
  }
  const loyalCount = Object.values(emailEvents).filter(s => s.size > 3).length;

  // local / foreign (requires phone number)
  const seenLocal   = new Set();
  const seenForeign = new Set();
  for (const o of allOrders) {
    if (!o.customer_email || unsubSet.has(o.customer_email)) continue;
    if (isMaltese(o.customer_phone) && !seenLocal.has(o.customer_email)) {
      seenLocal.add(o.customer_email);
    } else if (o.customer_phone && !isMaltese(o.customer_phone) && !seenForeign.has(o.customer_email)) {
      seenForeign.add(o.customer_email);
    }
  }

  // per-event unique email counts (minus unsubscribed)
  const eventEmailMap = {};
  for (const o of allOrders) {
    if (!o.customer_email || !o.event_id || unsubSet.has(o.customer_email)) continue;
    if (!eventEmailMap[o.event_id]) eventEmailMap[o.event_id] = new Set();
    eventEmailMap[o.event_id].add(o.customer_email);
  }

  return Response.json({
    counts: {
      all:     allEmails.size,
      loyal:   loyalCount,
      local:   seenLocal.size,
      foreign: seenForeign.size,
    },
    events: events.map(e => ({
      id:    e.id,
      name:  e.name,
      count: eventEmailMap[e.id]?.size || 0,
    })),
  });
}
