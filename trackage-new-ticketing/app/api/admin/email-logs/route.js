/* app/api/admin/email-logs/route.js */
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

export async function GET(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get('search')  || '';
  const status  = searchParams.get('status')  || '';
  const page    = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit   = 50;
  const offset  = (page - 1) * limit;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let query = supabase
    .from('email_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (search) query = query.or(`to_email.ilike.%${search}%,subject.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ logs: data, total: count, page, limit });
}
