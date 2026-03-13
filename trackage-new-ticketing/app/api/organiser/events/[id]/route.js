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
      platform_vat, booking_fee_pct, thumbnail_url, poster_url, status
    `)
    .eq('id', id)
    .single();

  if (error || !event) return Response.json({ error: 'Event not found' }, { status: 404 });
  if (organiser_id && event.organiser_id !== organiser_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, name, price, booking_fee_pct, inventory, sale_start, sale_end, disclaimer, footer_image_url, sold')
    .eq('event_id', id)
    .order('price');

  return Response.json({ event, tickets: tickets || [] });
}

export async function PUT(req, { params }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { organiser_id, event: eventData, tickets } = body;
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
        booking_fee_pct: eventData.booking_fee_pct  || 0,
        thumbnail_url:   eventData.thumbnail_url    || null,
        poster_url:      eventData.poster_url       || null,
        status:          eventData.status           || 'draft',
      })
      .eq('id', id);

    if (eventError) return Response.json({ error: eventError.message }, { status: 500 });

    // Reconcile tickets
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

    // Update existing / insert new
    for (const t of tickets || []) {
      const row = {
        name:            t.name            || 'General Admission',
        price:           parseFloat(t.price)           || 0,
        booking_fee_pct: parseFloat(t.booking_fee_pct) || 0,
        inventory:       t.inventory !== '' && t.inventory != null ? parseInt(t.inventory) : null,
        sale_start:      t.sale_start      || null,
        sale_end:        t.sale_end        || null,
        disclaimer:      t.disclaimer      || null,
        footer_image_url: t.footer_image_url || null,
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

export async function DELETE(req, { params }) {
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
