/* app/api/admin/set-organiser-password/route.js
   POST — update a Supabase Auth user's password for a given organiser.
   Body: { organiser_id: string, password: string }
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  try {
    const { organiser_id, password } = await req.json();
    if (!organiser_id || !password) {
      return Response.json({ error: 'organiser_id and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = adminSupabase();

    // Look up the organiser to get their user_id and email
    const { data: organiser, error: orgErr } = await supabase
      .from('organisers')
      .select('id, email, user_id')
      .eq('id', organiser_id)
      .single();

    if (orgErr || !organiser) {
      return Response.json({ error: 'Organiser not found' }, { status: 404 });
    }

    let authUserId = organiser.user_id;

    // If no user_id linked yet, find the auth user by email
    if (!authUserId) {
      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw listErr;
      const match = users.find(u => u.email?.toLowerCase() === organiser.email?.toLowerCase());
      if (match) {
        authUserId = match.id;
        // Link it for future use
        await supabase.from('organisers').update({ user_id: authUserId }).eq('id', organiser_id);
      }
    }

    if (!authUserId) {
      return Response.json({ error: 'No Supabase Auth account found for this organiser. They may need to sign up first.' }, { status: 404 });
    }

    // Update the password in Supabase Auth
    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, { password });
    if (updateErr) throw updateErr;

    return Response.json({ success: true });
  } catch (err) {
    console.error('[set-organiser-password]', err);
    return Response.json({ error: err.message || 'Failed to update password' }, { status: 500 });
  }
}
