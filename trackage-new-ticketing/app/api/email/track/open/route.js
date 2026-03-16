/* app/api/email/track/open/route.js
   Public GET — returns 1x1 transparent pixel and logs an 'opened' event.
   Query: ?cid=<campaign_id>&e=<email>
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('cid');
  const email      = searchParams.get('e');

  if (campaignId && email) {
    try {
      const supabase = adminSupabase();

      // Only log one open per email per campaign
      const { data: existing } = await supabase
        .from('email_events')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('email', email)
        .eq('event_type', 'opened')
        .limit(1);

      if (!existing?.length) {
        await supabase.from('email_events').insert({
          campaign_id: campaignId,
          email,
          event_type: 'opened',
        });

        // Increment campaign counter
        const { data: camp } = await supabase
          .from('email_campaigns')
          .select('opened_count')
          .eq('id', campaignId)
          .single();

        if (camp) {
          await supabase
            .from('email_campaigns')
            .update({ opened_count: (camp.opened_count || 0) + 1 })
            .eq('id', campaignId);
        }
      }
    } catch (err) {
      console.error('Open tracking error:', err.message);
    }
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
