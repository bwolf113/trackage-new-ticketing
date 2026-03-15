import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// In-memory rate limiting: max 3 requests per email per 15 minutes
const attempts = new Map(); // email -> [timestamps]
const WINDOW_MS   = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;

function isRateLimited(email) {
  const now  = Date.now();
  const key  = email.toLowerCase().trim();
  const prev = (attempts.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (prev.length >= MAX_ATTEMPTS) return true;
  attempts.set(key, [...prev, now]);
  return false;
}

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please wait 15 minutes before trying again.' },
        { status: 429 }
      );
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://tickets.trackagescheme.com'}/organiser/reset-password`;

    // Use admin client to send reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    // Always return success to avoid leaking whether an account exists
    if (error) {
      console.error('Password reset error:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Password reset route error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
