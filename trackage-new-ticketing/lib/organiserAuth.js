/* lib/organiserAuth.js
   Server-side helper — verifies the Supabase Bearer token from a request
   and returns the authenticated organiser record.
   Usage:
     const { organiser, errorResponse } = await getOrganiserFromRequest(req);
     if (errorResponse) return errorResponse;
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function getOrganiserFromRequest(req) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { errorResponse: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const supabase = adminSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { errorResponse: Response.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  // Look up organiser by email first, then user_id — avoids string interpolation in .or()
  let organiser = null;
  const { data: byEmail } = await supabase
    .from('organisers').select('id, name, email, status')
    .eq('email', user.email).limit(1);
  organiser = byEmail?.[0] ?? null;

  if (!organiser) {
    const { data: byUserId } = await supabase
      .from('organisers').select('id, name, email, status')
      .eq('user_id', user.id).limit(1);
    organiser = byUserId?.[0] ?? null;
  }
  if (!organiser) {
    return { errorResponse: Response.json({ error: 'Organiser account not found' }, { status: 403 }) };
  }

  return { organiser, user };
}
