/* app/api/organiser/profile/route.js
   GET  — fetch profile (auth via Bearer token)
   POST { vat_number, bank_iban } — update profile (auth via Bearer token)
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../lib/organiserAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  try {
    const { organiser, errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;

    const supabase = adminSupabase();
    const { data, error } = await supabase
      .from('organisers')
      .select('id, name, email, vat_number, bank_iban')
      .eq('id', organiser.id)
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ organiser: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { organiser, errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;

    const { vat_number, bank_iban } = await req.json();

    const supabase = adminSupabase();
    const updates = { updated_at: new Date().toISOString() };
    if (vat_number !== undefined) updates.vat_number = vat_number;
    if (bank_iban  !== undefined) updates.bank_iban  = bank_iban;

    const { error } = await supabase
      .from('organisers')
      .update(updates)
      .eq('id', organiser.id);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
