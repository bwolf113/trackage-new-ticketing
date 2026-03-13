/* lib/qrcode.js */
import { createClient } from '@supabase/supabase-js';

async function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function ensureBucket(supabase) {
  // Create bucket if it doesn't exist
  const { error } = await supabase.storage.createBucket('emails', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg'],
  });
  // Ignore "already exists" error
  if (error && !error.message?.includes('already exists') && !error.message?.includes('Duplicate')) {
    console.warn('Bucket create warning:', error.message);
  }
}

export async function generateQRPublicURL(text, filename) {
  try {
    const QRCode   = (await import('qrcode')).default;
    const supabase = await getSupabase();

    await ensureBucket(supabase);

    const buffer = await QRCode.toBuffer(text, {
      width: 300, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });

    const path = `qrcodes/${filename}.png`;
    const { error } = await supabase.storage
      .from('emails')
      .upload(path, buffer, { contentType: 'image/png', upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from('emails').getPublicUrl(path);
    return data.publicUrl;

  } catch (err) {
    console.error('QR upload failed:', err.message);
    // Reliable fallback CDN
    const encoded = encodeURIComponent(text);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&margin=10&color=000000&bgcolor=ffffff`;
  }
}

const SUPABASE_LOGO_URL = 'https://bflmjuzmmuhytkxpdrbw.supabase.co/storage/v1/object/public/emails/brand/logo-white.png';

export async function getLogoURL() {
  return SUPABASE_LOGO_URL;
}
