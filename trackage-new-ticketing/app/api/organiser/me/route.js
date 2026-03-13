/* app/api/organiser/me/route.js
   POST — verify Supabase auth token, find or create organiser record.
   Body: { name?: string } (used only on first-time creation)
   Header: Authorization: Bearer <access_token>
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
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'No auth token' }, { status: 401 });

    // Verify token using admin client — getUser(token) validates the JWT
    const supabaseAdmin = adminSupabase();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const supabase = supabaseAdmin;

    const FIELDS = 'id, name, email, status, vat_number, vat_rate, phone';

    // 1. Look up by email first (canonical — finds the organiser with events)
    const { data: emailRows, error: emailErr } = await supabase
      .from('organisers')
      .select(FIELDS)
      .eq('email', user.email)
      .limit(1);

    if (emailErr) console.error('Email lookup error:', emailErr);
    const byEmail = emailRows?.[0] ?? null;

    if (byEmail) {
      // Link user_id if not already set
      if (!byEmail.user_id) {
        await supabase.from('organisers').update({ user_id: user.id }).eq('id', byEmail.id);
      }
      return Response.json({ organiser: byEmail });
    }

    // 2. Fall back to user_id lookup
    const { data: byUserId } = await supabase
      .from('organisers')
      .select(FIELDS)
      .eq('user_id', user.id)
      .limit(1);

    if (byUserId?.[0]) return Response.json({ organiser: byUserId[0] });

    // 3. Create new organiser record
    const name = body.name || user.user_metadata?.full_name || user.email.split('@')[0];
    const { data: created, error: createError } = await supabase
      .from('organisers')
      .insert({ user_id: user.id, name, email: user.email, status: 'active' })
      .select(FIELDS)
      .single();

    if (createError) {
      console.error('Create organiser error:', createError);
      return Response.json({ error: createError.message }, { status: 500 });
    }

    return Response.json({ organiser: created });
  } catch (err) {
    console.error('me route error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
