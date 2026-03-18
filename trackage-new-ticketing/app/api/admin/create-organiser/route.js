/* app/api/admin/create-organiser/route.js
   POST — create a new organiser record and send a welcome email.
   Body: { name, email, password, phone?, vat_number?, vat_rate? }
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';
import { sendEmail, organiserWelcomeEmail } from '../../../../lib/sendEmail';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  try {
    const { name, email, phone, vat_number, vat_rate } = await req.json();

    if (!name?.trim())  return Response.json({ error: 'Name is required.' },  { status: 400 });
    if (!email?.trim()) return Response.json({ error: 'Email is required.' }, { status: 400 });

    const supabase  = adminSupabase();
    const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const cleanEmail = email.trim().toLowerCase();

    // Insert the organiser record
    const payload = {
      name:       name.trim(),
      email:      cleanEmail,
      phone:      phone?.trim() || null,
      vat_number: vat_number?.trim() || null,
      vat_rate:   vat_rate ? parseFloat(vat_rate) : null,
      status:     'active',
    };

    const { data: organiser, error: insertErr } = await supabase
      .from('organisers')
      .insert([payload])
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message);

    // Generate an invite link — creates the auth user if needed and returns a one-time setup URL
    let inviteUrl = `${siteUrl}/organiser/login`;
    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type:    'invite',
        email:   cleanEmail,
        options: { redirectTo: `${siteUrl}/organiser/set-password` },
      });
      if (linkErr) throw linkErr;

      inviteUrl = linkData.properties?.action_link || inviteUrl;

      // Link the auth user to the organiser record
      const authUserId = linkData.user?.id;
      if (authUserId) {
        await supabase.from('organisers').update({ user_id: authUserId }).eq('id', organiser.id);
      }
    } catch (authErr) {
      console.error('[create-organiser] Invite link generation failed:', authErr.message);
    }

    // Send welcome email with the invite link (non-blocking)
    try {
      const html = await organiserWelcomeEmail({
        name:      name.trim(),
        email:     cleanEmail,
        inviteUrl,
      });
      await sendEmail({
        to:      cleanEmail,
        subject: `Welcome to Trackage Scheme — your organiser account is ready`,
        html,
      });
    } catch (emailErr) {
      console.error('[create-organiser] Welcome email failed:', emailErr.message);
    }

    return Response.json({ success: true, organiser });
  } catch (err) {
    console.error('[create-organiser]', err);
    return Response.json({ error: err.message || 'Failed to create organiser' }, { status: 500 });
  }
}
