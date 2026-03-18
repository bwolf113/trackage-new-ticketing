/* app/api/review-request/route.js
   Sends a review-request email to every customer who completed an order yesterday
   and hasn't yet received one. Called daily by Vercel Cron (GET) or manually (POST).
   Protected by CRON_SECRET env var.
*/
import { createClient } from '@supabase/supabase-js';
import { sendEmail, reviewRequestEmail } from '../../../lib/sendEmail';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function checkAuth(req) {
  const secret = process.env.CRON_SECRET;
  const auth   = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

async function run({ today = false } = {}) {
  const supabase = adminSupabase();

  // Use today's window if ?today=1, otherwise yesterday (production behaviour)
  const now    = new Date();
  const target = new Date(now);
  if (!today) target.setDate(target.getDate() - 1);
  const start = new Date(target.setHours(0, 0, 0, 0)).toISOString();
  const end   = new Date(target.setHours(23, 59, 59, 999)).toISOString();

  console.log(`[review-request] Event end_time window: ${start} → ${end}${today ? ' (test mode: today)' : ''}`);

  // Step 1: find events that ended during the target day
  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('id, name')
    .gte('end_time', start)
    .lte('end_time', end);

  if (eventsErr) throw new Error(eventsErr.message);
  if (!events?.length) {
    console.log('[review-request] No events ended in the target window.');
    return { sent: 0, window: { start, end }, testMode: today };
  }

  const eventIds = events.map(e => e.id);
  const eventNameById = Object.fromEntries(events.map(e => [e.id, e.name]));

  // Step 2: completed orders for those events, not yet sent a review email
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, event_id')
    .eq('status', 'completed')
    .in('event_id', eventIds)
    .is('review_email_sent_at', null)
    .not('customer_email', 'is', null);

  if (error) throw new Error(error.message);
  if (!orders?.length) {
    console.log('[review-request] No eligible orders found.');
    return { sent: 0, window: { start, end }, testMode: today };
  }

  let sent = 0;
  for (const order of orders) {
    try {
      const html = await reviewRequestEmail({
        name:      order.customer_name              || 'there',
        eventName: eventNameById[order.event_id]   || null,
      });
      await sendEmail({
        to:      order.customer_email,
        subject: 'How was your experience with Trackage Scheme?',
        html,
      });

      // Mark as sent so we never double-send
      await supabase
        .from('orders')
        .update({ review_email_sent_at: new Date().toISOString() })
        .eq('id', order.id);

      sent++;
      console.log(`[review-request] Sent to ${order.customer_email}`);
    } catch (err) {
      console.error(`[review-request] Failed for order ${order.id}:`, err.message);
    }
  }

  return { sent, total: orders.length, testMode: today };
}

// Vercel Cron calls GET
export async function GET(req) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    const today  = searchParams.get('today') === '1';
    const result = await run({ today });
    return Response.json(result);
  } catch (err) {
    console.error('[review-request]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Allow manual POST trigger too (same pattern as daily-summary)
export async function POST(req) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    const today  = searchParams.get('today') === '1';
    const result = await run({ today });
    return Response.json(result);
  } catch (err) {
    console.error('[review-request]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
