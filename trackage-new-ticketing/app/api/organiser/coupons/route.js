import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../lib/organiserAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET — list coupons for this organiser's events
export async function GET(req) {
  const { organiser, error } = await getOrganiserFromRequest(req);
  if (error) return error;

  // Get the organiser's event IDs
  const { data: orgEvents } = await supabase
    .from('events')
    .select('id')
    .eq('organiser_id', organiser.id);

  const orgEventIds = (orgEvents || []).map(e => e.id);

  // Get coupons that are bound to at least one of this organiser's events
  // Also get all events for the event-binding UI
  const [{ data: coupons }, { data: events }] = await Promise.all([
    supabase.from('coupons').select('*').order('created_at', { ascending: false }),
    supabase.from('events').select('id, name, start_time').eq('organiser_id', organiser.id).order('start_time', { ascending: false }),
  ]);

  // Filter coupons: only show coupons where event_ids contains at least one of the organiser's event IDs
  // (exclude global/all-events coupons which are admin-managed)
  const orgCoupons = (coupons || []).filter(c => {
    const ids = c.event_ids || [];
    if (ids.length === 0) return false; // global coupons are admin-only
    return ids.some(id => orgEventIds.includes(id));
  });

  return NextResponse.json({ coupons: orgCoupons, events: events || [] });
}

// POST — create a new coupon (organiser can only bind it to their own events)
export async function POST(req) {
  const { organiser, error } = await getOrganiserFromRequest(req);
  if (error) return error;

  const body = await req.json();

  // Validate event_ids belong to this organiser
  if (!body.event_ids || body.event_ids.length === 0) {
    return NextResponse.json({ error: 'You must bind a coupon to at least one of your events.' }, { status: 400 });
  }

  const { data: orgEvents } = await supabase
    .from('events')
    .select('id')
    .eq('organiser_id', organiser.id)
    .in('id', body.event_ids);

  if (!orgEvents || orgEvents.length !== body.event_ids.length) {
    return NextResponse.json({ error: 'One or more events do not belong to you.' }, { status: 403 });
  }

  const payload = {
    code:                 (body.code || '').trim().toUpperCase(),
    description:          body.description || '',
    discount_type:        body.discount_type || 'percent',
    discount_value:       parseFloat(body.discount_value),
    applies_to:           body.applies_to || 'cart',
    usage_limit:          body.usage_limit != null && body.usage_limit !== '' ? parseInt(body.usage_limit) : null,
    usage_limit_per_user: body.usage_limit_per_user != null && body.usage_limit_per_user !== '' ? parseInt(body.usage_limit_per_user) : null,
    expiry_date:          body.expiry_date || null,
    event_ids:            body.event_ids,
    status:               body.status || 'active',
    usage_count:          0,
  };

  const { data, error: dbErr } = await supabase.from('coupons').insert([payload]).select().single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ coupon: data });
}

// PUT — update a coupon (must own it)
export async function PUT(req) {
  const { organiser, error } = await getOrganiserFromRequest(req);
  if (error) return error;

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Missing coupon id' }, { status: 400 });

  // Verify ownership: the coupon must be bound to at least one of this organiser's events
  const { data: existing } = await supabase.from('coupons').select('event_ids').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

  const { data: orgEvents } = await supabase.from('events').select('id').eq('organiser_id', organiser.id);
  const orgEventIds = (orgEvents || []).map(e => e.id);
  const owned = (existing.event_ids || []).some(eid => orgEventIds.includes(eid));
  if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Also validate updated event_ids if provided
  if (updates.event_ids && updates.event_ids.length > 0) {
    const { data: validEvents } = await supabase.from('events').select('id').eq('organiser_id', organiser.id).in('id', updates.event_ids);
    if (!validEvents || validEvents.length !== updates.event_ids.length) {
      return NextResponse.json({ error: 'One or more events do not belong to you.' }, { status: 403 });
    }
  }

  if (updates.event_ids && updates.event_ids.length === 0) {
    return NextResponse.json({ error: 'You must bind the coupon to at least one of your events.' }, { status: 400 });
  }

  const payload = {};
  if (updates.code !== undefined)                 payload.code = updates.code.trim().toUpperCase();
  if (updates.description !== undefined)           payload.description = updates.description;
  if (updates.discount_type !== undefined)         payload.discount_type = updates.discount_type;
  if (updates.discount_value !== undefined)        payload.discount_value = parseFloat(updates.discount_value);
  if (updates.applies_to !== undefined)            payload.applies_to = updates.applies_to;
  if (updates.usage_limit !== undefined)           payload.usage_limit = updates.usage_limit !== '' ? parseInt(updates.usage_limit) : null;
  if (updates.usage_limit_per_user !== undefined)  payload.usage_limit_per_user = updates.usage_limit_per_user !== '' ? parseInt(updates.usage_limit_per_user) : null;
  if (updates.expiry_date !== undefined)           payload.expiry_date = updates.expiry_date || null;
  if (updates.event_ids !== undefined)             payload.event_ids = updates.event_ids;
  if (updates.status !== undefined)                payload.status = updates.status;

  const { error: dbErr } = await supabase.from('coupons').update(payload).eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE — delete a coupon (must own it)
export async function DELETE(req) {
  const { organiser, error } = await getOrganiserFromRequest(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: existing } = await supabase.from('coupons').select('event_ids').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: orgEvents } = await supabase.from('events').select('id').eq('organiser_id', organiser.id);
  const orgEventIds = (orgEvents || []).map(e => e.id);
  const owned = (existing.event_ids || []).some(eid => orgEventIds.includes(eid));
  if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error: dbErr } = await supabase.from('coupons').delete().eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PATCH — toggle status
export async function PATCH(req) {
  const { organiser, error } = await getOrganiserFromRequest(req);
  if (error) return error;

  const { id, status } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: existing } = await supabase.from('coupons').select('event_ids').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: orgEvents } = await supabase.from('events').select('id').eq('organiser_id', organiser.id);
  const orgEventIds = (orgEvents || []).map(e => e.id);
  const owned = (existing.event_ids || []).some(eid => orgEventIds.includes(eid));
  if (!owned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error: dbErr } = await supabase.from('coupons').update({ status }).eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
