/* app/api/organiser/events/route.js
   GET  — list events for organiser (query: organiser_id)
   POST — create event + tickets (body: { organiser_id, event, tickets })
*/
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const organiser_id = searchParams.get('organiser_id');
    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });

    const supabase = adminSupabase();

    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, slug, start_time, end_time, venue_name, status, thumbnail_url, created_at')
      .eq('organiser_id', organiser_id)
      .order('created_at', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Get order counts per event
    const eventIds = (events || []).map(e => e.id);
    let orderCounts = {};
    if (eventIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'completed');
      for (const o of orders || []) {
        orderCounts[o.event_id] = (orderCounts[o.event_id] || 0) + 1;
      }
    }

    const enriched = (events || []).map(e => ({
      ...e,
      completed_orders: orderCounts[e.id] || 0,
    }));

    return Response.json({ events: enriched });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { organiser_id, event: eventData, tickets, days } = body;

    if (!organiser_id) return Response.json({ error: 'organiser_id required' }, { status: 400 });
    if (!eventData?.name) return Response.json({ error: 'Event name required' }, { status: 400 });

    const supabase = adminSupabase();

    // Generate unique slug
    const baseSlug = slug(eventData.name);
    let finalSlug = baseSlug;
    const { data: existing } = await supabase
      .from('events').select('slug').eq('slug', baseSlug).single();
    if (existing) finalSlug = `${baseSlug}-${Date.now()}`;

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        organiser_id,
        name:            eventData.name,
        slug:            finalSlug,
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
      .select('id')
      .single();

    if (eventError) {
      console.error('Event insert error:', eventError);
      return Response.json({ error: eventError.message }, { status: 500 });
    }

    // Insert event_days and build client _id → db id map
    const dayIdMap = {}; // client temp _id → real db id
    if (days?.length > 0) {
      const dayRows = days.map((d, i) => ({
        event_id:   event.id,
        name:       d.name || `Day ${i + 1}`,
        date:       d.date,
        capacity:   d.capacity !== '' && d.capacity != null ? parseInt(d.capacity) : null,
        sort_order: d.sort_order ?? i,
      }));
      const { data: createdDays, error: daysError } = await supabase
        .from('event_days')
        .insert(dayRows)
        .select('id');
      if (daysError) {
        console.error('event_days insert error:', daysError);
      } else if (createdDays) {
        days.forEach((d, i) => {
          const clientKey = d._id || d.id;
          if (clientKey) dayIdMap[clientKey] = createdDays[i]?.id;
        });
      }
    }

    // Insert tickets (map client-side event_day_id → real db id)
    if (tickets?.length > 0) {
      const ticketRows = tickets.map(t => {
        const rawDayId = t.event_day_id;
        const mappedDayId = rawDayId ? (dayIdMap[rawDayId] || null) : null;
        return {
          event_id:         event.id,
          name:             t.name            || 'General Admission',
          price:            parseFloat(t.price)           || 0,
          booking_fee_pct:  parseFloat(t.booking_fee_pct) || 0,
          inventory:        t.inventory !== '' && t.inventory != null ? parseInt(t.inventory) : null,
          sale_start:       t.sale_start      || null,
          sale_end:         t.sale_end        || null,
          disclaimer:       t.disclaimer      || null,
          footer_image_url: t.footer_image_url || null,
          sold:             0,
          event_day_id:     mappedDayId,
        };
      });

      const { error: ticketError } = await supabase.from('tickets').insert(ticketRows);
      if (ticketError) console.error('Ticket insert error:', ticketError);
    }

    return Response.json({ event_id: event.id });
  } catch (err) {
    console.error('Create event error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
