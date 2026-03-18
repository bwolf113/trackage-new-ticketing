/* lib/sendEmail.js */
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { generateQRPublicURL, getLogoURL } from './qrcode.js';

/* ── providers ─────────────────────────────────────────────────── */
const useResend = process.env.EMAIL_PROVIDER !== 'sendgrid' && !!process.env.RESEND_API_KEY;

const resend = useResend ? new Resend(process.env.RESEND_API_KEY) : null;

const transporter = !useResend
  ? nodemailer.createTransport({
      host:   'smtp.sendgrid.net',
      port:   587,
      secure: false,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
    })
  : null;

export async function sendEmail({ to, subject, html, attachments = [], headers = {} }) {
  const from     = `${process.env.EMAIL_FROM_NAME || 'Trackage Scheme'} <${process.env.EMAIL_FROM || 'team@trackagescheme.com'}>`;
  const provider = useResend ? 'resend' : 'sendgrid';

  try {
    let messageId;
    if (resend) {
      const { data, error } = await resend.emails.send({
        from, to, subject, html,
        ...(attachments.length > 0 && {
          attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            ...(a.contentType && { contentType: a.contentType }),
          })),
        }),
        ...(Object.keys(headers).length > 0 && { headers }),
      });
      if (error) throw new Error(error.message);
      messageId = data.id;
      console.log('Email sent (Resend):', messageId, 'to', to);
    } else {
      const info = await transporter.sendMail({ from, to, subject, html, attachments, headers });
      messageId = info.messageId;
      console.log('Email sent (SendGrid):', messageId, 'to', to);
    }

    logEmail({ to, subject, status: 'sent', provider, message_id: messageId }).catch(() => {});
    return { success: true, messageId };
  } catch (err) {
    console.error('Email send failed:', err.message);
    logEmail({ to, subject, status: 'failed', provider, error: err.message }).catch(() => {});
    return { success: false, error: err.message };
  }
}

async function logEmail({ to, subject, status, provider, message_id, error }) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    await supabase.from('email_logs').insert([{ to_email: to, subject, status, provider, message_id, error: error || null }]);
  } catch (logErr) {
    console.error('Email log failed:', logErr.message);
  }
}

/* ── helpers ─────────────────────────────────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
const MT = { timeZone: 'Europe/Malta' };
function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...MT });
}
function fmtDateShort(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { day: '2-digit', month: '2-digit', year: 'numeric', ...MT });
}
function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit', ...MT });
}

function makeHeader(logoUrl) {
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  // For browser preview: use local path. For real emails: Supabase URL is passed in.
  const finalUrl = logoUrl || `${siteUrl}/logo-white.png`;
  const imgTag   = `<img src="${finalUrl}" width="220" alt="Trackage Scheme" style="display:block;margin:0 auto;max-width:220px;border:0" border="0" />`;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:24px 32px;text-align:center">
      ${imgTag}
      <p style="margin:10px 0 0;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.1em;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">Above ground is overrated</p>
    </td></tr>
  </table>`;
}

const FOOTER_DISCLAIMER = `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e8e6">
    <tr><td style="padding:18px 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
      <p style="margin:0 0 5px;font-size:10px;color:#999;line-height:1.7">Tickets are bound to the Terms &amp; Conditions found on <a href="https://shop.trackagescheme.com/terms-and-conditions/" style="color:#0a9e7f">https://shop.trackagescheme.com/terms-and-conditions/</a></p>
      <p style="margin:0;font-size:10px;color:#999">Issued and operated by Trackage Scheme – 2573-6412 EXO 5567</p>
    </td></tr>
  </table>`;

const POWERED_BY = `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-top:1px solid #f0f0f0">
    <tr><td style="padding:14px 32px;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
      <p style="margin:0;font-size:11px;color:#bbb">© ${new Date().getFullYear()} Trackage Scheme · Above ground is overrated · <a href="https://shop.trackagescheme.com" style="color:#bbb">shop.trackagescheme.com</a></p>
    </td></tr>
  </table>`;

/* ═══════════════════════════════════════════════════════════════════
   1. TICKET CONFIRMATION
   ═══════════════════════════════════════════════════════════════════ */
export async function ticketConfirmationEmail({ order, event, orderItems, organiser, attendees }) {
  const orderRef = (order.id || '').slice(0, 8).toUpperCase();
  const name     = order.customer_name || order.purchaser_name || '—';
  const email    = order.customer_email || order.purchaser_email || '';
  const vatNum   = organiser?.vat_number
    ? (organiser.vat_number.startsWith('MT') ? organiser.vat_number : `MT${organiser.vat_number}`)
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // ── Resolve QR codes ──────────────────────────────────────────
  // If attendees were pre-generated (webhook path), use their qr_urls directly.
  // Otherwise generate them now (resend path).
  let resolvedAttendees = attendees || [];
  if (resolvedAttendees.length > 0 && !resolvedAttendees[0].qr_url) {
    resolvedAttendees = await Promise.all(resolvedAttendees.map(async (a) => {
      const qrUrl = await generateQRPublicURL(
        `${siteUrl}/scan/${a.qr_token}`,
        `qr-${a.id.slice(0, 8)}`
      );
      return { ...a, qr_url: qrUrl };
    }));
  }

  // Fallback: old single-QR path for orders that pre-date order_attendees
  let fallbackQrUrl = null;
  if (resolvedAttendees.length === 0) {
    const qrData = order.qr_token
      ? `${siteUrl}/scan/${order.qr_token}`
      : `${siteUrl}/scan/${order.id}`;
    fallbackQrUrl = await generateQRPublicURL(qrData, `qr-${orderRef}`);
  }

  const logoUrl   = await getLogoURL();
  const finalLogo = logoUrl || `${siteUrl}/logo-white.png`;
  const logoImg   = `<img src="${finalLogo}" width="220" alt="Trackage Scheme" style="display:block;margin:0 auto;max-width:220px;border:0" border="0" />`;

  // ── Build per-attendee QR blocks ───────────────────────────────
  const total = resolvedAttendees.length;
  const qrBlocks = total > 0
    ? resolvedAttendees.map((a, i) => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${i < total - 1 ? '20px' : '0'}">
        <tr>
          <td valign="top" style="padding-right:16px">
            <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999">Ticket ${i + 1} of ${total}</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a">${a.ticket_name}</p>
          </td>
          <td valign="top" align="right" width="140" style="width:140px">
            <img src="${a.qr_url}" width="130" height="130" alt="QR Code" style="display:block;border-radius:6px;border:3px solid #f0f0f0;margin-left:auto" />
            <p style="margin:5px 0 0;font-size:10px;color:#999;font-weight:600;text-align:center">Scan at door</p>
          </td>
        </tr>
      </table>
      ${i < total - 1 ? '<div style="height:1px;background:#f0f0f0;margin:4px 0 20px">&nbsp;</div>' : ''}
    `).join('')
    : `
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top" style="padding-right:20px">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999">Ticket holder</p>
            <p style="margin:0 0 3px;font-size:17px;font-weight:700;color:#1a1a1a">${name}</p>
            <p style="margin:0 0 20px;font-size:13px;color:#666">${email}</p>
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999">Order reference</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a;font-family:monospace">#${orderRef}</p>
          </td>
          <td valign="top" align="right" width="160" style="width:160px">
            <img src="${fallbackQrUrl}" width="150" height="150" alt="QR Code" style="display:block;border-radius:6px;border:3px solid #f0f0f0;margin-left:auto" />
            <p style="margin:6px 0 0;font-size:10px;color:#999;font-weight:600;text-align:center">Scan at door</p>
          </td>
        </tr>
      </table>
    `;

  const itemRows = (orderItems || []).map(item => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${item.ticket_name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${item.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#0a9e7f;text-align:right;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${fmt((item.unit_price||0)*(item.quantity||1))}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Your Ticket — ${event?.name || 'Event'}</title>
<style type="text/css">
  body { margin:0!important; padding:0!important; background:#f5f5f3!important; }
  table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  @media only screen and (max-width:600px) {
    .outer-wrap { width:100%!important; }
    .inner-pad  { padding:20px 16px!important; }
    /* Stack QR section */
    .qr-holder-cell  { display:block!important; width:100%!important; text-align:center!important; padding:0 0 20px 0!important; }
    .qr-code-cell    { display:block!important; width:100%!important; text-align:center!important; padding:0!important; }
    .qr-img          { margin:0 auto!important; display:block!important; }
    .qr-name         { text-align:center!important; }
    .qr-email        { text-align:center!important; }
    .qr-ref-label    { text-align:center!important; }
    .qr-ref-val      { text-align:center!important; }
    /* Info grid */
    .info-cell-left  { display:block!important; width:100%!important; border-right:none!important; border-bottom:1px solid #f0f0f0!important; }
    .info-cell-right { display:block!important; width:100%!important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f3">
<tr><td align="center" style="padding:24px 16px">

<table class="outer-wrap" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>

  <!-- LOGO HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:24px 32px;text-align:center">
      ${logoImg}
      <p style="margin:10px 0 0;font-size:11px;color:rgba(255,255,255,0.45);letter-spacing:0.1em;text-transform:uppercase">Above ground is overrated</p>
    </td></tr>
  </table>

  <!-- TICKET BAND -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:24px 32px 22px">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0a9e7f">🎫 Your ticket</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.2">${event?.name || 'Event'}</p>
      ${event?.start_time ? `<p style="margin:0 0 5px;font-size:13px;color:#ffffff">📅 <strong>${fmtDate(event.start_time)}</strong></p>` : ''}
      ${event?.start_time ? `<p style="margin:0 0 5px;font-size:13px;color:#ffffff">🕐 <strong>${fmtTime(event.start_time)}</strong></p>` : ''}
      ${event?.venue_name ? `<p style="margin:0;font-size:13px;color:#ffffff">📍 <strong>${event.venue_name}</strong></p>` : ''}
    </td></tr>
  </table>

  <!-- TEAR LINE -->
  <div style="height:3px;font-size:3px;line-height:3px;background-image:repeating-linear-gradient(90deg,#ccc 0,#ccc 10px,#ffffff 10px,#ffffff 18px)">&nbsp;</div>

  <!-- BODY -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td class="inner-pad" style="padding:28px 32px">

      <!-- TICKET HOLDER + ORDER REF -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr>
          <td valign="top" style="padding-right:20px">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999">Ticket holder</p>
            <p style="margin:0 0 3px;font-size:17px;font-weight:700;color:#1a1a1a">${name}</p>
            <p style="margin:0;font-size:13px;color:#666">${email}</p>
          </td>
          <td valign="top" align="right">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;text-align:right">Order reference</p>
            <p style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a;font-family:monospace;text-align:right">#${orderRef}</p>
          </td>
        </tr>
      </table>

      <!-- QR CODES — one per physical ticket -->
      <div style="margin-bottom:24px;padding:16px;border:1.5px solid #e8e8e6;border-radius:10px">
        ${qrBlocks}
      </div>

      <!-- DIVIDER -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr><td style="height:1px;background:#f0f0f0;font-size:1px;line-height:1px">&nbsp;</td></tr>
      </table>

      <!-- EVENT INFO GRID -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e6;border-radius:8px;overflow:hidden;margin-bottom:24px">
        <tr>
          <td class="info-cell-left" valign="top" width="50%" style="padding:12px 16px;border-bottom:1px solid #f0f0f0;border-right:1px solid #f0f0f0">
            <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Event name</p>
            <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${event?.name || '—'}</p>
          </td>
          <td class="info-cell-right" valign="top" style="padding:12px 16px;border-bottom:1px solid #f0f0f0">
            <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Date &amp; time</p>
            <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${event?.start_time ? `${fmtDate(event.start_time)} @ ${fmtTime(event.start_time)}` : '—'}</p>
          </td>
        </tr>
        <tr>
          <td class="info-cell-left" valign="top" width="50%" style="padding:12px 16px;border-right:1px solid #f0f0f0">
            <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Location</p>
            <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${event?.venue_name || '—'}</p>
          </td>
          <td class="info-cell-right" valign="top" style="padding:12px 16px">
            <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Organiser</p>
            <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${organiser?.name || '—'}</p>
            ${vatNum ? `<p style="margin:3px 0 0;font-size:11px;color:#666">VAT: ${vatNum}</p>` : ''}
          </td>
        </tr>
      </table>

      <!-- TICKETS TABLE -->
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999">Tickets</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e6;border-radius:8px 8px 0 0;overflow:hidden">
        <thead>
          <tr style="background:#f9f9f9">
            <th align="left"  style="padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Ticket type</th>
            <th align="center" style="padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Qty</th>
            <th align="right" style="padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}${(order.booking_fee || 0) > 0 ? `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">Booking fee</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif"></td>
            <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#0a9e7f;text-align:right;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">${fmt(order.booking_fee)}</td>
          </tr>` : ''}${(order.discount || 0) > 0 ? `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif"></td>
            <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#0a9e7f;text-align:right;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">−${fmt(order.discount)}</td>
          </tr>` : ''}</tbody>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:0 0 8px 8px;margin-bottom:24px">
        <tr>
          <td style="padding:12px 14px;font-size:14px;font-weight:700;color:#ffffff">Total paid</td>
          <td align="right" style="padding:12px 14px;font-size:15px;font-weight:700;color:#ffffff">${fmt(order.total)}</td>
        </tr>
      </table>

      <!-- WHAT'S NEXT -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px">
        <tr><td style="padding:18px 20px">
          <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999">What happens next</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="top" style="padding-bottom:12px">
                <div style="width:32px;height:32px;background:#fff;border:1.5px solid #e8e8e6;border-radius:8px;text-align:center;line-height:32px;font-size:16px">🎟</div>
              </td>
              <td valign="top" style="padding-left:12px;padding-bottom:12px">
                <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#1a1a1a">Show this email at the door</p>
                <p style="margin:0;font-size:12px;color:#666;line-height:1.5">Put your smartphone screen on maximum brightness and present the QR code above to gain entry.</p>
              </td>
            </tr>
            <tr>
              <td width="36" valign="top"><div style="width:32px;height:32px;background:#fff;border:1.5px solid #e8e8e6;border-radius:8px;text-align:center;line-height:32px;font-size:16px">✉️</div></td>
              <td valign="top" style="padding-left:12px">
                <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#1a1a1a">Need help?</p>
                <p style="margin:0;font-size:12px;color:#666;line-height:1.5">Email <a href="mailto:team@trackagescheme.com" style="color:#0a9e7f;font-weight:600">team@trackagescheme.com</a> with your order reference #${orderRef}.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

    </td></tr>
  </table>

  ${FOOTER_DISCLAIMER}
  ${POWERED_BY}

</td></tr>
</table>

</td></tr>
</table>

</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════════
   2. BOOKING FEE RECEIPT
   ═══════════════════════════════════════════════════════════════════ */
export async function bookingFeeReceiptEmail({ order, event, receiptNumber }) {
  const name      = order.customer_name || order.purchaser_name || '—';
  const dateStr   = fmtDateShort(order.created_at || new Date().toISOString());
  const fee       = order.booking_fee || 0;
  const receiptNo = receiptNumber || (order.id || '').slice(0,8).toUpperCase();
  const logoUrl   = await getLogoURL();
  const header    = makeHeader(logoUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f5f5f3}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3"><tr><td align="center" style="padding:24px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>
  ${header}
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 32px 0">
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1a1a1a">Booking Fee Receipt</h1>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr>
        <td valign="top" style="font-size:13px;color:#555;line-height:1.9">Trackage Scheme,<br>Flat 1, Clover,<br>Triq il-Konti Manduca,<br>Naxxar Gardens,<br>Naxxar, NXR 1123<br>Malta</td>
        <td valign="top" align="right" style="font-size:13px;color:#555;line-height:1.9">+356 79203176<br><a href="https://shop.trackagescheme.com" style="color:#0a9e7f">shop.trackagescheme.com</a><br><a href="mailto:team@trackagescheme.com" style="color:#0a9e7f">team@trackagescheme.com</a><br>VAT: 2573-6412<br>EXO: 5567</td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e6;border-radius:8px;overflow:hidden;margin-bottom:28px">
      <tr>
        <td width="50%" style="padding:12px 16px;border-bottom:1px solid #f0f0f0;border-right:1px solid #f0f0f0">
          <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Receipt no.</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;font-family:monospace">${receiptNo}</p>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0">
          <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Event name</p>
          <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${event?.name || '—'}</p>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:12px 16px;border-right:1px solid #f0f0f0">
          <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Date</p>
          <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${dateStr}</p>
        </td>
        <td style="padding:12px 16px">
          <p style="margin:0 0 3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999">Name</p>
          <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a">${name}</p>
        </td>
      </tr>
    </table>
    <h2 style="margin:0 0 14px;font-size:17px;font-weight:700;color:#1a1a1a">Items</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e6;border-radius:8px;overflow:hidden;margin-bottom:16px">
      <thead><tr style="background:#f9f9f9">
        <th align="left"   style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em;border-bottom:1px solid #e8e8e6">Description</th>
        <th align="center" style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em;border-bottom:1px solid #e8e8e6">Qty</th>
        <th align="right"  style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em;border-bottom:1px solid #e8e8e6">Unit price</th>
        <th align="right"  style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em;border-bottom:1px solid #e8e8e6">VAT (0% Exempt)</th>
        <th align="right"  style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em;border-bottom:1px solid #e8e8e6">Total</th>
      </tr></thead>
      <tbody><tr>
        <td style="padding:12px 14px;font-size:13px;color:#1a1a1a">Booking Fee</td>
        <td align="center" style="padding:12px 14px;font-size:13px;color:#555">1</td>
        <td align="right"  style="padding:12px 14px;font-size:13px;color:#555">${fmt(fee)}</td>
        <td align="right"  style="padding:12px 14px;font-size:13px;color:#555">€0.00</td>
        <td align="right"  style="padding:12px 14px;font-size:13px;font-weight:700;color:#1a1a1a">${fmt(fee)}</td>
      </tr></tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr><td></td><td width="220">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:13px;color:#555">Sub Total</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">${fmt(fee)}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:#555">VAT Total</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">€0.00</td></tr>
          <tr>
            <td style="padding:8px 0;font-size:15px;font-weight:700;color:#1a1a1a;border-top:2px solid #e8e8e6">Total</td>
            <td align="right" style="padding:8px 0;font-size:15px;font-weight:700;color:#0a9e7f;border-top:2px solid #e8e8e6">${fmt(fee)}</td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr></table>
  ${FOOTER_DISCLAIMER}
  ${POWERED_BY}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════════
   3. ADMIN NEW ORDER NOTIFICATION
   ═══════════════════════════════════════════════════════════════════ */
export async function adminNewOrderEmail({ order, event, orderItems }) {
  const orderRef = (order.id || '').slice(0, 8).toUpperCase();
  const fee      = order.booking_fee || 0;
  const discount = order.discount || 0;
  const logoUrl  = await getLogoURL();
  const header   = makeHeader(logoUrl);

  const itemRows = (orderItems || []).map(item => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a">${item.ticket_name}</td>
      <td align="center" style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555">${item.quantity}</td>
      <td align="right"  style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#0a9e7f">${fmt((item.unit_price||0)*(item.quantity||1))}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f5f5f3}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3"><tr><td align="center" style="padding:24px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>
  ${header}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:18px 28px">
      <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#fff">💰 New order received</p>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45)">#${orderRef} · ${event?.name || ''}</p>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 28px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e6;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <tr style="background:#f9f9f9">
        <td style="padding:10px 14px;border-bottom:1px solid #e8e8e6;border-right:1px solid #e8e8e6">
          <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.08em">Total</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:#0a9e7f">${fmt(order.total)}</p>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e8e6">
          <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.08em">Customer</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#1a1a1a">${order.customer_name || '—'}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#666">${order.customer_email || ''}</p>
        </td>
      </tr>
      <tr><td colspan="2" style="padding:10px 14px">
        <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.08em">Event</p>
        <p style="margin:0;font-size:14px;font-weight:600;color:#1a1a1a">${event?.name || '—'}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e6;border-radius:8px;overflow:hidden;margin-bottom:20px">
      <thead><tr style="background:#f9f9f9">
        <th align="left"   style="padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Ticket</th>
        <th align="center" style="padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Qty</th>
        <th align="right"  style="padding:9px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Total</th>
      </tr></thead>
      <tbody>
        ${itemRows}
        ${fee > 0 ? `<tr><td style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;color:#555">Booking fee</td><td align="center" style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;color:#555">1</td><td align="right" style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;color:#555">${fmt(fee)}</td></tr>` : ''}
        ${discount > 0 ? `<tr><td colspan="2" style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;color:#0a9e7f">Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}</td><td align="right" style="padding:10px 14px;border-top:1px solid #f0f0f0;font-size:13px;color:#0a9e7f">−${fmt(discount)}</td></tr>` : ''}
      </tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/orders" style="display:inline-block;background:#0a0a0a;color:#fff;padding:11px 28px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">View order in admin →</a>
    </td></tr></table>
  </td></tr></table>
  ${POWERED_BY}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════════
   4. ORGANISER WELCOME EMAIL
   ═══════════════════════════════════════════════════════════════════ */
export async function organiserWelcomeEmail({ name, email, inviteUrl }) {
  const logoUrl = await getLogoURL();
  const header  = makeHeader(logoUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f5f5f3}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3"><tr><td align="center" style="padding:24px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>
  ${header}

  <!-- HERO -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:28px 32px">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#48C16E">Welcome aboard</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3">Your organiser account<br>is ready, ${name.split(' ')[0]}.</p>
    </td></tr>
  </table>

  <!-- BODY -->
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 32px">

    <p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.6">
      Your Trackage Scheme organiser account has been created. Click the button below to set your password and access the organiser portal.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#999;line-height:1.5">
      Your email address is: <strong style="color:#1a1a1a">${email}</strong>
    </p>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td align="center">
        <a href="${inviteUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.01em">Set your password →</a>
      </td></tr>
    </table>

    <p style="margin:0 0 6px;font-size:13px;color:#999;text-align:center">Or copy this link:</p>
    <p style="margin:0;font-size:12px;color:#0a9e7f;text-align:center;word-break:break-all"><a href="${inviteUrl}" style="color:#0a9e7f">${inviteUrl}</a></p>

    <!-- DIVIDER -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr><td style="height:1px;background:#f0f0f0;font-size:1px;line-height:1px">&nbsp;</td></tr>
    </table>

    <p style="margin:0 0 12px;font-size:12px;color:#999;line-height:1.6">
      This link expires after 24 hours. If you have any questions, contact <a href="mailto:team@trackagescheme.com" style="color:#0a9e7f">team@trackagescheme.com</a>.
    </p>

  </td></tr></table>

  ${POWERED_BY}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function reviewRequestEmail({ name, eventName }) {
  const reviewUrl = 'https://g.page/r/CTm6bsLP-vDTEBM/review';
  const [logoUrl, qrUrl] = await Promise.all([
    getLogoURL(),
    generateQRPublicURL(reviewUrl, 'google-review'),
  ]);
  const header    = makeHeader(logoUrl);
  const firstName = (name || 'there').split(' ')[0];
  const eventLine = eventName
    ? `<p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6">We hope you enjoyed <strong style="color:#1a1a1a">${eventName}</strong> and that buying your ticket through Trackage Scheme was quick and easy.</p>`
    : `<p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6">We hope your recent ticket purchase through Trackage Scheme was quick and easy.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f5f5f3}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}img{border:0}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3"><tr><td align="center" style="padding:24px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>
  ${header}

  <!-- HERO -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:28px 32px">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#48C16E">Quick favour</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3">How was your experience,<br>${firstName}?</p>
    </td></tr>
  </table>

  <!-- BODY -->
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 32px">

    ${eventLine}

    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6">
      If you have a moment, we'd really appreciate it if you could leave us a short review on Google. It helps other event-goers discover us and only takes a minute.
    </p>

    <!-- STARS + CTA BUTTON -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
      <tr><td align="center">
        <a href="${reviewUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:13px 36px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.01em">Leave a Google review →</a>
      </td></tr>
    </table>

    <!-- DIVIDER WITH OR -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="height:1px;background:#f0f0f0;font-size:1px;line-height:1px"></td>
        <td style="padding:0 14px;white-space:nowrap;font-size:11px;font-weight:700;color:#bbb;text-transform:uppercase;letter-spacing:0.1em">or scan</td>
        <td style="height:1px;background:#f0f0f0;font-size:1px;line-height:1px"></td>
      </tr>
    </table>

    <!-- QR CODE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td align="center">
        <a href="${reviewUrl}">
          <img src="${qrUrl}" width="160" height="160" alt="Scan to leave a Google review" style="display:block;border:1px solid #f0f0f0;border-radius:8px;padding:8px;background:#fff" />
        </a>
        <p style="margin:10px 0 0;font-size:12px;color:#999">Scan with your phone camera</p>
      </td></tr>
    </table>

    <!-- DIVIDER -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
      <tr><td style="height:1px;background:#f0f0f0;font-size:1px;line-height:1px">&nbsp;</td></tr>
    </table>

    <p style="margin:0;font-size:12px;color:#bbb;line-height:1.6;text-align:center">
      Thanks for using Trackage Scheme. We're always working to make the experience better.<br>
      Questions? Reach us at <a href="mailto:team@trackagescheme.com" style="color:#0a9e7f">team@trackagescheme.com</a>
    </p>

  </td></tr></table>

  ${POWERED_BY}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* backward compat aliases */
export { ticketConfirmationEmail as buyerConfirmationEmail };
