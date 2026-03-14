/* app/api/organiser/events/[id]/route.js
   GET    — fetch event + tickets (query: organiser_id)
   PUT    — update event + tickets (body: { organiser_id, event, tickets })
   DELETE — delete event (body/query: organiser_id)
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function verifyOwnership(supabase, eventId, organiserId) {
  const { data } = await supabase
    .from('events').select('organiser_id').eq('id', eventId).single();
  return data?.organiser_id === organiserId;
}

export async function GET(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const organiser_id = searchParams.get('organiser_id');

  const supabase = adminSupabase();

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      id, name, slug, description, start_time, end_time,
      venue_name, venue_maps_url, organiser_id, organiser_vat,
      platform_vat, vat_permit, booking_fee_pct, thumbnail_url, poster_url, status
    `)
    .eq('id', id)
    .single();

  if (error || !event) return Response.json({ error: 'Event not found' }, { status: 404 });
  if (organiser_id && event.organiser_id !== organiser_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: days } = await supabase
    .from('event_days')
    .select('id, name, date, capacity, sort_order')
    .eq('event_id', id)
    .order('sort_order');

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, name, price, booking_fee_pct, inventory, sale_start, sale_end, disclaimer, footer_image_url, sold, event_day_id, status')
    .eq('event_id', id)
    .order('price');

  return Response.json({ event, tickets: tickets || [], days: days || [] });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { organiser_id, event: eventData, tickets, days } = body;
    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

    const supabase = adminSupabase();
    if (!(await verifyOwnership(supabase, id, organiser_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update event
    const { error: eventError } = await supabase
      .from('events')
      .update({
        name:            eventData.name,
        description:     eventData.description     || null,
        start_time:      eventData.start_time      || null,
        end_time:        eventData.end_time         || null,
        venue_name:      eventData.venue_name       || null,
        venue_maps_url:  eventData.venue_maps_url   || null,
        organiser_vat:   eventData.organiser_vat    || null,
        platform_vat:    eventData.platform_vat     || null,
        vat_permit:      eventData.vat_permit       || null,
        booking_fee_pct: eventData.booking_fee_pct  || 0,
        thumbnail_url:   eventData.thumbnail_url    || null,
        poster_url:      eventData.poster_url       || null,
        status:          eventData.status           || 'draft',
      })
      .eq('id', id);

    if (eventError) return Response.json({ error: eventError.message }, { status: 500 });

    // Sync organiser_vat to organiser's profile if provided
    if (eventData.organiser_vat && organiser_id) {
      await supabase.from('organisers').update({ vat_number: eventData.organiser_vat }).eq('id', organiser_id);
    }

    // ── Reconcile event_days ─────────────────────────────────
    const { data: existingDays } = await supabase
      .from('event_days').select('id').eq('event_id', id);
    const existingDayIds = new Set((existingDays || []).map(d => d.id));
    const submittedExistingDayIds = new Set(
      (days || []).filter(d => d.id && existingDayIds.has(d.id)).map(d => d.id)
    );

    // Delete removed days (cascades to tickets via ON DELETE SET NULL)
    const toDeleteDays = [...existingDayIds].filter(dbId => !submittedExistingDayIds.has(dbId));
    if (toDeleteDays.length > 0) {
      await supabase.from('event_days').delete().in('id', toDeleteDays);
    }

    // Update existing / insert new days — build _id→dbId map for tickets
    const dayIdMap = {}; // client key (_id or id) → real db id
    for (const [i, d] of (days || []).entries()) {
      const row = {
        name:       d.name || `Day ${i + 1}`,
        date:       d.date,
        capacity:   d.capacity !== '' && d.capacity != null ? parseInt(d.capacity) : null,
        sort_order: d.sort_order ?? i,
      };
      if (d.id && existingDayIds.has(d.id)) {
        await supabase.from('event_days').update(row).eq('id', d.id);
        dayIdMap[d._id || d.id] = d.id;
        dayIdMap[d.id] = d.id;
      } else {
        const { data: newDay } = await supabase.from('event_days')
          .insert({ ...row, event_id: id })
          .select('id')
          .single();
        if (newDay && d._id) dayIdMap[d._id] = newDay.id;
      }
    }

    // ── Reconcile tickets ────────────────────────────────────
    const { data: existingTickets } = await supabase
      .from('tickets').select('id').eq('event_id', id);
    const existingIds = new Set((existingTickets || []).map(t => t.id));
    const submittedExistingIds = new Set(
      (tickets || []).filter(t => t.id && existingIds.has(t.id)).map(t => t.id)
    );

    // Delete removed tickets
    const toDelete = [...existingIds].filter(dbId => !submittedExistingIds.has(dbId));
    if (toDelete.length > 0) {
      await supabase.from('tickets').delete().in('id', toDelete);
    }

    // Update existing / insert new (with mapped event_day_id)
    for (const t of tickets || []) {
      const rawDayId = t.event_day_id;
      const mappedDayId = rawDayId ? (dayIdMap[rawDayId] || rawDayId) : null;
      const row = {
        name:             t.name            || 'General Admission',
        price:            parseFloat(t.price)           || 0,
        booking_fee_pct:  parseFloat(t.booking_fee_pct) || 0,
        inventory:        t.inventory !== '' && t.inventory != null ? parseInt(t.inventory) : null,
        sale_start:       t.sale_start      || null,
        sale_end:         t.sale_end        || null,
        disclaimer:       t.disclaimer      || null,
        footer_image_url: t.footer_image_url || null,
        event_day_id:     mappedDayId,
        status:           t.status          || 'active',
      };
      if (t.id && existingIds.has(t.id)) {
        await supabase.from('tickets').update(row).eq('id', t.id);
      } else {
        await supabase.from('tickets').insert({ ...row, event_id: id, sold: 0 });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { organiser_id, status, ticket_id, ticket_status } = body;
    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

    const supabase = adminSupabase();
    if (!(await verifyOwnership(supabase, id, organiser_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ticket_id) {
      const { error } = await supabase.from('tickets').update({ status: ticket_status }).eq('id', ticket_id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from('events').update({ status }).eq('id', id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  return Response.json({ error: 'Event deletion is not permitted via the organiser API. Please contact an admin.' }, { status: 403 });
}

export async function _DELETE_DISABLED(req, { params }) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(req.url);
    const organiser_id = searchParams.get('organiser_id');
    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

    const supabase = adminSupabase();
    if (!(await verifyOwnership(supabase, id, organiser_id))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await supabase.from('tickets').delete().eq('event_id', id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
