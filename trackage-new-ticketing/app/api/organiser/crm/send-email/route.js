/* app/api/organiser/crm/send-email/route.js
   POST — send a broadcast email to a segment of attendees
   Body: { organiser_id, segment, event_id?, subject, message }
   Segments: all | per_event | loyal | local | foreign
*/
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../../../lib/sendEmail';

function adminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isMaltese(phone) {
  if (!phone) return false;
  const p = phone.replace(/[\s\-()]/g, '');
  return p.startsWith('+356') || p.startsWith('00356') || /^[279]\d{7}$/.test(p);
}

function broadcastHtml({ organiserName, subject, message, eventName }) {
  const year    = new Date().getFullYear();
  const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f5f5f3}table{border-collapse:collapse}img{border:0}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<tr><td>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a">
    <tr><td style="padding:22px 32px;text-align:center">
      <p style="margin:0;font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.08em">${organiserName}</p>
      <p style="margin:5px 0 0;font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.08em;text-transform:uppercase">via Trackage Scheme</p>
    </td></tr>
  </table>

  ${eventName ? `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a9e7f">
    <tr><td style="padding:10px 32px">
      <p style="margin:0;font-size:12px;font-weight:600;color:#fff;letter-spacing:0.02em">🎫 ${eventName}</p>
    </td></tr>
  </table>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:32px 32px 28px">
      <h1 style="margin:0 0 22px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3">${subject}</h1>
      <div style="font-size:14px;color:#444;line-height:1.8;white-space:pre-wrap">${escaped}</div>
    </td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-top:1px solid #f0f0f0">
    <tr><td style="padding:14px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#bbb">© ${year} Trackage Scheme · <a href="https://shop.trackagescheme.com" style="color:#bbb">shop.trackagescheme.com</a></p>
    </td></tr>
  </table>

</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { organiser_id, segment, event_id, subject, message } = body;

    if (!organiser_id)    return Response.json({ error: 'organiser_id required' }, { status: 400 });
    if (!segment)         return Response.json({ error: 'segment required' },      { status: 400 });
    if (!subject?.trim()) return Response.json({ error: 'subject required' },      { status: 400 });
    if (!message?.trim()) return Response.json({ error: 'message required' },      { status: 400 });

    const supabase = adminSupabase();

    const { data: organiser } = await supabase
      .from('organisers').select('id, name').eq('id', organiser_id).single();
    if (!organiser) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { data: events } = await supabase
      .from('events').select('id, name').eq('organiser_id', organiser_id);
    if (!events?.length) return Response.json({ sent: 0, failed: 0, total: 0 });

    const eventIds = events.map(e => e.id);
    const eventMap = Object.fromEntries(events.map(e => [e.id, e.name]));

    let q = supabase
      .from('orders')
      .select('customer_email, customer_name, customer_phone, event_id')
      .eq('status', 'completed')
      .eq('marketing_consent', true);

    if (segment === 'per_event' && event_id) {
      q = q.eq('event_id', event_id);
    } else {
      q = q.in('event_id', eventIds);
    }

    const { data: orders } = await q;
    const allOrders = orders || [];

    let recipients = [];

    if (segment === 'all' || segment === 'per_event') {
      const seen = new Set();
      for (const o of allOrders) {
        if (o.customer_email && !seen.has(o.customer_email)) {
          seen.add(o.customer_email);
          recipients.push({ email: o.customer_email, name: o.customer_name });
        }
      }
    } else if (segment === 'loyal') {
      const evtsByEmail  = {};
      const nameByEmail  = {};
      for (const o of allOrders) {
        if (!o.customer_email) continue;
        if (!evtsByEmail[o.customer_email]) evtsByEmail[o.customer_email] = new Set();
        evtsByEmail[o.customer_email].add(o.event_id);
        nameByEmail[o.customer_email] = o.customer_name;
      }
      for (const [email, evts] of Object.entries(evtsByEmail)) {
        if (evts.size > 3) recipients.push({ email, name: nameByEmail[email] });
      }
    } else if (segment === 'local') {
      const seen = new Set();
      for (const o of allOrders) {
        if (o.customer_email && !seen.has(o.customer_email) && isMaltese(o.customer_phone)) {
          seen.add(o.customer_email);
          recipients.push({ email: o.customer_email, name: o.customer_name });
        }
      }
    } else if (segment === 'foreign') {
      const seen = new Set();
      for (const o of allOrders) {
        if (o.customer_email && !seen.has(o.customer_email) && o.customer_phone && !isMaltese(o.customer_phone)) {
          seen.add(o.customer_email);
          recipients.push({ email: o.customer_email, name: o.customer_name });
        }
      }
    }

    if (!recipients.length) {
      return Response.json({ sent: 0, failed: 0, total: 0, message: 'No recipients found for this segment' });
    }

    const eventName = segment === 'per_event' && event_id ? eventMap[event_id] : null;
    const html      = broadcastHtml({ organiserName: organiser.name, subject, message, eventName });

    let sent = 0, failed = 0;
    for (const { email } of recipients) {
      const r = await sendEmail({ to: email, subject, html });
      if (r.success) sent++; else failed++;
    }

    return Response.json({ sent, failed, total: recipients.length });
  } catch (err) {
    console.error('CRM send-email error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
