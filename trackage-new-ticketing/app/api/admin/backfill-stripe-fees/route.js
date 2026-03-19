/* app/api/admin/backfill-stripe-fees/route.js
   POST — one-time backfill of stripe_fee on completed orders.
   Fetches actual fee from Stripe balance_transaction for each order
   that has a payment_intent but no stripe_fee yet.
*/
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getStripeKey(supabase) {
  let key = process.env.STRIPE_SECRET_KEY;
  try {
    const { data: setting } = await supabase
      .from('settings').select('value').eq('key', 'stripe').single();
    if (setting?.value) {
      const cfg  = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      const mode = cfg.active_mode || 'test';
      if (cfg[mode]?.secret_key) key = cfg[mode].secret_key;
    }
  } catch {}
  return key;
}

export async function POST(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const supabase = adminSupabase();
  const stripeKey = await getStripeKey(supabase);
  if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

  const stripe = new Stripe(stripeKey);

  // Fetch completed orders with a payment intent but no stripe_fee
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, stripe_payment_intent')
    .eq('status', 'completed')
    .not('stripe_payment_intent', 'is', null)
    .is('stripe_fee', null);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!orders?.length) return Response.json({ message: 'No orders to backfill', updated: 0 });

  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const order of orders) {
    try {
      const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent, {
        expand: ['latest_charge.balance_transaction'],
      });
      const fee = pi.latest_charge?.balance_transaction?.fee;
      if (typeof fee === 'number') {
        await supabase.from('orders')
          .update({ stripe_fee: fee / 100 })
          .eq('id', order.id);
        updated++;
      } else {
        failed++;
        errors.push({ order_id: order.id, reason: 'no fee on balance_transaction' });
      }
    } catch (err) {
      failed++;
      errors.push({ order_id: order.id, reason: err.message });
    }
  }

  return Response.json({ total: orders.length, updated, failed, errors });
}
