/* app/api/admin/stripe-refund/route.js
   POST { order_id, amount_cents? }
   amount_cents omitted → full refund
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
  try {
    const { order_id, amount_cents } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

    const supabase = adminSupabase();

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, total, stripe_payment_intent')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.status === 'refunded') return Response.json({ error: 'Order already refunded' }, { status: 400 });
    if (!order.stripe_payment_intent) return Response.json({ error: 'No Stripe payment intent on this order' }, { status: 400 });

    const stripeKey = await getStripeKey(supabase);
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const stripe = new Stripe(stripeKey);

    // Build refund params
    const refundParams = { payment_intent: order.stripe_payment_intent };
    if (amount_cents) refundParams.amount = amount_cents; // partial refund

    const refund = await stripe.refunds.create(refundParams);

    // Mark order refunded in Supabase
    await supabase.from('orders')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', order_id);

    const refundedEuros = (refund.amount / 100).toFixed(2);
    return Response.json({ success: true, refunded_amount: refundedEuros, refund_id: refund.id });
  } catch (err) {
    // Stripe errors have err.message with a human-readable description
    return Response.json({ error: err.message }, { status: 500 });
  }
}
