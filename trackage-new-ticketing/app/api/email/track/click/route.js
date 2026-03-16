/* app/api/email/track/click/route.js
   Public GET — logs a 'clicked' event then 302-redirects to the destination URL.
   Query: ?cid=<campaign_id>&e=<email>&url=<destination>
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('cid');
  const email      = searchParams.get('e');
  const url        = searchParams.get('url');

  if (!url) {
    return new Response('Missing destination URL', { status: 400 });
  }

  if (campaignId && email) {
    try {
      const supabase = adminSupabase();

      // Check if this is the first click for this email in this campaign
      const { data: existing } = await supabase
        .from('email_events')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('email', email)
        .eq('event_type', 'clicked')
        .limit(1);

      const isFirstClick = !existing?.length;

      // Log every click (not deduplicated — useful for engagement analysis)
      await supabase.from('email_events').insert({
        campaign_id: campaignId,
        email,
        event_type: 'clicked',
        metadata: { url },
      });

      // Only increment campaign counter on first click per email
      if (isFirstClick) {
        const { data: camp } = await supabase
          .from('email_campaigns')
          .select('clicked_count, opened_count')
          .eq('id', campaignId)
          .single();

        if (camp) {
          await supabase
            .from('email_campaigns')
            .update({ clicked_count: (camp.clicked_count || 0) + 1 })
            .eq('id', campaignId);
        }

        // Backfill open: if someone clicked, they definitely opened the email
        const { data: existingOpen } = await supabase
          .from('email_events')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('email', email)
          .eq('event_type', 'opened')
          .limit(1);

        if (!existingOpen?.length) {
          await supabase.from('email_events').insert({
            campaign_id: campaignId,
            email,
            event_type: 'opened',
          });
          if (camp) {
            await supabase
              .from('email_campaigns')
              .update({ opened_count: (camp.opened_count || 0) + 1 })
              .eq('id', campaignId);
          }
        }
      }
    } catch (err) {
      console.error('Click tracking error:', err.message);
    }
  }

  return Response.redirect(url, 302);
}
