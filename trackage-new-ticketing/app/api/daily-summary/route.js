/* app/api/daily-summary/route.js
   Sends daily sales summary to each organiser.
   Call this via a cron job or manually: POST /api/daily-summary
   Protected by CRON_SECRET env var.
*/
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../lib/sendEmail';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export async function POST(req) {
  // Auth check — always required
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get yesterday's date range
  const now       = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const start     = new Date(yesterday.setHours(0,0,0,0)).toISOString();
  const end       = new Date(yesterday.setHours(23,59,59,999)).toISOString();

  // Fetch completed orders from yesterday
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, booking_fee, event_id, organiser_id, customer_name, events(name), organisers(id, name, email)')
    .eq('status', 'completed')
    .gte('created_at', start)
    .lte('created_at', end);

  if (!orders?.length) {
    console.log('No orders yesterday, skipping daily summary');
    return Response.json({ sent: 0 });
  }

  // Group by organiser
  const byOrg = {};
  for (const order of orders) {
    const orgId   = order.organiser_id || order.organisers?.id;
    const orgName = order.organisers?.name;
    const orgEmail = order.organisers?.email;
    if (!orgId || !orgEmail) continue;
    if (!byOrg[orgId]) byOrg[orgId] = { name: orgName, email: orgEmail, orders: [], revenue: 0 };
    byOrg[orgId].orders.push(order);
    byOrg[orgId].revenue += order.total || 0;
  }

  let sent = 0;
  const dateLabel = yesterday.toLocaleDateString('en-MT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Malta' });

  for (const [, org] of Object.entries(byOrg)) {
    const orderRows = org.orders.map(o => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a">${o.events?.name || '—'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555">${o.customer_name || '—'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#0a9e7f;text-align:right">${fmt(o.total)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;padding:32px 16px">
<div style="max-width:560px;margin:0 auto">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;color:#0a0a0a">Trackage Scheme</div>
    <div style="font-size:11px;color:#999;margin-top:3px;letter-spacing:0.08em;text-transform:uppercase">Daily Sales Summary</div>
  </div>
  <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
    <div style="background:#0a0a0a;padding:22px 28px">
      <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:4px">Hi ${org.name},</div>
      <div style="font-size:18px;font-weight:700;color:#fff">Your sales for ${dateLabel}</div>
    </div>
    <div style="padding:24px 28px">
      <div style="display:flex;gap:12px;margin-bottom:24px">
        <div style="flex:1;background:#f0fdf9;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#065f46;margin-bottom:6px">Revenue</div>
          <div style="font-size:24px;font-weight:700;color:#0a9e7f">${fmt(org.revenue)}</div>
        </div>
        <div style="flex:1;background:#f9f9f9;border-radius:10px;padding:16px;text-align:center">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999;margin-bottom:6px">Orders</div>
          <div style="font-size:24px;font-weight:700;color:#1a1a1a">${org.orders.length}</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:12px">Order breakdown</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9f9f9">
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Event</th>
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Customer</th>
            <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Total</th>
          </tr>
        </thead>
        <tbody>${orderRows}</tbody>
      </table>
    </div>
    <div style="background:#f9f9f9;border-top:1px solid #f0f0f0;padding:14px 28px;text-align:center">
      <div style="font-size:11px;color:#bbb">© ${new Date().getFullYear()} Trackage Scheme · Sent automatically each morning</div>
    </div>
  </div>
</div>
</body>
</html>`;

    await sendEmail({
      to:      org.email,
      subject: `📊 Daily sales summary — ${dateLabel} — ${fmt(org.revenue)}`,
      html,
    });
    sent++;
    console.log(`Daily summary sent to ${org.email}`);
  }

  return Response.json({ sent, organiserCount: Object.keys(byOrg).length });
}
