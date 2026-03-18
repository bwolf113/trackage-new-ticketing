/* app/api/admin/organisers/route.js
   GET  — list all organisers (service role, bypasses RLS)
   PUT  — update an organiser record
   DELETE — delete an organiser record
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const supabase = adminSupabase();

  const { data: organisers, error } = await supabase
    .from('organisers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: events } = await supabase.from('events').select('organiser_id');
  const eventCounts = {};
  (events || []).forEach(e => {
    if (e.organiser_id) eventCounts[e.organiser_id] = (eventCounts[e.organiser_id] || 0) + 1;
  });

  return Response.json({ organisers: organisers || [], eventCounts });
}

export async function PUT(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { id, ...payload } = await req.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const supabase = adminSupabase();
  const { error } = await supabase.from('organisers').update(payload).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}

export async function DELETE(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const supabase = adminSupabase();
  const { error } = await supabase.from('organisers').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
