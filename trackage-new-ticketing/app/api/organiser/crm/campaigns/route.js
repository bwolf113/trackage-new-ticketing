/* app/api/organiser/crm/campaigns/route.js
   GET — returns campaign history with tracking stats for an organiser
   Auth: Bearer token
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req) {
  const { organiser: authOrganiser, errorResponse } = await getOrganiserFromRequest(req);
  if (errorResponse) return errorResponse;

  const supabase = adminSupabase();

  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('id, template, segment, event_id, subject, sent_count, failed_count, opened_count, clicked_count, converted_count, created_at')
    .eq('organiser_id', authOrganiser.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Enrich with event names
  const eventIds = [...new Set((campaigns || []).filter(c => c.event_id).map(c => c.event_id))];
  let eventMap = {};
  if (eventIds.length) {
    const { data: events } = await supabase
      .from('events').select('id, name').in('id', eventIds);
    eventMap = Object.fromEntries((events || []).map(e => [e.id, e.name]));
  }

  const enriched = (campaigns || []).map(c => ({
    ...c,
    event_name: c.event_id ? eventMap[c.event_id] || null : null,
    open_rate:  c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0,
    click_rate: c.sent_count > 0 ? Math.round((c.clicked_count / c.sent_count) * 100) : 0,
    conv_rate:  c.sent_count > 0 ? Math.round((c.converted_count / c.sent_count) * 1000) / 10 : 0,
  }));

  return Response.json({ campaigns: enriched });
}
