/* app/api/organiser/crm/preview-email/route.js
   POST — returns rendered HTML for template preview in iframe
   Body: { template, logo_url?, primary_color?, subject, message, cta_text?, cta_url?, footer_text?, event_name? }
   Auth: Bearer token
*/
import { getOrganiserFromRequest } from '../../../../../lib/organiserAuth';
import { renderTemplate } from '../../../../../lib/emailTemplates';
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  const { organiser: authOrganiser, errorResponse } = await getOrganiserFromRequest(req);
  if (errorResponse) return errorResponse;

  const supabase = adminSupabase();
  const { data: organiser } = await supabase
    .from('organisers').select('id, name').eq('id', authOrganiser.id).single();

  const body = await req.json();
  const { template, logo_url, primary_color, subject, message, cta_text, cta_url, footer_text, event_name } = body;

  const html = renderTemplate({
    templateKey: template || 'promotion',
    logoUrl: logo_url,
    primaryColor: primary_color,
    organiserName: organiser?.name || 'Your Organisation',
    subject: subject || 'Preview Subject',
    message: message || 'This is a preview of your email template.',
    ctaText: cta_text,
    ctaUrl: cta_url,
    footerText: footer_text,
    eventName: event_name,
    // No tracking/unsub in preview — use placeholders
    campaignId: null,
    recipientEmail: null,
    organiserId: null,
  });

  return Response.json({ html });
}
