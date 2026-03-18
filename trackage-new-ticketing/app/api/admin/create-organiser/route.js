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
    const { name, email, password, phone, vat_number, vat_rate } = await req.json();

    if (!name?.trim())     return Response.json({ error: 'Name is required.' },     { status: 400 });
    if (!email?.trim())    return Response.json({ error: 'Email is required.' },    { status: 400 });
    if (!password?.trim()) return Response.json({ error: 'Password is required.' }, { status: 400 });

    const supabase = adminSupabase();

    // Insert the organiser record
    const payload = {
      name:       name.trim(),
      email:      email.trim().toLowerCase(),
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

    // Set password in Supabase Auth via set-organiser-password route logic inline
    // (re-using the same approach: find or create auth user, set password)
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (!listErr) {
      const match = users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
      if (match) {
        await supabase.auth.admin.updateUserById(match.id, { password: password.trim() });
        await supabase.from('organisers').update({ user_id: match.id }).eq('id', organiser.id);
      }
    }

    // Send welcome email (non-blocking — don't fail the request if email fails)
    try {
      const html = await organiserWelcomeEmail({
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password: password.trim(),
      });
      await sendEmail({
        to:      email.trim().toLowerCase(),
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
