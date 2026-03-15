/* app/api/unsubscribe/route.js
   Public GET — handles unsubscribe link clicks from CRM emails.
   Validates HMAC token, inserts into email_unsubscribes, returns confirmation page.
*/
import { createClient } from '@supabase/supabase-js';
import { verifyUnsubToken } from '../../../lib/emailTemplates';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email       = searchParams.get('email');
  const organiserId = searchParams.get('org');
  const token       = searchParams.get('token');

  if (!email || !organiserId || !token) {
    return new Response(errorPage('Invalid unsubscribe link.'), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  if (!verifyUnsubToken(email, organiserId, token)) {
    return new Response(errorPage('This unsubscribe link is invalid or has been tampered with.'), { status: 403, headers: { 'Content-Type': 'text/html' } });
  }

  const supabase = adminSupabase();

  // Look up organiser name for the confirmation message
  const { data: organiser } = await supabase
    .from('organisers').select('name').eq('id', organiserId).single();

  // Upsert unsubscribe record
  await supabase
    .from('email_unsubscribes')
    .upsert({ email, organiser_id: organiserId, unsubscribed_at: new Date().toISOString() }, { onConflict: 'email,organiser_id' });

  const orgName = organiser?.name || 'this organiser';

  return new Response(successPage(orgName), { status: 200, headers: { 'Content-Type': 'text/html' } });
}

function successPage(orgName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh">
<div style="max-width:480px;width:100%;margin:24px;background:#fff;border-radius:12px;padding:40px 32px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  <div style="width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:28px">&#10003;</div>
  <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1a1a">Unsubscribed</h1>
  <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6">You have been unsubscribed from promotional emails by <strong>${orgName}</strong>. You will no longer receive marketing emails from this organiser.</p>
  <p style="margin:0;font-size:12px;color:#999">Transactional emails (ticket confirmations, receipts) are not affected.</p>
</div>
</body>
</html>`;
}

function errorPage(msg) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe Error</title></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh">
<div style="max-width:480px;width:100%;margin:24px;background:#fff;border-radius:12px;padding:40px 32px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1a1a">Oops</h1>
  <p style="margin:0;font-size:14px;color:#666;line-height:1.6">${msg}</p>
</div>
</body>
</html>`;
}
