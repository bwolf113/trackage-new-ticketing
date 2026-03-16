/* app/api/organiser/events/route.js
   GET  — list events for organiser (auth via Bearer token)
   POST — create event + tickets (auth via Bearer token)
*/
import { createClient } from '@supabase/supabase-js';
import { getOrganiserFromRequest } from '../../../../lib/organiserAuth';
import { sendEmail } from '../../../../lib/sendEmail';

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
    const { organiser, errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;
    const organiser_id = organiser.id;

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
    const { organiser, errorResponse } = await getOrganiserFromRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { event: eventData, tickets, days } = body;
    const organiser_id = organiser.id;

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

    // Notify team about the new event (fire-and-forget)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tickets.trackagescheme.com';
    sendEmail({
      to: 'team@trackagescheme.com',
      subject: `New event created: ${eventData.name}`,
      html: `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a">New event created</h2>
          <table style="width:100%;border:1px solid #e8e8e6;border-radius:8px;border-collapse:collapse;overflow:hidden">
            <tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#999;border-bottom:1px solid #f0f0f0">Event</td><td style="padding:10px 14px;font-size:14px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #f0f0f0">${eventData.name}</td></tr>
            <tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#999;border-bottom:1px solid #f0f0f0">Organiser</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0">${organiser.name} (${organiser.email})</td></tr>
            <tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#999;border-bottom:1px solid #f0f0f0">Status</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0">${eventData.status || 'draft'}</td></tr>
            <tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#999;border-bottom:1px solid #f0f0f0">Venue</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0">${eventData.venue_name || '—'}</td></tr>
            <tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#999;border-bottom:1px solid #f0f0f0">Tickets</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0">${tickets?.length || 0} ticket type(s)</td></tr>
            <tr><td style="padding:10px 14px;font-size:12px;font-weight:700;color:#999">Days</td><td style="padding:10px 14px;font-size:14px;color:#1a1a1a">${days?.length || 0} day(s)</td></tr>
          </table>
          <div style="margin-top:20px;text-align:center">
            <a href="${siteUrl}/organiser/events/${event.id}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">View event →</a>
            <span style="margin:0 8px;color:#999">·</span>
            <a href="${siteUrl}/events/${event.id}" style="display:inline-block;background:#48C16E;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">Public page →</a>
          </div>
        </div>
      `,
    }).catch(err => console.error('Team notification email failed:', err.message));

    return Response.json({ event_id: event.id });
  } catch (err) {
    console.error('Create event error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
