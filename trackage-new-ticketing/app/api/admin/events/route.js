/* app/api/admin/events/route.js
   GET  — list all events + tickets + days (service-role, bypasses RLS)
   POST — create event + days + tickets (service-role, bypasses RLS)
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  try {
    const supabase = adminSupabase();
    const [{ data: events, error: evErr }, { data: orgs }] = await Promise.all([
      supabase
        .from('events')
        .select('*, tickets(*), event_days(*)')
        .order('start_time', { ascending: false }),
      supabase
        .from('organisers')
        .select('id, name, vat_number')
        .order('name'),
    ]);
    if (evErr) return Response.json({ error: evErr.message }, { status: 500 });
    return Response.json({ events: events || [], organisers: orgs || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { event: eventData, tickets = [], days = [], isMultiDay = false } = body;
    if (!eventData?.name) return Response.json({ error: 'Event name required' }, { status: 400 });

    const supabase = adminSupabase();

    // Insert event
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert({ ...eventData, created_at: new Date().toISOString() })
      .select('id')
      .single();
    if (eventError) return Response.json({ error: eventError.message }, { status: 500 });
    const eventId = newEvent.id;

    // Insert days + build dayIdMap
    const dayIdMap = {};
    const activeDays = isMultiDay ? days : [];
    if (activeDays.length > 0) {
      const dayRows = activeDays.map((d, i) => ({
        event_id:   eventId,
        name:       d.name || `Day ${i + 1}`,
        date:       d.date || null,
        capacity:   d.capacity !== '' && d.capacity != null ? parseInt(d.capacity) : null,
        sort_order: d.sort_order ?? i,
      }));
      const { data: createdDays } = await supabase.from('event_days').insert(dayRows).select('id');
      if (createdDays) {
        activeDays.forEach((d, i) => {
          const clientKey = d._id || d.id;
          if (clientKey) dayIdMap[clientKey] = createdDays[i]?.id;
        });
      }
    }

    // Insert tickets
    for (const t of tickets) {
      const rawDayId = t.event_day_id;
      const mappedDayId = rawDayId ? (dayIdMap[rawDayId] || null) : null;
      const { error } = await supabase.from('tickets').insert({
        name:             t.name            || 'General Admission',
        price:            parseFloat(t.price) || 0,
        inventory:        t.inventory !== '' && t.inventory != null ? parseInt(t.inventory) : null,
        sale_start:       t.sale_start || null,
        sale_end:         t.sale_end   || null,
        disclaimer:       t.disclaimer || null,
        footer_image_url: t.footer_image_url || null,
        event_id:         eventId,
        event_day_id:     isMultiDay ? mappedDayId : null,
        sold:             0,
        created_at:       new Date().toISOString(),
      });
      if (error) throw error;
    }

    return Response.json({ id: eventId });
  } catch (err) {
    console.error('Admin create event error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
