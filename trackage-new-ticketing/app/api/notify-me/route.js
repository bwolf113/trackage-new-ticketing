/* app/api/notify-me/route.js
   Public POST — sends a notification email to team@trackagescheme.com
   when someone submits their email via the "Never miss a show" form.
*/
import { NextResponse } from 'next/server';
import { sendEmail } from '../../../lib/sendEmail';

const attempts = new Map();
const WINDOW_MS    = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function isRateLimited(ip) {
  const now  = Date.now();
  const prev = (attempts.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (prev.length >= MAX_ATTEMPTS) return true;
  attempts.set(ip, [...prev, now]);
  return false;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email } = body;
  if (!email?.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#000;padding:20px 24px;border-radius:8px 8px 0 0">
        <p style="color:#fff;font-size:13px;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">
          New Newsletter Signup
        </p>
      </div>
      <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
        <p style="font-size:14px;color:#111;margin:0">
          <strong>${escapeHtml(email)}</strong> wants to be notified about new events.
        </p>
      </div>
      <p style="font-size:12px;color:#999;margin-top:12px">
        Submitted via the "Never miss a show" form on tickets.trackagescheme.com
      </p>
    </div>
  `;

  const result = await sendEmail({
    to:      'team@trackagescheme.com',
    subject: `[Newsletter] New signup — ${email}`,
    html,
  });

  if (!result.success) {
    console.error('Notify-me email failed:', result.error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
