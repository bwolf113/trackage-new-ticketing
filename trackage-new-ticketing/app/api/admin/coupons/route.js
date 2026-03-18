/* app/api/admin/coupons/route.js — CRUD for coupons via service role */
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET — list all coupons + events
export async function GET(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const supabase = adminSupabase();
  const [{ data: coupons }, { data: events }] = await Promise.all([
    supabase.from('coupons').select('*').order('created_at', { ascending: false }),
    supabase.from('events').select('id, name, start_time').order('start_time', { ascending: false }),
  ]);

  return Response.json({ coupons: coupons || [], events: events || [] });
}

// POST — create coupon
export async function POST(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const payload = await req.json();
  const supabase = adminSupabase();
  const { data, error } = await supabase.from('coupons').insert([payload]).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ coupon: data });
}

// PUT — update coupon
export async function PUT(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { id, ...payload } = await req.json();
  if (!id) return Response.json({ error: 'Missing coupon id' }, { status: 400 });

  const supabase = adminSupabase();
  const { data, error } = await supabase.from('coupons').update(payload).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ coupon: data });
}

// DELETE — delete coupon
export async function DELETE(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing coupon id' }, { status: 400 });

  const supabase = adminSupabase();
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
