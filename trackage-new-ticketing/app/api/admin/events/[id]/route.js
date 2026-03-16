/* app/api/admin/events/[id]/route.js
   PUT — update event + days + tickets (service-role, bypasses RLS)
*/
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '../../../../../lib/adminAuth';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function PUT(req, { params }) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  const { id: eventId } = await params;
  try {
    const body = await req.json();
    const { event: eventData, tickets = [], days = [], isMultiDay = false } = body;

    const supabase = adminSupabase();

    // Update event
    const { error: eventError } = await supabase
      .from('events')
      .update({ ...eventData, updated_at: new Date().toISOString() })
      .eq('id', eventId);
    if (eventError) return Response.json({ error: eventError.message }, { status: 500 });

    // ── Reconcile event_days ─────────────────────────────────────
    const dayIdMap = {};
    const activeDays = isMultiDay ? days : [];

    const { data: existingDays } = await supabase.from('event_days').select('id').eq('event_id', eventId);
    const existingDayIds = new Set((existingDays || []).map(d => d.id));
    const submittedExistingIds = new Set(
      activeDays.filter(d => d.id && existingDayIds.has(d.id)).map(d => d.id)
    );

    // Delete removed days
    const toDeleteDays = [...existingDayIds].filter(id => !submittedExistingIds.has(id));
    if (toDeleteDays.length > 0) {
      await supabase.from('event_days').delete().in('id', toDeleteDays);
    }

    // Update existing / insert new days
    for (const [i, d] of activeDays.entries()) {
      const row = {
        name:       d.name || `Day ${i + 1}`,
        date:       d.date || null,
        capacity:   d.capacity !== '' && d.capacity != null ? parseInt(d.capacity) : null,
        sort_order: d.sort_order ?? i,
      };
      if (d.id && existingDayIds.has(d.id)) {
        await supabase.from('event_days').update(row).eq('id', d.id);
        dayIdMap[d._id || d.id] = d.id;
        dayIdMap[d.id] = d.id;
      } else {
        const { data: newDay } = await supabase.from('event_days')
          .insert({ ...row, event_id: eventId }).select('id').single();
        if (newDay && d._id) dayIdMap[d._id] = newDay.id;
      }
    }

    // If switching to single-day, delete all days
    if (!isMultiDay) {
      await supabase.from('event_days').delete().eq('event_id', eventId);
    }

    // ── Reconcile tickets ────────────────────────────────────────
    const { data: existingTickets } = await supabase.from('tickets').select('id').eq('event_id', eventId);
    const existingIds = new Set((existingTickets || []).map(t => t.id));
    const submittedExistingTicketIds = new Set(tickets.filter(t => t.id && existingIds.has(t.id)).map(t => t.id));

    // Delete removed tickets
    const toDelete = [...existingIds].filter(id => !submittedExistingTicketIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from('tickets').delete().in('id', toDelete);
    }

    // Update existing / insert new
    for (const t of tickets) {
      const rawDayId = t.event_day_id;
      const mappedDayId = rawDayId ? (dayIdMap[rawDayId] || rawDayId) : null;
      const row = {
        name:             t.name            || 'General Admission',
        price:            parseFloat(t.price) || 0,
        inventory:        t.inventory !== '' && t.inventory != null ? parseInt(t.inventory) : null,
        sale_start:       t.sale_start || null,
        sale_end:         t.sale_end   || null,
        disclaimer:       t.disclaimer || null,
        footer_image_url: t.footer_image_url || null,
        event_id:         eventId,
        event_day_id:     isMultiDay ? mappedDayId : null,
        status:           t.status || 'active',
      };
      if (t.id && existingIds.has(t.id)) {
        const { error } = await supabase.from('tickets').update(row).eq('id', t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tickets').insert({ ...row, sold: 0, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Admin update event error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  const { id: eventId } = await params;
  try {
    const body = await req.json();
    const { status, ticket_id, ticket_status } = body;
    const supabase = adminSupabase();

    if (ticket_id) {
      const { error } = await supabase.from('tickets').update({ status: ticket_status }).eq('id', ticket_id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from('events').update({ status }).eq('id', eventId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;
  const { id: eventId } = await params;
  try {
    const supabase = adminSupabase();
    await supabase.from('event_days').delete().eq('event_id', eventId);
    await supabase.from('tickets').delete().eq('event_id', eventId);
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
