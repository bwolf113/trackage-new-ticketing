/* app/api/contact/route.js */
import { NextResponse } from 'next/server';
import { sendEmail } from '../../../lib/sendEmail';

// Simple in-memory rate limit: 3 submissions per IP per 15 min
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
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\n/g, '<br>');
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many messages sent. Please wait 15 minutes before trying again.' },
      { status: 429 }
    );
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { name, email, topic, message } = body;

  if (!name?.trim())    return NextResponse.json({ error: 'Name is required.'    }, { status: 400 });
  if (!email?.trim() || !email.includes('@'))
                        return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  if (message.length > 2000)
                        return NextResponse.json({ error: 'Message is too long (max 2000 characters).' }, { status: 400 });

  const topicLabel = {
    general:     'General enquiry',
    ticket:      'Ticket support',
    partnership: 'Event partnership',
    other:       'Other',
  }[topic] || 'General enquiry';

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#000;padding:20px 24px;border-radius:8px 8px 0 0">
        <p style="color:#fff;font-size:13px;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">
          New Contact Form Submission
        </p>
      </div>
      <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr>
            <td style="padding:8px 0;color:#666;width:100px;vertical-align:top;font-weight:600">Name</td>
            <td style="padding:8px 0;color:#111">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;vertical-align:top;font-weight:600">Email</td>
            <td style="padding:8px 0"><a href="mailto:${escapeHtml(email)}" style="color:#0a9e7f">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;vertical-align:top;font-weight:600">Topic</td>
            <td style="padding:8px 0;color:#111">${escapeHtml(topicLabel)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#666;vertical-align:top;font-weight:600">Message</td>
            <td style="padding:8px 0;color:#111;line-height:1.6">${escapeHtml(message)}</td>
          </tr>
        </table>
      </div>
      <p style="font-size:12px;color:#999;margin-top:12px">
        Sent from the Trackage Scheme contact form — tickets.trackagescheme.com/contact
      </p>
    </div>
  `;

  const result = await sendEmail({
    to:      'team@trackagescheme.com',
    subject: `[Contact] ${topicLabel} — ${name}`,
    html,
  });

  if (!result.success) {
    console.error('Contact form email failed:', result.error);
    return NextResponse.json({ error: 'Failed to send message. Please try again or email us directly.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
