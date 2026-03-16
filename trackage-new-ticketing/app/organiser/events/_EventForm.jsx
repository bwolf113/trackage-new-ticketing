/* app/organiser/events/_EventForm.jsx — Shared event create/edit form */
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { orgFetch } from '../../../lib/organiserFetch';

function uid() { return Math.random().toString(36).slice(2, 9); }

const MALTA_TZ = 'Europe/Malta';

// Convert UTC ISO string → Malta local datetime string for datetime-local inputs
function toLocalDT(utcStr) {
  if (!utcStr) return '';
  const d = new Date(utcStr);
  if (isNaN(d)) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MALTA_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value ?? '00';
  const h = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`;
}

// Convert Malta local datetime string → UTC ISO string for storage
function fromLocalDT(localStr) {
  if (!localStr) return null;
  const [yr, mo, da, hr, mi] = localStr.replace('T', '-').split(/[:\-]/).map(Number);
  // Start with a UTC guess (treat input as UTC), then iteratively correct to find
  // the UTC instant that corresponds to this Malta local time (handles DST correctly)
  let utcMs = Date.UTC(yr, mo - 1, da, hr, mi);
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: MALTA_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(utcMs));
    const get = t => parseInt(parts.find(p => p.type === t)?.value ?? '0');
    const maltaMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    const wantedMs = Date.UTC(yr, mo - 1, da, hr, mi);
    const diff = wantedMs - maltaMs;
    if (Math.abs(diff) < 60000) break;
    utcMs += diff;
  }
  return new Date(utcMs).toISOString();
}

const BLANK_TICKET = () => ({
  _id:        uid(),
  name:       '',
  price:      '',
  inventory:  '',
  sale_start: '',
  sale_end:   '',
  disclaimer: '',
  footer_image_url: '',
  event_day_id: null,
  status:     'active',
  _saved:     false,
});

const BLANK_DAY = () => ({
  _id:       uid(),
  name:      '',
  date:      '',
  capacity:  '',
  sort_order: 0,
});

const BLANK_EVENT = {
  name:           '',
  description:    '',
  start_time:     '',
  end_time:       '',
  venue_name:     '',
  venue_maps_url: '',
  organiser_vat:  '',
  platform_vat:   '',
  vat_permit:     '',
  thumbnail_url:  '',
  poster_url:     '',
  status:         'draft',
};

const CSS = `
.ef-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); font-weight: 500; text-decoration: none; margin-bottom: 20px; }
.ef-back:hover { color: var(--black); }
.ef-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
.ef-title { font-size: 24px; font-weight: 800; color: var(--black); letter-spacing: -0.02em; }
.ef-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.btn-save { padding: 9px 20px; background: var(--black); color: var(--white); border: none; border-radius: 8px; font-size: 13px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: opacity 0.15s; }
.btn-save:hover { opacity: 0.8; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-delete { padding: 9px 16px; background: var(--surface); color: #ef4444; border: 1.5px solid rgba(239,68,68,0.4); border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: all 0.15s; }
.btn-delete:hover { background: rgba(239,68,68,0.08); }
.btn-preview { padding: 9px 14px; background: var(--surface); color: var(--muted); border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s; }
.btn-preview:hover { border-color: var(--black); color: var(--black); }
.error { background: rgba(239,68,68,0.08); border: 1.5px solid rgba(239,68,68,0.3); color: #ef4444; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
.form-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
.section { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 20px; }
.section-title { font-size: 15px; font-weight: 700; color: var(--black); letter-spacing: -0.01em; margin-bottom: 18px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { margin-bottom: 16px; }
.form-group:last-child { margin-bottom: 0; }
label { display: block; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
input, textarea, select { width: 100%; padding: 9px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; color: var(--black); background: var(--surface); outline: none; transition: border-color 0.15s; }
input:focus, textarea:focus, select:focus { border-color: var(--black); }
textarea { resize: vertical; min-height: 90px; line-height: 1.5; }
.ticket-card { border: 1.5px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 14px; position: relative; }
.ticket-card:last-child { margin-bottom: 0; }
.ticket-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.ticket-label { font-size: 13px; font-weight: 700; color: var(--black); }
.btn-remove { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 18px; line-height: 1; padding: 0 2px; transition: color 0.15s; }
.btn-remove:hover { color: #ef4444; }
.btn-add-ticket { width: 100%; padding: 10px; border: 1.5px dashed var(--border); border-radius: 8px; background: none; color: var(--muted); font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: all 0.15s; margin-top: 14px; }
.btn-add-ticket:hover { border-color: var(--black); color: var(--black); }
.status-toggle { display: flex; gap: 8px; }
.status-btn { flex: 1; padding: 8px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; background: var(--surface); color: var(--muted); transition: all 0.15s; }
.status-btn.active-draft { border-color: var(--border); background: var(--bg); color: var(--black); font-weight: 700; }
.status-btn.active-pub { border-color: var(--green); background: var(--green-dim); color: var(--green); font-weight: 700; }
.status-btn.active-soldout { border-color: #ef4444; background: rgba(239,68,68,0.08); color: #ef4444; font-weight: 700; }
.btn-ticket-soldout { padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; border: 1.5px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); color: #ef4444; transition: all 0.15s; white-space: nowrap; }
.btn-ticket-soldout:hover { background: rgba(239,68,68,0.15); }
.btn-ticket-reactivate { padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; border: 1.5px solid var(--green); background: var(--green-dim); color: var(--green); transition: all 0.15s; white-space: nowrap; }
.btn-ticket-reactivate:hover { background: rgba(72,193,110,0.2); }
.ticket-soldout-badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 700; background: rgba(239,68,68,0.1); color: #ef4444; border: 1.5px solid rgba(239,68,68,0.3); }
.hint { font-size: 11px; color: var(--muted); font-weight: 500; margin-top: 5px; }
.label-row { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; }
.label-row label { margin-bottom: 0; }
.tip-wrap { position: relative; display: inline-flex; }
.tip-icon { width: 15px; height: 15px; border-radius: 50%; background: var(--border); color: var(--muted); font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; cursor: default; user-select: none; }
.tip-box { display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: var(--black); color: var(--white); font-size: 11px; line-height: 1.5; padding: 8px 10px; border-radius: 8px; white-space: normal; width: 220px; z-index: 10; pointer-events: none; font-weight: 500; }
.tip-box::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: var(--black); }
.tip-wrap:hover .tip-box { display: block; }
.upload-box { border: 1.5px dashed var(--border); border-radius: 8px; padding: 14px; cursor: pointer; transition: border-color 0.15s; text-align: center; position: relative; }
.upload-box:hover { border-color: var(--black); }
.upload-box.has-image { border-style: solid; padding: 8px; }
.upload-box input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.upload-preview { width: 100%; border-radius: 6px; object-fit: cover; display: block; }
.upload-preview.thumb { max-height: 100px; }
.upload-preview.poster { max-height: 140px; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 6px 0; pointer-events: none; }
.upload-icon { font-size: 22px; }
.upload-cta { font-size: 12px; font-weight: 700; color: var(--black); }
.upload-spec { font-size: 11px; color: var(--muted); font-weight: 500; line-height: 1.4; }
.upload-change { font-size: 11px; color: var(--muted); font-weight: 500; margin-top: 6px; }
.upload-error { font-size: 11px; color: #ef4444; margin-top: 5px; font-weight: 600; }
.upload-spinner { font-size: 11px; color: var(--muted); font-weight: 500; margin-top: 5px; }
.pac-container-wrap { width: 100%; }
.pac-container-wrap gmp-place-autocomplete { width: 100%; }
gmp-place-autocomplete { --gmp-input-padding: 9px 13px; --gmp-input-border: 1.5px solid var(--border); --gmp-input-border-radius: 8px; --gmp-input-font-size: 14px; --gmp-input-font-family: 'Plus Jakarta Sans', sans-serif; --gmp-input-color: var(--black); width: 100%; }
.venue-chip { display: flex; align-items: center; gap: 8px; padding: 9px 13px; background: var(--green-dim); border: 1.5px solid var(--green); border-radius: 8px; font-size: 14px; color: var(--green); margin-bottom: 0; font-weight: 500; }
.venue-chip-name { flex: 1; }
.venue-chip-change { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 12px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; padding: 2px 6px; border-radius: 4px; transition: all 0.15s; }
.venue-chip-change:hover { background: rgba(72,193,110,0.2); color: var(--green); }
.ticket-card-saved { background: var(--green-dim); border-color: var(--green); }
.ticket-saved-check { color: var(--green); font-size: 15px; font-weight: 700; }
.ticket-save-actions { display: flex; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
.btn-save-ticket { padding: 8px 16px; background: var(--black); color: var(--white); border: none; border-radius: 8px; font-size: 13px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: opacity 0.15s; }
.btn-save-ticket:hover { opacity: 0.8; }
.btn-save-create { padding: 8px 16px; background: var(--surface); color: var(--black); border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: all 0.15s; }
.btn-save-create:hover { border-color: var(--black); }
.btn-edit-ticket { padding: 5px 12px; background: var(--surface); color: var(--muted); border: 1.5px solid var(--border); border-radius: 8px; font-size: 12px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: all 0.15s; }
.btn-edit-ticket:hover { border-color: var(--black); color: var(--black); }
.multiday-toggle { display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 4px; }
.multiday-btn { flex: 1; padding: 9px 12px; border: none; background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; }
.multiday-btn:first-child { border-right: 1.5px solid var(--border); }
.multiday-btn.active { background: var(--black); color: var(--white); font-weight: 700; }
.day-card { border: 1.5px solid #bae6fd; border-radius: 12px; padding: 18px; margin-bottom: 12px; background: #f0f9ff; position: relative; }
.day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.day-label { font-size: 13px; font-weight: 700; color: #0369a1; display: flex; align-items: center; gap: 6px; }
.day-badge { background: #0369a1; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
.day-actions { display: flex; gap: 8px; align-items: center; }
.btn-copy-day { font-size: 11px; color: #0369a1; background: none; border: 1.5px solid #0369a1; border-radius: 8px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; padding: 3px 8px; transition: all 0.15s; }
.btn-copy-day:hover { background: #e0f2fe; }
.day-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 700; background: #dbeafe; color: #1d4ed8; }
.day-pill.festival { background: #fef3c7; color: #92400e; }
@media(max-width:768px) { .form-layout { grid-template-columns: 1fr; } .form-row { grid-template-columns: 1fr; } }
`;

/* ── ImageUpload sub-component ────────────────────────────────── */
function ImageUpload({ value, onChange, type, spec, tooltip }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    if (file.size > 500 * 1024) {
      setUploadErr(`File too large (${(file.size / 1024).toFixed(0)} KB). Max 500 KB.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    try {
      const res  = await orgFetch('/api/organiser/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) { onChange(json.url); } else { setUploadErr(json.error || 'Upload failed'); }
    } catch { setUploadErr('Upload failed. Please try again.'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  return (
    <div>
      <div className="label-row">
        <label style={{ marginBottom: 0 }}>{type === 'thumbnail' ? 'Thumbnail' : 'Poster'}</label>
        <span className="tip-wrap">
          <span className="tip-icon">?</span>
          <span className="tip-box">{tooltip}</span>
        </span>
      </div>
      <div className={`upload-box ${value ? 'has-image' : ''}`}>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} />
        {value ? (
          <>
            <img src={value} alt="" className={`upload-preview ${type}`} />
            <div className="upload-change">Click to replace</div>
          </>
        ) : (
          <div className="upload-placeholder">
            <span className="upload-icon">🖼️</span>
            <span className="upload-cta">Click to upload</span>
            <span className="upload-spec">{spec}</span>
          </div>
        )}
      </div>
      {uploading && <div className="upload-spinner">Uploading…</div>}
      {uploadErr  && <div className="upload-error">{uploadErr}</div>}
    </div>
  );
}

/* ── Normalisers ──────────────────────────────────────────────── */
function normaliseEvent(ev) {
  if (!ev) return BLANK_EVENT;
  return { ...ev, start_time: toLocalDT(ev.start_time), end_time: toLocalDT(ev.end_time) };
}
function normaliseTickets(ts) {
  const rows = ts?.length ? ts : [BLANK_TICKET()];
  return rows.map(t => ({
    ...t, _id: t._id || t.id || uid(),
    _saved: !!t.id,
    sale_start: toLocalDT(t.sale_start), sale_end: toLocalDT(t.sale_end),
    event_day_id: t.event_day_id || null,
  }));
}
function normaliseDays(ds) {
  if (!ds?.length) return [];
  return ds.map((d, i) => ({ ...d, _id: d._id || d.id || uid(), sort_order: d.sort_order ?? i }));
}

/* ── Main form ────────────────────────────────────────────────── */
export default function EventForm({ initial, onSave, onDelete, saving, error, isNew, eventId }) {
  const [event,      setEvent]      = useState(() => normaliseEvent(initial?.event));
  const [tickets,    setTickets]    = useState(() => normaliseTickets(initial?.tickets));
  const [days,       setDays]       = useState(() => normaliseDays(initial?.days));
  const [isMultiDay, setIsMultiDay] = useState(() => (initial?.days?.length || 0) > 0);
  const [vatError,   setVatError]   = useState('');
  useEffect(() => {
    if (initial) {
      setEvent(normaliseEvent(initial.event));
      setTickets(normaliseTickets(initial.tickets));
      const nd = normaliseDays(initial.days);
      setDays(nd);
      setIsMultiDay(nd.length > 0);
    }
  }, [initial]);

  // Venue search via server-side proxy (Places API New)
  const [venueQuery, setVenueQuery] = useState('');
  const [venuePredictions, setVenuePredictions] = useState([]);
  const [venueSearching, setVenueSearching] = useState(false);
  const venueDebounce = useRef(null);
  useEffect(() => {
    if (venueDebounce.current) clearTimeout(venueDebounce.current);
    if (!venueQuery.trim() || event.venue_name) { setVenuePredictions([]); return; }
    venueDebounce.current = setTimeout(async () => {
      setVenueSearching(true);
      try {
        const res = await orgFetch(`/api/organiser/places?q=${encodeURIComponent(venueQuery)}`);
        const data = await res.json();
        setVenuePredictions(data.predictions || []);
      } catch { /* ignore */ } finally { setVenueSearching(false); }
    }, 350);
    return () => { if (venueDebounce.current) clearTimeout(venueDebounce.current); };
  }, [venueQuery, event.venue_name]);

  async function selectVenuePrediction(pred) {
    setVenuePredictions([]);
    setVenueSearching(true);
    try {
      const res = await orgFetch(`/api/organiser/places?place_id=${encodeURIComponent(pred.place_id)}`);
      const data = await res.json();
      setEv('venue_name', data.name || pred.description);
      setEv('venue_maps_url', data.maps_url || '');
      setVenueQuery('');
    } catch {
      setEv('venue_name', pred.description);
      setVenueQuery('');
    } finally { setVenueSearching(false); }
  }

  function setEv(field, value) { setEvent(e => ({ ...e, [field]: value })); }

  // ── Ticket helpers ──────────────────────────────────────────
  function updateTicket(key, field, value) {
    setTickets(ts => ts.map(t => (t._id || t.id) === key ? { ...t, [field]: value } : t));
  }
  function removeTicket(key) { setTickets(ts => ts.filter(t => (t._id || t.id) !== key)); }
  function addTicket() { setTickets(ts => [...ts, BLANK_TICKET()]); }
  function saveTicket(key) {
    setTickets(ts => ts.map(t => (t._id || t.id) === key ? { ...t, _saved: true } : t));
  }
  function editTicket(key) {
    setTickets(ts => ts.map(t => (t._id || t.id) === key ? { ...t, _saved: false } : t));
  }
  function saveAndCreateAnother(key) {
    setTickets(ts => {
      const saved = ts.map(t => (t._id || t.id) === key ? { ...t, _saved: true } : t);
      return [...saved, BLANK_TICKET()];
    });
  }

  // ── Day helpers ─────────────────────────────────────────────
  function addDay() {
    setDays(ds => { const d = BLANK_DAY(); d.sort_order = ds.length; return [...ds, d]; });
  }
  function removeDay(key) {
    setDays(ds => ds.filter(d => (d._id || d.id) !== key));
    setTickets(ts => ts.map(t => t.event_day_id === key ? { ...t, event_day_id: null } : t));
  }
  function updateDay(key, field, value) {
    setDays(ds => ds.map(d => (d._id || d.id) === key ? { ...d, [field]: value } : d));
  }
  function copyDayBelow(sourceKey) {
    const source = days.find(d => (d._id || d.id) === sourceKey);
    if (!source) return;
    let nextDate = '';
    if (source.date) {
      const d = new Date(source.date + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().slice(0, 10);
    }
    const nd = { ...BLANK_DAY(), capacity: source.capacity, date: nextDate, sort_order: days.length };
    setDays(ds => [...ds, nd]);
  }
  function switchToSingleDay() {
    setIsMultiDay(false); setDays([]);
    setTickets(ts => ts.map(t => ({ ...t, event_day_id: null })));
  }
  function switchToMultiDay() {
    setIsMultiDay(true);
    if (days.length === 0) setDays([BLANK_DAY()]);
  }

  function getDayLabel(dayId) {
    const d = days.find(d => (d._id || d.id) === dayId || d.id === dayId);
    if (!d) return null;
    return d.name || `Day ${days.indexOf(d) + 1}`;
  }

  const MT_VAT_RE = /^MT\d{8}$/i;

  function handleSubmit(e) {
    e.preventDefault();
    if (!event.name?.trim()) return;
    if (event.organiser_vat && !MT_VAT_RE.test(event.organiser_vat.trim())) {
      setVatError('Invalid VAT number. Must be in the format MT12345678 (MT + 8 digits).');
      return;
    }
    setVatError('');
    // Convert Malta local datetimes → UTC ISO before storing
    const eventToSave = {
      ...event,
      start_time: fromLocalDT(event.start_time),
      end_time:   fromLocalDT(event.end_time),
    };
    const ticketsToSave = tickets.map(t => ({
      ...t,
      sale_start: fromLocalDT(t.sale_start),
      sale_end:   fromLocalDT(t.sale_end),
    }));
    onSave({ event: eventToSave, tickets: ticketsToSave, days: isMultiDay ? days : [] });
  }

  return (
    <>
      <style>{CSS}</style>
      <Link href="/organiser/events" className="ef-back">← Back to Events</Link>

      <div className="ef-header">
        <div className="ef-title">{isNew ? 'Create Event' : 'Edit Event'}</div>
        <div className="ef-actions">
          {!isNew && eventId && (
            <a href={`/events/${eventId}`} target="_blank" rel="noreferrer" className="btn-preview">↗ Preview</a>
          )}
          {!isNew && onDelete && (
            <button type="button" className="btn-delete" onClick={onDelete}>Delete</button>
          )}
          <button className="btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Event' : 'Save Changes'}
          </button>
        </div>
      </div>

      {(error || vatError) && <div className="error">{vatError || error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-layout">

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Event Details */}
            <div className="section">
              <div className="section-title">Event Details</div>
              <div className="form-group">
                <label>Event Name *</label>
                <input value={event.name} required onChange={e => setEv('name', e.target.value)} placeholder="e.g. Rock the South 2026" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={event.description} onChange={e => setEv('description', e.target.value)} placeholder="Tell people what to expect…" />
              </div>

              {/* Event Type toggle */}
              <div className="form-group">
                <label>Event Type</label>
                <div className="multiday-toggle">
                  <button type="button" className={`multiday-btn ${!isMultiDay ? 'active' : ''}`} onClick={switchToSingleDay}>
                    Single Day
                  </button>
                  <button type="button" className={`multiday-btn ${isMultiDay ? 'active' : ''}`} onClick={switchToMultiDay}>
                    Multi-Day / Festival
                  </button>
                </div>
                <div className="hint">
                  {isMultiDay
                    ? 'Configure each day below. Assign tickets to a specific day or sell as an All-Days Festival Pass.'
                    : 'Switch to Multi-Day for festivals spanning multiple dates.'}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{isMultiDay ? 'Festival Start' : 'Start Date & Time'}</label>
                  <input type="datetime-local" value={event.start_time} onChange={e => setEv('start_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{isMultiDay ? 'Festival End' : 'End Date & Time'}</label>
                  <input type="datetime-local" value={event.end_time} onChange={e => setEv('end_time', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Venue Name</label>
                {event.venue_name ? (
                  <div className="venue-chip">
                    <span className="venue-chip-name">📍 {event.venue_name}</span>
                    <button type="button" className="venue-chip-change" onClick={() => { setEv('venue_name', ''); setEv('venue_maps_url', ''); }}>× Change</button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      value={venueQuery}
                      onChange={e => setVenueQuery(e.target.value)}
                      placeholder="Search for a venue…"
                      autoComplete="off"
                    />
                    {venueSearching && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#999' }}>Searching…</span>}
                    {venuePredictions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e8e8e6', borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        {venuePredictions.map(pred => (
                          <button
                            key={pred.place_id}
                            type="button"
                            onClick={() => selectVenuePrediction(pred)}
                            style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid #f0f0f0', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14 }}
                            onMouseOver={e => e.currentTarget.style.background = '#f9f9f8'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                          >
                            📍 {pred.description}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Event Days (multi-day only) ── */}
            {isMultiDay && (
              <div className="section">
                <div className="section-title">Event Days</div>
                <p className="hint" style={{ marginBottom: 16, lineHeight: 1.6 }}>
                  Add one card per day. Set a <strong>Daily Capacity</strong> to cap total attendees for that day — Full Festival passes count toward every day's cap.
                </p>
                {days.map((day, i) => {
                  const key = day._id || day.id;
                  return (
                    <div key={key} className="day-card">
                      <div className="day-header">
                        <div className="day-label">
                          <span className="day-badge">{i + 1}</span>
                          {day.name || `Day ${i + 1}`}
                          {day.date ? <span style={{ fontWeight: 500, color: '#64748b', fontSize: 12 }}>{day.date}</span> : null}
                        </div>
                        <div className="day-actions">
                          <button type="button" className="btn-copy-day" title="Add next day with same capacity, date +1" onClick={() => copyDayBelow(key)}>
                            + Copy as next day
                          </button>
                          {days.length > 1 && (
                            <button type="button" className="btn-remove" onClick={() => removeDay(key)}>×</button>
                          )}
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Day Label</label>
                          <input value={day.name} onChange={e => updateDay(key, 'name', e.target.value)} placeholder="e.g. Friday" />
                        </div>
                        <div className="form-group">
                          <label>Date</label>
                          <input type="date" value={day.date} onChange={e => updateDay(key, 'date', e.target.value)} />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <div className="label-row">
                          <label style={{ marginBottom: 0 }}>Daily Capacity</label>
                          <span className="tip-wrap">
                            <span className="tip-icon">?</span>
                            <span className="tip-box">Max total attendees on this day across all ticket types. Full Festival passes count against every day's capacity. Leave blank for unlimited.</span>
                          </span>
                        </div>
                        <input type="number" min="0" value={day.capacity} onChange={e => updateDay(key, 'capacity', e.target.value)} placeholder="e.g. 1000 — leave blank for unlimited" />
                      </div>
                    </div>
                  );
                })}
                <button type="button" className="btn-add-ticket" onClick={addDay}>+ Add Day</button>
              </div>
            )}

            {/* ── Tickets ── */}
            <div className="section">
              <div className="section-title">Tickets</div>
              {isMultiDay && (
                <p className="hint" style={{ marginBottom: 16, lineHeight: 1.6 }}>
                  Assign each ticket type to a specific day, or choose <strong>All Days (Festival Pass)</strong> for tickets that cover the full event. Festival Passes count toward each day's capacity.
                </p>
              )}
              {tickets.map((t, i) => {
                const key = t._id || t.id;
                const assignedLabel = t.event_day_id ? getDayLabel(t.event_day_id) : null;

                if (t._saved) {
                  const isSoldOut = t.status === 'sold_out';
                  return (
                    <div key={key} className="ticket-card ticket-card-saved">
                      <div className="ticket-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="ticket-saved-check">✓</span>
                          <span className="ticket-label">{t.name || `Ticket ${i + 1}`}</span>
                          {t.price && <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>· €{parseFloat(t.price).toFixed(2)}</span>}
                          {isMultiDay && (
                            assignedLabel
                              ? <span className="day-pill">{assignedLabel}</span>
                              : <span className="day-pill festival">All Days</span>
                          )}
                          {isSoldOut && <span className="ticket-soldout-badge">Sold Out</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isSoldOut
                            ? <button type="button" className="btn-ticket-reactivate" onClick={() => updateTicket(key, 'status', 'active')}>Reactivate</button>
                            : <button type="button" className="btn-ticket-soldout" onClick={() => updateTicket(key, 'status', 'sold_out')}>Mark Sold Out</button>
                          }
                          <button type="button" className="btn-edit-ticket" onClick={() => editTicket(key)}>Edit</button>
                          {tickets.length > 1 && (
                            <button type="button" className="btn-remove" onClick={() => removeTicket(key)}>×</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={key} className="ticket-card">
                    <div className="ticket-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="ticket-label">Ticket {i + 1}</span>
                        {isMultiDay && (
                          assignedLabel
                            ? <span className="day-pill">{assignedLabel}</span>
                            : <span className="day-pill festival">All Days — Festival Pass</span>
                        )}
                      </div>
                      {tickets.length > 1 && (
                        <button type="button" className="btn-remove" onClick={() => removeTicket(key)}>×</button>
                      )}
                    </div>

                    {isMultiDay && (
                      <div className="form-group">
                        <label>Assigned To</label>
                        <select value={t.event_day_id || ''} onChange={e => updateTicket(key, 'event_day_id', e.target.value || null)}>
                          <option value="">All Days (Festival Pass)</option>
                          {days.map((d, di) => (
                            <option key={d._id || d.id} value={d._id || d.id}>
                              {d.name || `Day ${di + 1}`}{d.date ? ` — ${d.date}` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="hint">Festival Passes count against the capacity of every day.</div>
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group">
                        <label>Name</label>
                        <input value={t.name} onChange={e => updateTicket(key, 'name', e.target.value)} placeholder={isMultiDay ? 'e.g. Friday General Admission' : 'General Admission'} />
                      </div>
                      <div className="form-group">
                        <label>Price (€)</label>
                        <input type="number" min="0" step="0.01" value={t.price} onChange={e => updateTicket(key, 'price', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="label-row">
                        <label style={{ marginBottom: 0 }}>Inventory</label>
                        <span className="tip-wrap">
                          <span className="tip-icon">?</span>
                          <span className="tip-box">Max tickets of this type to sell. Leave blank for unlimited. Daily Capacity provides an additional overall limit per day.</span>
                        </span>
                      </div>
                      <input type="number" min="0" value={t.inventory} onChange={e => updateTicket(key, 'inventory', e.target.value)} placeholder="Leave blank for unlimited" />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Sale Start</label>
                        <input type="datetime-local" value={t.sale_start} onChange={e => updateTicket(key, 'sale_start', e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Sale End</label>
                        <input type="datetime-local" value={t.sale_end} onChange={e => updateTicket(key, 'sale_end', e.target.value)} />
                      </div>
                    </div>
                    <div className="ticket-save-actions">
                      <button type="button" className="btn-save-ticket" onClick={() => saveTicket(key)}>
                        Save ticket
                      </button>
                      <button type="button" className="btn-save-create" onClick={() => saveAndCreateAnother(key)}>
                        Save &amp; create another
                      </button>
                    </div>
                  </div>
                );
              })}
              {tickets.every(t => t._saved) && (
                <button type="button" className="btn-add-ticket" onClick={addTicket}>+ Add Ticket Type</button>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div>
            <div className="section">
              <div className="section-title">Status</div>
              <div className="form-group">
                <div className="status-toggle">
                  <button type="button" className={`status-btn ${event.status === 'draft' ? 'active-draft' : ''}`} onClick={() => setEv('status', 'draft')}>Draft</button>
                  <button type="button" className={`status-btn ${event.status === 'published' ? 'active-pub' : ''}`} onClick={() => setEv('status', 'published')}>Published</button>
                  <button type="button" className={`status-btn ${event.status === 'sold_out' ? 'active-soldout' : ''}`} onClick={() => setEv('status', 'sold_out')}>Sold Out</button>
                </div>
                <div className="hint">Published events are visible to the public.</div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Media</div>
              <div className="form-group">
                <ImageUpload type="thumbnail" value={event.thumbnail_url} onChange={url => setEv('thumbnail_url', url)}
                  spec={"JPG · PNG · WebP · Max 500 KB\nRecommended: 16:9, min 800×450 px"}
                  tooltip="The thumbnail appears on the event listing card — a wide landscape image works best." />
              </div>
              <div className="form-group">
                <ImageUpload type="poster" value={event.poster_url} onChange={url => setEv('poster_url', url)}
                  spec={"JPG · PNG · WebP · Max 500 KB\nRecommended: 2:3 portrait, min 600×900 px"}
                  tooltip="The poster is displayed on the event detail page, like a full event flyer." />
              </div>
            </div>

            <div className="section">
              <div className="section-title">Financials</div>
              <div className="form-group">
                <label>VAT Number</label>
                <input value={event.organiser_vat} onChange={e => setEv('organiser_vat', e.target.value.toUpperCase())} placeholder="MT12345678" />
                {event.organiser_vat && !/^MT\d{8}$/i.test(event.organiser_vat.trim()) && (
                  <div className="hint" style={{ color: '#ef4444' }}>Must be MT + 8 digits, e.g. MT12345678</div>
                )}
              </div>
              <div className="form-group">
                <label>VAT Permit</label>
                <input value={event.vat_permit || ''} onChange={e => setEv('vat_permit', e.target.value)} placeholder="e.g. VP-12345" />
              </div>
            </div>

            {/* Days summary sidebar card */}
            {isMultiDay && days.length > 0 && (
              <div className="section">
                <div className="section-title">Days Summary</div>
                {days.map((d, i) => {
                  const key = d._id || d.id;
                  const dayTix = tickets.filter(t => t.event_day_id === key || t.event_day_id === d.id);
                  const festTix = tickets.filter(t => !t.event_day_id);
                  return (
                    <div key={key} style={{ marginBottom: 10, padding: '10px 12px', background: '#f0f9ff', borderRadius: 10, border: '1.5px solid #bae6fd' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0369a1' }}>
                        {d.name || `Day ${i + 1}`}{d.date ? ` · ${d.date}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                        {dayTix.length} day ticket{dayTix.length !== 1 ? 's' : ''}
                        {festTix.length > 0 ? ` + ${festTix.length} festival pass${festTix.length !== 1 ? 'es' : ''}` : ''}
                        {d.capacity ? ` · cap: ${Number(d.capacity).toLocaleString()}` : ' · unlimited'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom save bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          {error && <div className="error" style={{ flex: 1 }}>{error}</div>}
          <button className="btn-save" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Event' : 'Save Changes'}
          </button>
        </div>
      </form>
    </>
  );
}
