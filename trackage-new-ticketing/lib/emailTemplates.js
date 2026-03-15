/* lib/emailTemplates.js — CRM email template system
   5 pre-built templates with organiser customization (logo, color, CTA, footer)
   Includes tracking pixel, click-tracking wrapper, and unsubscribe link.
*/

import crypto from 'crypto';

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const UNSUB_SECRET = () => process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';

/* ── Template catalogue ─────────────────────────────────────────── */
export const TEMPLATES = [
  {
    key: 'promotion',
    label: 'Event Promotion',
    icon: '🎪',
    description: 'Promote an upcoming event with a strong call-to-action',
    defaultSubject: 'Check out this amazing event!',
    defaultCtaText: 'Get Your Tickets',
    defaultMessage: 'We have an exciting event coming up and we\'d love to see you there! Join us for a night of great entertainment, food, and friends.',
  },
  {
    key: 'thank_you',
    label: 'Thank You',
    icon: '🙏',
    description: 'Post-event thank you message to attendees',
    defaultSubject: 'Thanks for attending!',
    defaultCtaText: 'View Photos',
    defaultMessage: 'We had an absolute blast having you at our event. Your presence made it truly special. We\'d love to hear what you thought!',
  },
  {
    key: 'last_chance',
    label: 'Last Chance',
    icon: '⏰',
    description: 'Urgency-driven message for events about to sell out',
    defaultSubject: 'Last chance — tickets selling out!',
    defaultCtaText: 'Book Now',
    defaultMessage: 'Only a few tickets left! Don\'t miss out on this incredible experience. Grab your tickets today before they\'re gone.',
  },
  {
    key: 'announcement',
    label: 'New Event',
    icon: '📢',
    description: 'Announce a brand new event to your audience',
    defaultSubject: 'New event announcement!',
    defaultCtaText: 'Explore the Event',
    defaultMessage: 'We\'re thrilled to announce an exciting new event. Be among the first to grab your tickets at our special early-bird price.',
  },
  {
    key: 're_engagement',
    label: 'We Miss You',
    icon: '👋',
    description: 'Win back attendees who haven\'t been to a recent event',
    defaultSubject: 'We miss you!',
    defaultCtaText: 'See What\'s New',
    defaultMessage: 'It\'s been a while since you\'ve been to one of our events. We\'ve got some amazing things happening this season and we\'d love to see you back.',
  },
];

export function getTemplateDefaults(key) {
  return TEMPLATES.find(t => t.key === key) || TEMPLATES[0];
}

/* ── Unsubscribe token helpers ──────────────────────────────────── */
export function generateUnsubToken(email, organiserId) {
  return crypto
    .createHmac('sha256', UNSUB_SECRET())
    .update(`${email}|${organiserId}`)
    .digest('hex');
}

export function verifyUnsubToken(email, organiserId, token) {
  return generateUnsubToken(email, organiserId) === token;
}

export function buildUnsubUrl(email, organiserId) {
  const token = generateUnsubToken(email, organiserId);
  return `${SITE_URL()}/api/unsubscribe?email=${encodeURIComponent(email)}&org=${organiserId}&token=${token}`;
}

/* ── Tracking helpers ───────────────────────────────────────────── */
export function buildTrackingPixelUrl(campaignId, email) {
  return `${SITE_URL()}/api/email/track/open?cid=${campaignId}&e=${encodeURIComponent(email)}`;
}

export function buildClickTrackUrl(campaignId, email, destinationUrl) {
  return `${SITE_URL()}/api/email/track/click?cid=${campaignId}&e=${encodeURIComponent(email)}&url=${encodeURIComponent(destinationUrl)}`;
}

/* ── UTM helpers ────────────────────────────────────────────────── */
function appendUtm(url, campaignId, templateKey, content) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'crm');
    u.searchParams.set('utm_medium', 'email');
    u.searchParams.set('utm_campaign', templateKey || 'broadcast');
    u.searchParams.set('utm_content', content || 'cta_button');
    u.searchParams.set('utm_id', campaignId || '');
    return u.toString();
  } catch {
    return url;
  }
}

/* ── HTML escape ────────────────────────────────────────────────── */
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Render template ────────────────────────────────────────────── */
export function renderTemplate({
  templateKey,
  logoUrl,
  primaryColor,
  organiserName,
  subject,
  message,
  ctaText,
  ctaUrl,
  footerText,
  eventName,
  // Tracking / compliance (optional — omitted for preview)
  campaignId,
  recipientEmail,
  organiserId,
}) {
  const color = primaryColor || '#0a9e7f';
  const year  = new Date().getFullYear();
  const name  = esc(organiserName || 'Trackage Scheme');
  const escaped = esc(message);
  const subEsc  = esc(subject);
  const evtEsc  = eventName ? esc(eventName) : '';

  // Build tracked CTA URL
  let finalCtaUrl = ctaUrl || '';
  if (campaignId && finalCtaUrl) {
    finalCtaUrl = appendUtm(finalCtaUrl, campaignId, templateKey, 'cta_button');
    finalCtaUrl = buildClickTrackUrl(campaignId, recipientEmail || '', finalCtaUrl);
  }

  // Unsubscribe
  const unsubUrl = organiserId && recipientEmail
    ? buildUnsubUrl(recipientEmail, organiserId)
    : '#';

  // Tracking pixel
  const pixelImg = campaignId && recipientEmail
    ? `<img src="${buildTrackingPixelUrl(campaignId, recipientEmail)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`
    : '';

  // Template-specific hero section
  let heroSection = '';
  if (templateKey === 'promotion' || templateKey === 'announcement') {
    heroSection = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${color}">
      <tr><td style="padding:20px 32px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em">${templateKey === 'announcement' ? 'New Event' : 'Featured Event'}</p>
        ${evtEsc ? `<p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#fff">${evtEsc}</p>` : ''}
      </td></tr>
    </table>`;
  } else if (templateKey === 'last_chance') {
    heroSection = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#d9534f">
      <tr><td style="padding:16px 32px;text-align:center">
        <p style="margin:0;font-size:14px;font-weight:700;color:#fff;letter-spacing:0.04em">Limited Availability</p>
        ${evtEsc ? `<p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8)">${evtEsc}</p>` : ''}
      </td></tr>
    </table>`;
  } else if (templateKey === 'thank_you') {
    heroSection = evtEsc ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${color}">
      <tr><td style="padding:14px 32px">
        <p style="margin:0;font-size:12px;font-weight:600;color:#fff;letter-spacing:0.02em">Thank you for attending ${evtEsc}</p>
      </td></tr>
    </table>` : '';
  } else if (templateKey === 're_engagement') {
    heroSection = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${color}">
      <tr><td style="padding:14px 32px;text-align:center">
        <p style="margin:0;font-size:13px;font-weight:600;color:#fff">We'd love to see you again</p>
      </td></tr>
    </table>`;
  }

  // CTA button color
  const btnColor = templateKey === 'last_chance' ? '#d9534f' : color;

  // CTA button
  const ctaBlock = ctaText && ctaUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
      <tr><td align="center">
        <a href="${finalCtaUrl}" target="_blank" style="display:inline-block;background:${btnColor};color:#ffffff;padding:14px 36px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:700;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;mso-padding-alt:0">${esc(ctaText)}</a>
      </td></tr>
    </table>` : '';

  // Logo section
  const logoSection = logoUrl
    ? `<img src="${logoUrl}" width="160" alt="${name}" style="display:block;margin:0 auto;max-width:160px;max-height:60px;border:0" border="0" />`
    : `<p style="margin:0;font-size:16px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.08em">${name}</p>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${subEsc}</title>
<style type="text/css">
  body { margin:0!important; padding:0!important; background:#f5f5f3!important; }
  table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  a { color:${color}; }
  @media only screen and (max-width:600px) {
    .outer-wrap { width:100%!important; }
    .inner-pad  { padding:24px 18px!important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f3">
<tr><td align="center" style="padding:24px 16px">

<table class="outer-wrap" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>

  <!-- HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:22px 32px;text-align:center">
      ${logoSection}
      <p style="margin:6px 0 0;font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.08em;text-transform:uppercase">via Trackage Scheme</p>
    </td></tr>
  </table>

  ${heroSection}

  <!-- BODY -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td class="inner-pad" style="padding:32px 32px 28px">
      <h1 style="margin:0 0 22px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3">${subEsc}</h1>
      <div style="font-size:14px;color:#444;line-height:1.8;white-space:pre-wrap">${escaped}</div>
      ${ctaBlock}
    </td></tr>
  </table>

  <!-- FOOTER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f0">
    <tr><td style="padding:18px 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
      ${footerText ? `<p style="margin:0 0 10px;font-size:12px;color:#666;line-height:1.5">${esc(footerText)}</p>` : ''}
      <p style="margin:0;font-size:11px;color:#bbb">&copy; ${year} ${name} &middot; Powered by <a href="https://shop.trackagescheme.com" style="color:#bbb;text-decoration:none">Trackage Scheme</a></p>
    </td></tr>
  </table>

  <!-- UNSUBSCRIBE -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-top:1px solid #f0f0f0">
    <tr><td style="padding:14px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#999">You received this email because you opted in to promotional communications. <a href="${unsubUrl}" style="color:#999;text-decoration:underline">Unsubscribe</a></p>
    </td></tr>
  </table>

  ${pixelImg}

</td></tr>
</table>

</td></tr>
</table>

</body>
</html>`;
}
