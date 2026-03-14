/* app/api/organiser/profile/route.js
   GET  ?organiser_id=xxx  — fetch profile
   POST { organiser_id, vat_number, bank_iban } — update profile
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const organiser_id = searchParams.get('organiser_id');
    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

    const supabase = adminSupabase();
    const { data, error } = await supabase
      .from('organisers')
      .select('id, name, email, vat_number, bank_iban')
      .eq('id', organiser_id)
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ organiser: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { organiser_id, vat_number, bank_iban } = await req.json();
    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

    const supabase = adminSupabase();
    const updates = { updated_at: new Date().toISOString() };
    if (vat_number !== undefined) updates.vat_number = vat_number;
    if (bank_iban  !== undefined) updates.bank_iban  = bank_iban;

    const { error } = await supabase
      .from('organisers')
      .update(updates)
      .eq('id', organiser_id);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
