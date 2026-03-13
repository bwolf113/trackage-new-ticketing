/* app/api/setup-storage/route.js
   One-time setup: creates the emails storage bucket and uploads the logo.
   Visit: GET /api/setup-storage
*/
import { getLogoURL } from '../../../lib/qrcode.js';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Create bucket
    const { error: bucketError } = await supabase.storage.createBucket('emails', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg'],
    });

    const bucketStatus = bucketError
      ? (bucketError.message?.includes('already exists') || bucketError.message?.includes('Duplicate')
          ? 'already exists ✓'
          : `error: ${bucketError.message}`)
      : 'created ✓';

    // 2. Set public policy (in case it wasn't set)
    // This is done via the bucket public:true flag above

    // 3. Upload logo
    const logoUrl = await getLogoURL();

    return Response.json({
      success: true,
      bucket:  bucketStatus,
      logoUrl: logoUrl || 'failed to upload',
      message: logoUrl
        ? 'Setup complete! Logo is now hosted at the URL above.'
        : 'Bucket created but logo upload failed. Check that public/logo-white.png exists.',
    });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
