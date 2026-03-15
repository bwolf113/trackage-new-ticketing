/* app/api/checkout/route.js */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Supabase env vars not configured' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── Get Stripe secret key from Supabase settings (same as admin page uses) ──
    let stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    try {
      const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'stripe')
        .single();

      if (setting?.value) {
        const stripeConfig = typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value;
        const mode = stripeConfig.active_mode || 'test';
        const modeKeys = stripeConfig[mode];
        if (modeKeys?.secret_key) {
          stripeSecretKey = modeKeys.secret_key;
        }
      }
    } catch (e) {
      // Fall back to .env.local key
      console.log('Using .env.local Stripe key (Supabase settings not found)');
    }

    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe secret key not configured' }, { status: 500 });
    }

    // Log key info for debugging (first/last 8 chars only, never log full key)
    console.log('Using Stripe key:', stripeSecretKey.slice(0,12) + '...' + stripeSecretKey.slice(-4));
    console.log('Key length:', stripeSecretKey.length);
    console.log('Key prefix valid:', stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_'));

    const stripe = new Stripe(stripeSecretKey);

    const body = await req.json();
    const {
      event_id, event_name, line_items, subtotal,
      booking_fee, discount, total, coupon_code, coupon_id,
      customer_email, customer_name, customer_phone,
      marketing_consent,
      success_url, cancel_url,
    } = body;

    if (!line_items?.length) {
      return Response.json({ error: 'No tickets selected' }, { status: 400 });
    }

    // ── Re-fetch ticket prices server-side ────────────────────────
    const ticketIds = line_items.map(i => i.ticket_id).filter(Boolean);
    if (ticketIds.length !== line_items.length) {
      return Response.json({ error: 'Invalid ticket selection' }, { status: 400 });
    }
    const { data: dbTickets } = await supabase
      .from('tickets')
      .select('id, name, price, booking_fee_pct, status, inventory, sold')
      .in('id', ticketIds);
    const ticketMap = Object.fromEntries((dbTickets || []).map(t => [t.id, t]));

    const validatedItems = [];
    for (const item of line_items) {
      const dbTicket = ticketMap[item.ticket_id];
      if (!dbTicket) return Response.json({ error: 'Ticket not found' }, { status: 400 });
      if (dbTicket.status && dbTicket.status !== 'active') {
        return Response.json({ error: `"${dbTicket.name}" is no longer available` }, { status: 400 });
      }
      // Check per-ticket inventory
      if (dbTicket.inventory != null) {
        const remaining = dbTicket.inventory - (dbTicket.sold || 0);
        if ((item.quantity || 1) > remaining) {
          return Response.json({ error: `Only ${remaining} of "${dbTicket.name}" remaining` }, { status: 400 });
        }
      }
      validatedItems.push({
        ...item,
        ticket_name: dbTicket.name,
        unit_price:  dbTicket.price,
        booking_fee_pct: dbTicket.booking_fee_pct || 0,
      });
    }

    const serverSubtotal = validatedItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const serverBookingFee = +validatedItems.reduce((sum, i) =>
      sum + i.unit_price * i.quantity * (i.booking_fee_pct / 100), 0).toFixed(2);

    // ── Re-validate coupon server-side ────────────────────────────
    let serverDiscount = 0;
    let verifiedCouponId = null;
    let verifiedCouponCode = null;
    if (coupon_id || coupon_code) {
      const couponQuery = supabase
        .from('coupons')
        .select('id, code, discount_type, discount_value, expires_at, usage_limit, usage_count, event_ids');
      const { data: dbCoupon } = coupon_id
        ? await couponQuery.eq('id', coupon_id).single()
        : await couponQuery.eq('code', (coupon_code || '').trim().toUpperCase()).single();
      if (dbCoupon) {
        const now = new Date();
        const valid =
          (!dbCoupon.expires_at || new Date(dbCoupon.expires_at) > now) &&
          (!dbCoupon.usage_limit || (dbCoupon.usage_count || 0) < dbCoupon.usage_limit) &&
          (!dbCoupon.event_ids?.length || (event_id && dbCoupon.event_ids.includes(event_id)));
        if (valid) {
          serverDiscount = dbCoupon.discount_type === 'percent'
            ? +(serverSubtotal * dbCoupon.discount_value / 100).toFixed(2)
            : Math.min(dbCoupon.discount_value, serverSubtotal);
          verifiedCouponId   = dbCoupon.id;
          verifiedCouponCode = dbCoupon.code;
        }
      }
    }

    const serverTotal = Math.max(0, serverSubtotal + serverBookingFee - serverDiscount);

    // ── Daily capacity validation (multi-day events) ─────────────
    if (event_id) {
      const { data: eventDays } = await supabase
        .from('event_days')
        .select('id, name, capacity')
        .eq('event_id', event_id);

      if (eventDays?.length > 0) {
        // Fetch all tickets for this event to know their day assignments + current sold counts
        const { data: allTickets } = await supabase
          .from('tickets')
          .select('id, event_day_id, sold')
          .eq('event_id', event_id);

        const ticketMap = Object.fromEntries((allTickets || []).map(t => [t.id, t]));

        for (const day of eventDays) {
          if (!day.capacity) continue; // no daily limit set

          // Current occupancy for this day = day-specific tickets sold + festival pass tickets sold
          const currentOccupancy = (allTickets || []).reduce((sum, t) => {
            if (t.event_day_id === day.id || t.event_day_id === null) {
              return sum + (t.sold || 0);
            }
            return sum;
          }, 0);

          // Quantity being purchased that applies to this day
          const purchasingForDay = line_items.reduce((sum, li) => {
            const ticket = ticketMap[li.ticket_id];
            if (!ticket) return sum;
            if (ticket.event_day_id === day.id || ticket.event_day_id === null) {
              return sum + (li.quantity || 0);
            }
            return sum;
          }, 0);

          if (currentOccupancy + purchasingForDay > day.capacity) {
            const dayName = day.name || 'this day';
            const remaining = Math.max(0, day.capacity - currentOccupancy);
            return Response.json({
              error: `Sorry, only ${remaining} spot${remaining !== 1 ? 's' : ''} remaining for ${dayName}. Please reduce your quantity and try again.`,
            }, { status: 400 });
          }
        }
      }
    }

    // ── Build Stripe line items ──────────────────────────────────
    const stripeLineItems = validatedItems.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${item.ticket_name} — ${event_name}`,
          metadata: { ticket_id: item.ticket_id, event_id },
        },
        unit_amount: Math.round(item.unit_price * 100),
      },
      quantity: item.quantity,
    }));

    if (serverBookingFee > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Booking fee' },
          unit_amount: Math.round(serverBookingFee * 100),
        },
        quantity: 1,
      });
    }

    // ── Create pending order in Supabase ─────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id,
        status:         'pending_payment',
        total:          serverTotal,
        booking_fee:    serverBookingFee,
        discount:       serverDiscount,
        coupon_id:      verifiedCouponId   || null,
        coupon_code:    verifiedCouponCode || null,
        customer_email:    customer_email    || null,
        customer_name:     customer_name     || null,
        customer_phone:    customer_phone    || null,
        marketing_consent: marketing_consent || false,
        created_at:        new Date().toISOString(),
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('Order insert error:', orderError);
      return Response.json({ error: orderError.message }, { status: 500 });
    }

    const orderId = order.id;

    // Insert order items
    const { error: itemsError } = await supabase.from('order_items').insert(
      validatedItems.map(item => ({
        order_id:    orderId,
        ticket_name: item.ticket_name || null,
        quantity:    item.quantity    || 1,
        unit_price:  item.unit_price  || 0,
      }))
    );
    if (itemsError) {
      console.error('order_items insert error:', itemsError);
    } else {
      console.log(`Inserted ${line_items.length} order_item(s) for order ${orderId}`);
    }

    // ── Create Stripe Checkout Session ───────────────────────────
    const sessionParams = {
      payment_method_types: ['card'],
      line_items:           stripeLineItems,
      mode:                 'payment',
      success_url,
      cancel_url,
      metadata: {
        order_id:          orderId,
        event_id:          event_id || '',
        coupon_code:       coupon_code || '',
        marketing_consent: marketing_consent ? '1' : '0',
      },
      payment_intent_data: {
        metadata: { order_id: orderId },
      },
    };

    if (customer_email) sessionParams.customer_email = customer_email;

    const session = await stripe.checkout.sessions.create(sessionParams);

    await supabase.from('orders').update({ stripe_session_id: session.id }).eq('id', orderId);

    return Response.json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return Response.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
