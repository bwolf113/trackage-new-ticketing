/* app/api/weekly-digest/route.js
   Sends weekly sales digest to each organiser.
   Call via Vercel Cron: POST /api/weekly-digest
   Protected by CRON_SECRET env var.
*/
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../lib/sendEmail';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? '+100%' : '—';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
}

function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + mondayOffset);
  thisMonday.setHours(0, 0, 0, 0);

  const start = new Date(thisMonday);
  start.setDate(start.getDate() - (weeksAgo + 1) * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function fetchWeekOrders(supabase, start, end) {
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, total, booking_fee, event_id, organiser_id,
      events(name, organiser_id, organisers(id, name, email)),
      order_items(quantity)
    `)
    .eq('status', 'completed')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  return orders || [];
}

function groupByOrganiser(orders) {
  const byOrg = {};
  for (const order of orders) {
    // Resolve organiser from order directly, or fall back to event's organiser
    const org = order.events?.organisers || {};
    const orgId = order.organiser_id || org.id;
    const orgName = org.name;
    const orgEmail = org.email;
    if (!orgId || !orgEmail) continue;

    if (!byOrg[orgId]) byOrg[orgId] = { name: orgName, email: orgEmail, events: {}, totalRevenue: 0, totalOrders: 0, totalTickets: 0 };

    const eventName = order.events?.name || '—';
    const faceValue = parseFloat(order.total || 0) - parseFloat(order.booking_fee || 0);
    const tickets = (order.order_items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

    if (!byOrg[orgId].events[eventName]) byOrg[orgId].events[eventName] = { revenue: 0, orders: 0, tickets: 0 };
    byOrg[orgId].events[eventName].revenue += faceValue;
    byOrg[orgId].events[eventName].orders += 1;
    byOrg[orgId].events[eventName].tickets += tickets;

    byOrg[orgId].totalRevenue += faceValue;
    byOrg[orgId].totalOrders += 1;
    byOrg[orgId].totalTickets += tickets;
  }
  return byOrg;
}

export async function POST(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(1);

  const [thisWeekOrders, lastWeekOrders] = await Promise.all([
    fetchWeekOrders(supabase, thisWeek.start, thisWeek.end),
    fetchWeekOrders(supabase, lastWeek.start, lastWeek.end),
  ]);

  if (!thisWeekOrders.length) {
    console.log('No orders this week, skipping weekly digest');
    return Response.json({ sent: 0 });
  }

  const currentByOrg = groupByOrganiser(thisWeekOrders);
  const previousByOrg = groupByOrganiser(lastWeekOrders);

  const dateOpts = { day: 'numeric', month: 'long', timeZone: 'Europe/Malta' };
  const startLabel = thisWeek.start.toLocaleDateString('en-MT', dateOpts);
  const endLabel = thisWeek.end.toLocaleDateString('en-MT', { ...dateOpts, year: 'numeric' });
  const dateRange = `${startLabel} – ${endLabel}`;

  let sent = 0;

  for (const [orgId, org] of Object.entries(currentByOrg)) {
    const prev = previousByOrg[orgId] || { totalRevenue: 0, totalOrders: 0, totalTickets: 0 };
    const revChange = pctChange(org.totalRevenue, prev.totalRevenue);
    const orderChange = pctChange(org.totalOrders, prev.totalOrders);
    const ticketChange = pctChange(org.totalTickets, prev.totalTickets);

    const eventRows = Object.entries(org.events)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([eventName, ev]) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a">${eventName}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;text-align:center">${ev.orders}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;text-align:center">${ev.tickets}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#0a9e7f;text-align:right">${fmt(ev.revenue)}</td>
        </tr>
      `).join('');

    const html = `<!DOCTYPE html>
<html>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#f5f5f5;padding:32px 16px">
<div style="max-width:560px;margin:0 auto">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;color:#0a0a0a">Trackage Scheme</div>
    <div style="font-size:11px;color:#999;margin-top:3px;letter-spacing:0.08em;text-transform:uppercase">Weekly Sales Digest</div>
  </div>
  <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
    <div style="background:#0a0a0a;padding:22px 28px">
      <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:4px">Hi ${org.name},</div>
      <div style="font-size:18px;font-weight:700;color:#fff">Your sales for ${dateRange}</div>
    </div>
    <div style="padding:24px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td width="33%" style="padding:0 4px 0 0">
            <div style="background:#f0fdf9;border-radius:10px;padding:16px;text-align:center">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#065f46;margin-bottom:6px">Revenue</div>
              <div style="font-size:24px;font-weight:700;color:#0a9e7f">${fmt(org.totalRevenue)}</div>
              <div style="font-size:11px;color:#065f46;margin-top:4px">${revChange} vs last week</div>
            </div>
          </td>
          <td width="34%" style="padding:0 4px">
            <div style="background:#f9f9f9;border-radius:10px;padding:16px;text-align:center">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#999;margin-bottom:6px">Orders</div>
              <div style="font-size:24px;font-weight:700;color:#1a1a1a">${org.totalOrders}</div>
              <div style="font-size:11px;color:#666;margin-top:4px">${orderChange} vs last week</div>
            </div>
          </td>
          <td width="33%" style="padding:0 0 0 4px">
            <div style="background:#f5f3ff;border-radius:10px;padding:16px;text-align:center">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#5b21b6;margin-bottom:6px">Tickets Sold</div>
              <div style="font-size:24px;font-weight:700;color:#7c3aed">${org.totalTickets}</div>
              <div style="font-size:11px;color:#5b21b6;margin-top:4px">${ticketChange} vs last week</div>
            </div>
          </td>
        </tr>
      </table>
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:12px">By event</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9f9f9">
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Event</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Orders</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Tickets</th>
            <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:0.06em">Revenue</th>
          </tr>
        </thead>
        <tbody>${eventRows}</tbody>
      </table>
    </div>
    <div style="background:#f9f9f9;border-top:1px solid #f0f0f0;padding:14px 28px;text-align:center">
      <div style="font-size:11px;color:#bbb">© ${new Date().getFullYear()} Trackage Scheme · Sent automatically each Monday</div>
    </div>
  </div>
</div>
</body>
</html>`;

    await sendEmail({
      to: org.email,
      subject: `📊 Weekly sales digest — ${dateRange} — ${fmt(org.totalRevenue)}`,
      html,
    });
    sent++;
    console.log(`Weekly digest sent to ${org.email}`);
  }

  return Response.json({ sent, organiserCount: Object.keys(currentByOrg).length });
}
