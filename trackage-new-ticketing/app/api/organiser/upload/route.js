/* app/api/organiser/upload/route.js
   POST multipart/form-data: { file, type: 'thumbnail'|'poster' }
   Validates, uploads to Supabase Storage bucket "event-media", returns public URL.
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const MAX_BYTES   = 500 * 1024; // 500 KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'misc';

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ error: 'Invalid file type. Use JPG, PNG or WebP.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: `File too large. Maximum is 500 KB (got ${(file.size / 1024).toFixed(0)} KB).` }, { status: 400 });
    }

    const supabase = adminSupabase();
    const ext  = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(path);
    return Response.json({ url: publicUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
