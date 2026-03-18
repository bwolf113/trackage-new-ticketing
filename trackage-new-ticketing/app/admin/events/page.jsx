/* app/admin/events/page.jsx */
'use client';
import { Suspense } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { adminFetch } from '../../../lib/adminFetch';

/* ─── helpers ─────────────────────────────────────────────────────── */
function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const BLANK_TICKET = () => ({
  _id: uid(),
  name: '',
  price: '',
  booking_fee_pct: '',
  inventory: '',
  sale_start: '',
  sale_end: '',
  disclaimer: '',
  footer_image_url: '',
  event_day_id: null,
  status: 'active',
  _saved: false,
});

const BLANK_DAY = () => ({
  _id: uid(),
  name: '',
  date: '',
  capacity: '',
  sort_order: 0,
});

const BLANK_EVENT = () => ({
  name: '',
  slug: '',
  description: '',
  start_time: '',
  end_time: '',
  venue_name: '',
  venue_maps_url: '',
  organiser_id: '',
  organiser_vat: '',
  platform_vat: '2573-6412 (exempt)',
  booking_fee_pct: '10',
  vat_permit: '',
  thumbnail_url: '',
  poster_url: '',
  is_featured: false,
  status: 'draft',
  tickets: [BLANK_TICKET()],
});

/* ─── styles ──────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #F5F6FA;
  --surface:   #FFFFFF;
  --border:    #EBEDF0;
  --muted:     #767C8C;
  --green:     #48C16E;
  --green-dim: rgba(72,193,110,0.12);
  --black:     #000000;
  --white:     #FFFFFF;
  --danger:    #ef4444;
  --danger-bg: rgba(239,68,68,0.1);
}

.ev { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); }

/* ── page header ── */
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.page-sub   { font-size: 14px; color: var(--muted); margin-top: 2px; font-weight: 500; }

/* ── buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 8px;
  font-size: 13px; font-weight: 700;
  cursor: pointer; border: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-primary  { background: var(--black); color: var(--white); border: none; }
.btn-primary:hover  { opacity: 0.85; }
.btn-ghost    { background: var(--surface); color: var(--muted); border: 1.5px solid var(--border); }
.btn-ghost:hover    { border-color: var(--black); color: var(--black); }
.btn-danger   { background: var(--danger-bg); color: var(--danger); border: 1.5px solid #fecaca; }
.btn-danger:hover   { background: rgba(239,68,68,0.2); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── status badge ── */
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 700;
}
.badge-draft     { background: rgba(0,0,0,0.06); color: var(--muted); }
.badge-published { background: var(--green-dim); color: var(--green); }
.badge-sold_out  { background: var(--danger-bg); color: var(--danger); }
.badge-ended     { background: var(--danger-bg); color: var(--danger); }

/* ── search / filter bar ── */
.toolbar {
  display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
}
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; }
.search-input {
  width: 100%; padding: 9px 12px 9px 36px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black);
  background: var(--surface); outline: none;
}
.search-input:focus { border-color: var(--black); }

.filter-select {
  padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black);
  background: var(--surface); outline: none; cursor: pointer;
}
.filter-select:focus { border-color: var(--black); }

/* ── events table ── */
.table-card {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 16px; overflow: hidden;
}
.table-card-inner { overflow-x: auto; }
.ev-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.ev-table th {
  background: var(--bg); padding: 11px 16px;
  text-align: left; font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); border-bottom: 1.5px solid var(--border);
}
.ev-table td { padding: 14px 16px; border-top: 1px solid var(--border); font-size: 14px; color: var(--black); vertical-align: middle; font-weight: 500; }
.ev-table tr:hover td { background: var(--bg); }

.event-thumb {
  width: 48px; height: 48px; border-radius: 8px; object-fit: cover;
  background: var(--bg); border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--muted); flex-shrink: 0;
}
.event-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }

.event-name-cell { display: flex; align-items: center; gap: 12px; }
.event-name  { font-weight: 600; color: var(--black); font-size: 14px; }
.event-slug  { font-size: 11px; color: var(--muted); margin-top: 2px; font-family: monospace; }

.actions { display: flex; gap: 6px; }

.empty-row td { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }

/* ── modal overlay ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  z-index: 200; display: flex; align-items: flex-start; justify-content: center;
  padding: 24px 16px; overflow-y: auto;
}
.modal {
  background: var(--surface); border-radius: 20px; border: 1.5px solid var(--border);
  width: 100%; max-width: 820px;
  animation: slide-up 0.2s ease;
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 28px; border-bottom: 1.5px solid var(--border);
  position: sticky; top: 0; background: var(--surface);
  border-radius: 20px 20px 0 0; z-index: 10;
}
.modal-title { font-size: 18px; font-weight: 700; color: var(--black); }
.modal-close {
  background: var(--surface); border: 1.5px solid var(--border); font-size: 20px;
  cursor: pointer; color: var(--muted); padding: 4px 8px;
  border-radius: 8px; transition: all 0.15s; line-height: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.modal-close:hover { background: var(--bg); color: var(--black); border-color: var(--black); }

.modal-body { padding: 28px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 20px 28px; border-top: 1.5px solid var(--border);
  background: var(--bg); border-radius: 0 0 20px 20px;
}

/* ── form ── */
.form-section {
  margin-bottom: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}
.form-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

.section-label {
  font-size: 11px; font-weight: 700; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
}
.section-label .dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--green);
}

.form-grid { display: grid; gap: 14px; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }

.field { display: flex; flex-direction: column; gap: 5px; }
.field label {
  font-size: 12px; font-weight: 700; color: var(--black);
  letter-spacing: 0.02em;
}
.field input, .field textarea, .field select {
  border: 1.5px solid var(--border); border-radius: 8px;
  padding: 9px 12px; font-size: 14px; color: var(--black);
  font-family: 'Plus Jakarta Sans', sans-serif; background: var(--surface);
  outline: none; transition: border-color 0.15s;
  width: 100%;
}
.field input:focus, .field textarea:focus, .field select:focus {
  border-color: var(--black);
}
.field textarea { resize: vertical; min-height: 90px; }
.field .hint { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* ── image upload ── */
.img-upload {
  border: 2px dashed var(--border); border-radius: 10px;
  padding: 20px; text-align: center; cursor: pointer;
  transition: border-color 0.15s, background 0.15s; position: relative;
}
.img-upload:hover { border-color: var(--black); background: var(--bg); }
.img-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.img-upload-icon { font-size: 24px; margin-bottom: 8px; }
.img-upload-text { font-size: 13px; color: var(--muted); }
.img-upload-hint { font-size: 11px; color: var(--muted); margin-top: 4px; }
.img-preview {
  width: 100%; max-height: 140px; object-fit: cover;
  border-radius: 8px; display: block;
}

/* ── tickets ── */
.tickets-list { display: flex; flex-direction: column; gap: 16px; }

.ticket-card {
  border: 1.5px solid var(--border); border-radius: 10px;
  overflow: hidden; background: var(--bg);
}
.ticket-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: var(--surface);
  border-bottom: 1px solid var(--border);
  cursor: pointer; user-select: none;
}
.ticket-header-left { display: flex; align-items: center; gap: 10px; }
.ticket-num {
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--green-dim); color: var(--green);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.ticket-header-name { font-size: 14px; font-weight: 600; color: var(--black); }
.ticket-header-price { font-size: 13px; color: var(--muted); }

.ticket-body { padding: 16px; }

.add-ticket-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px;
  border: 2px dashed var(--border); border-radius: 10px;
  background: none; cursor: pointer; color: var(--muted);
  font-size: 14px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
}
.add-ticket-btn:hover { border-color: var(--black); color: var(--black); }

/* ── toast ── */
.toast {
  position: fixed; bottom: 24px; right: 24px;
  background: var(--black); color: var(--white);
  padding: 12px 20px; border-radius: 10px;
  font-size: 14px; font-weight: 600;
  z-index: 999; display: flex; align-items: center; gap: 8px;
  animation: slide-up 0.2s ease;
}
.toast-success { background: var(--green); }
.toast-error   { background: var(--danger); }

/* ── multi-day ── */
.multiday-toggle { display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 6px; }
.multiday-btn { flex: 1; padding: 9px 12px; border: none; background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; }
.multiday-btn:first-child { border-right: 1.5px solid var(--border); }
.multiday-btn.active { background: var(--black); color: var(--white); font-weight: 700; }
.day-card { border: 1.5px solid #bae6fd; border-radius: 10px; padding: 16px; margin-bottom: 10px; background: #f0f9ff; }
.day-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.day-card-label { font-size: 13px; font-weight: 700; color: #0369a1; display: flex; align-items: center; gap: 6px; }
.day-card-badge { background: #0369a1; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
.btn-copy-day { font-size: 11px; color: var(--muted); background: none; border: 1.5px solid var(--border); border-radius: 5px; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; padding: 3px 8px; transition: all 0.15s; }
.btn-copy-day:hover { border-color: var(--black); color: var(--black); }
.day-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #dbeafe; color: #1d4ed8; margin-left: 6px; }
.day-pill-festival { background: #fef3c7; color: #92400e; }

/* ── responsive ── */
@media (max-width: 640px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .modal-body { padding: 20px 16px; }
  .modal-header { padding: 18px 16px; }
  .modal-footer { padding: 16px; }
  .ev-table th:nth-child(3),
  .ev-table td:nth-child(3),
  .ev-table th:nth-child(4),
  .ev-table td:nth-child(4) { display: none; }
}

/* ── preview modal ── */
.preview-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 200; display: flex; align-items: flex-start; justify-content: center;
  padding: 24px 16px; overflow-y: auto;
}
.preview-shell {
  background: var(--surface); border-radius: 16px; border: 1.5px solid var(--border);
  width: 100%; max-width: 480px;
  animation: slide-up 0.2s ease;
  overflow: hidden;
}
.preview-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px;
  background: #111; color: #fff;
  font-size: 12px; font-weight: 500; gap: 10px;
}
.preview-topbar-label {
  display: flex; align-items: center; gap: 7px;
}
.preview-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.preview-url {
  font-size: 11px; color: #9ca3af; font-family: monospace;
  background: #1f2937; padding: 4px 10px; border-radius: 6px;
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* public page styles scoped inside .pub- */
.pub-page { font-family: 'Plus Jakarta Sans', sans-serif; background: #0d0d0d; color: #fff; min-height: 400px; }

.pub-poster-wrap { position: relative; width: 100%; aspect-ratio: 3/4; max-height: 420px; overflow: hidden; background: #1a1a1a; }
.pub-poster { width: 100%; height: 100%; object-fit: cover; display: block; }
.pub-poster-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 64px; background: #1a1a1a;
}
.pub-poster-gradient {
  position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
  background: linear-gradient(to top, #0d0d0d, transparent);
}
.pub-status-pill {
  position: absolute; top: 14px; left: 14px;
  padding: 4px 12px; border-radius: 100px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
}
.pub-pill-draft     { background: rgba(255,255,255,0.15); color: #d1d5db; backdrop-filter: blur(4px); }
.pub-pill-published { background: rgba(72,193,110,0.85);  color: #fff; backdrop-filter: blur(4px); }
.pub-pill-sold_out  { background: rgba(239,68,68,0.85);   color: #fff; backdrop-filter: blur(4px); }
.pub-pill-ended     { background: rgba(239,68,68,0.85);   color: #fff; backdrop-filter: blur(4px); }

.pub-content { padding: 20px 20px 32px; }

.pub-event-name {
  font-size: 26px; font-weight: 800; line-height: 1.15;
  margin-bottom: 14px; letter-spacing: -0.02em;
}

.pub-meta { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.pub-meta-row {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14px; color: #d1d5db;
}
.pub-meta-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.pub-meta-text { line-height: 1.4; }
.pub-meta-link { color: var(--green); text-decoration: none; font-weight: 500; }
.pub-meta-link:hover { text-decoration: underline; }

.pub-divider { border: none; border-top: 1px solid #2a2a2a; margin: 20px 0; }

.pub-description {
  font-size: 14px; color: #9ca3af; line-height: 1.7;
  margin-bottom: 24px; white-space: pre-wrap;
}

.pub-tickets-title {
  font-size: 16px; font-weight: 700; margin-bottom: 14px;
  display: flex; align-items: center; gap: 8px;
}

.pub-ticket-card {
  background: #1a1a1a; border: 1px solid #2a2a2a;
  border-radius: 12px; padding: 16px;
  margin-bottom: 10px; display: flex;
  align-items: center; justify-content: space-between; gap: 12px;
}
.pub-ticket-info {}
.pub-ticket-name { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
.pub-ticket-inv  { font-size: 12px; color: #6b7280; }
.pub-ticket-right { text-align: right; flex-shrink: 0; }
.pub-ticket-price { font-size: 18px; font-weight: 800; color: var(--green); }
.pub-ticket-fee   { font-size: 11px; color: #6b7280; margin-top: 2px; }
.pub-buy-btn {
  display: block; width: 100%;
  background: var(--green); color: #fff;
  border: none; border-radius: 10px;
  padding: 14px; font-size: 15px; font-weight: 700;
  text-align: center; cursor: pointer; margin-top: 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.pub-no-tickets { color: #6b7280; font-size: 14px; text-align: center; padding: 20px 0; }

/* ── pac (Google Places) ── */
.pac-container-wrap { width: 100%; }
.pac-container-wrap gmp-place-autocomplete { width: 100%; }
gmp-place-autocomplete { --gmp-input-padding: 9px 12px; --gmp-input-border: 1.5px solid var(--border); --gmp-input-border-radius: 8px; --gmp-input-font-size: 14px; --gmp-input-font-family: 'Plus Jakarta Sans', sans-serif; --gmp-input-color: var(--black); width: 100%; }
.venue-chip { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: var(--green-dim); border: 1.5px solid var(--green); border-radius: 8px; font-size: 14px; color: var(--black); }
.venue-chip-name { flex: 1; }
.venue-chip-change { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 12px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; padding: 2px 6px; border-radius: 4px; }
.venue-chip-change:hover { color: var(--black); }

/* ── ticket saved state ── */
.ticket-card-saved { background: var(--green-dim); border-color: var(--green); }
.ticket-saved-row { display: flex; align-items: center; gap: 8px; flex: 1; flex-wrap: wrap; }
.ticket-saved-check { color: var(--green); font-size: 15px; font-weight: 700; }
.ticket-save-actions { display: flex; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }

/* ── delete confirm ── */
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.confirm-box {
  background: var(--surface); border-radius: 20px; border: 1.5px solid var(--border);
  padding: 28px; max-width: 400px; width: 100%;
  animation: slide-up 0.15s ease;
}
.confirm-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--black); }
.confirm-body  { font-size: 14px; color: var(--muted); margin-bottom: 24px; line-height: 1.5; font-weight: 500; }
.confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }
`;

/* ─── ImageUpload component ──────────────────────────────────────── */
function ImageUpload({ label, hint, value, onChange, bucket = 'event-images' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${uid()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="img-upload" onClick={() => inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} onClick={e => e.stopPropagation()} />
        {value ? (
          <img src={value} alt="preview" className="img-preview" />
        ) : (
          <>
            <div className="img-upload-icon">🖼️</div>
            <div className="img-upload-text">{uploading ? 'Uploading…' : 'Click to upload image'}</div>
            <div className="img-upload-hint">{hint}</div>
          </>
        )}
      </div>
      {value && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 6, alignSelf: 'flex-start' }}
          onClick={() => onChange('')}
        >
          ✕ Remove
        </button>
      )}
    </div>
  );
}

/* ─── TicketCard component ───────────────────────────────────────── */
function TicketCard({ ticket, index, onChange, onRemove, onSaveAndCreateAnother, canRemove, days = [], isMultiDay = false }) {
  function set(field, val) {
    onChange({ ...ticket, [field]: val });
  }

  const assignedDay = isMultiDay && ticket.event_day_id
    ? days.find(d => (d._id || d.id) === ticket.event_day_id || d.id === ticket.event_day_id)
    : null;

  if (ticket._saved) {
    const isSoldOut = ticket.status === 'sold_out';
    return (
      <div className="ticket-card ticket-card-saved">
        <div className="ticket-header" style={{ cursor: 'default' }}>
          <div className="ticket-header-left">
            <span className="ticket-saved-check">✓</span>
            <span className="ticket-num">{index + 1}</span>
            <span className="ticket-header-name">{ticket.name || 'Untitled ticket'}</span>
            {isMultiDay && (
              assignedDay
                ? <span className="day-pill">{assignedDay.name || `Day ${days.indexOf(assignedDay) + 1}`}</span>
                : <span className="day-pill day-pill-festival">All Days</span>
            )}
            {ticket.price && (
              <span className="ticket-header-price">· €{parseFloat(ticket.price || 0).toFixed(2)}</span>
            )}
            {isSoldOut && (
              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fecaca' }}>Sold Out</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm"
              style={isSoldOut
                ? { background: 'var(--green-dim)', color: 'var(--green)', border: '1.5px solid var(--green)' }
                : { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1.5px solid var(--danger)' }}
              onClick={() => onChange({ ...ticket, status: isSoldOut ? 'active' : 'sold_out' })}
            >
              {isSoldOut ? 'Reactivate' : 'Mark Sold Out'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ ...ticket, _saved: false })}>
              Edit
            </button>
            {canRemove && (
              <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>Remove</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-card">
      <div className="ticket-header" style={{ cursor: 'default' }}>
        <div className="ticket-header-left">
          <span className="ticket-num">{index + 1}</span>
          <span className="ticket-header-name">{ticket.name || 'New ticket'}</span>
          {isMultiDay && (
            assignedDay
              ? <span className="day-pill">{assignedDay.name || `Day ${days.indexOf(assignedDay) + 1}`}</span>
              : <span className="day-pill day-pill-festival">All Days</span>
          )}
        </div>
        {canRemove && (
          <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>Remove</button>
        )}
      </div>

      <div className="ticket-body">
        {isMultiDay && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Assigned to day</label>
            <select
              value={ticket.event_day_id || ''}
              onChange={e => set('event_day_id', e.target.value || null)}
            >
              <option value="">All Days (Festival Pass)</option>
              {days.map((d, di) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  {d.name || `Day ${di + 1}`}{d.date ? ` — ${d.date}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="form-grid grid-2" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Ticket name *</label>
            <input
              placeholder="e.g. Early Bird, General Admission, VIP"
              value={ticket.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Face price (€) *</label>
            <input
              type="number" min="0" step="0.01"
              placeholder="0.00"
              value={ticket.price}
              onChange={e => set('price', e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid grid-2" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Inventory</label>
            <input
              type="number" min="1"
              placeholder="Leave blank for unlimited"
              value={ticket.inventory}
              onChange={e => set('inventory', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={ticket.status || 'active'} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="sold_out">Sold out</option>
            </select>
          </div>
        </div>

        <div className="form-grid grid-2" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Sale starts</label>
            <input
              type="datetime-local"
              value={ticket.sale_start}
              onChange={e => set('sale_start', e.target.value)}
            />
            <span className="hint">Leave blank to go on sale immediately</span>
          </div>
          <div className="field">
            <label>Sale ends</label>
            <input
              type="datetime-local"
              value={ticket.sale_end}
              onChange={e => set('sale_end', e.target.value)}
            />
            <span className="hint">Leave blank to end when event ends</span>
          </div>
        </div>

        <div className="ticket-save-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onChange({ ...ticket, _saved: true })}>
            Save ticket
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onSaveAndCreateAnother}>
            Save &amp; create another
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── EventForm modal ────────────────────────────────────────────── */
function toLocalDT(isoStr) {
  // Slice "2026-03-08T23:12:00+00:00" → "2026-03-08T23:12" for datetime-local input
  if (!isoStr) return '';
  return isoStr.slice(0, 16);
}

function EventForm({ event: initial, organisers, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (!initial) return BLANK_EVENT();
    return {
      ...BLANK_EVENT(),
      ...initial,
      start_time: toLocalDT(initial.start_time),
      end_time:   toLocalDT(initial.end_time),
      tickets: (initial.tickets && initial.tickets.length > 0)
        ? initial.tickets.map(t => ({
            ...BLANK_TICKET(),
            ...t,
            _id: t._id || t.id || uid(),
            _saved: true,
            sale_start: toLocalDT(t.sale_start),
            sale_end:   toLocalDT(t.sale_end),
          }))
        : [BLANK_TICKET()],
    };
  });

  // Multi-day state
  const initialDays = (initial?.days || []).map(d => ({ ...d, _id: d._id || d.id || uid() }));
  const [days, setDays]           = useState(initialDays);
  const [isMultiDay, setIsMultiDay] = useState(initialDays.length > 0);
  const [saving, setSaving]       = useState(false);

  // Venue search via server-side proxy (Places API New)
  const [venueQuery, setVenueQuery] = useState('');
  const [venuePredictions, setVenuePredictions] = useState([]);
  const [venueSearching, setVenueSearching] = useState(false);
  const venueDebounce = useRef(null);
  useEffect(() => {
    if (venueDebounce.current) clearTimeout(venueDebounce.current);
    if (!venueQuery.trim() || form.venue_name) { setVenuePredictions([]); return; }
    venueDebounce.current = setTimeout(async () => {
      setVenueSearching(true);
      try {
        const res = await adminFetch(`/api/admin/places?q=${encodeURIComponent(venueQuery)}`);
        const data = await res.json();
        setVenuePredictions(data.predictions || []);
      } catch { /* ignore */ } finally { setVenueSearching(false); }
    }, 350);
    return () => { if (venueDebounce.current) clearTimeout(venueDebounce.current); };
  }, [venueQuery, form.venue_name]);

  async function selectVenuePrediction(pred) {
    setVenuePredictions([]);
    setVenueSearching(true);
    try {
      const res = await adminFetch(`/api/admin/places?place_id=${encodeURIComponent(pred.place_id)}`);
      const data = await res.json();
      setField('venue_name', data.name || pred.description);
      setField('venue_maps_url', data.maps_url || '');
      setVenueQuery('');
    } catch {
      setField('venue_name', pred.description);
      setVenueQuery('');
    } finally { setVenueSearching(false); }
  }

  function setField(field, val) {
    setForm(f => {
      const updated = { ...f, [field]: val };
      if (field === 'name' && !initial) updated.slug = slug(val);
      return updated;
    });
  }

  function setTicket(i, ticket) {
    setForm(f => {
      const tickets = [...f.tickets];
      tickets[i] = ticket;
      return { ...f, tickets };
    });
  }

  function addTicket() {
    setForm(f => ({ ...f, tickets: [...f.tickets, BLANK_TICKET()] }));
  }

  function saveAndCreateAnother(i) {
    setForm(f => {
      const tickets = f.tickets.map((t, idx) => idx === i ? { ...t, _saved: true } : t);
      return { ...f, tickets: [...tickets, BLANK_TICKET()] };
    });
  }

  function removeTicket(i) {
    setForm(f => ({ ...f, tickets: f.tickets.filter((_, idx) => idx !== i) }));
  }

  // ── Day helpers ──────────────────────────────────────────────────
  function addDay() {
    setDays(ds => { const d = BLANK_DAY(); d.sort_order = ds.length; return [...ds, d]; });
  }
  function removeDay(key) {
    setDays(ds => ds.filter(d => (d._id || d.id) !== key));
    setForm(f => ({ ...f, tickets: f.tickets.map(t => t.event_day_id === key ? { ...t, event_day_id: null } : t) }));
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
    setDays(ds => [...ds, { ...BLANK_DAY(), capacity: source.capacity, date: nextDate, sort_order: ds.length }]);
  }
  function switchToSingleDay() {
    setIsMultiDay(false);
    setDays([]);
    setForm(f => ({ ...f, tickets: f.tickets.map(t => ({ ...t, event_day_id: null })) }));
  }
  function switchToMultiDay() {
    setIsMultiDay(true);
    if (days.length === 0) setDays([BLANK_DAY()]);
  }

  const MT_VAT_RE = /^MT\d{8}$/i;

  async function handleSave() {
    if (!form.name || !form.start_time) {
      alert('Event name and start time are required.');
      return;
    }
    if (form.organiser_vat && !MT_VAT_RE.test(form.organiser_vat.trim())) {
      alert('Invalid VAT number. Must be in the format MT12345678 (MT + 8 digits).');
      return;
    }
    setSaving(true);
    try {
      const { tickets } = form;
      const toNull = v => (v === '' || v === undefined ? null : v);
      const eventData = {
        name:             form.name,
        slug:             form.slug             || null,
        description:      form.description      || null,
        start_time:       toNull(form.start_time),
        end_time:         toNull(form.end_time),
        venue_name:       form.venue_name        || null,
        venue_maps_url:   form.venue_maps_url    || null,
        organiser_id:     form.organiser_id      || null,
        organiser_vat:    form.organiser_vat     || null,
        platform_vat:     form.platform_vat      || null,
        booking_fee_pct:  form.booking_fee_pct !== '' ? parseFloat(form.booking_fee_pct) : null,
        vat_permit:       form.vat_permit        || null,
        thumbnail_url:    form.thumbnail_url     || null,
        poster_url:       form.poster_url        || null,
        is_featured:      form.is_featured       || false,
        status:           form.status            || 'draft',
      };

      // Route all writes through the admin API (service-role key, bypasses RLS)
      if (initial?.id) {
        const res = await adminFetch(`/api/admin/events/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify({ event: eventData, tickets, days, isMultiDay }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Save failed');
      } else {
        const res = await adminFetch('/api/admin/events', {
          method: 'POST',
          body: JSON.stringify({ event: eventData, tickets, days, isMultiDay }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Create failed');
      }

      onSave();
    } catch (err) {
      console.error(err);
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{initial ? 'Edit event' : 'Add new event'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ── Basic info ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Basic info</div>
            <div className="form-grid grid-2" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Event name *</label>
                <input
                  placeholder="e.g. Rock South 2026"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                />
              </div>
              <div className="field">
                <label>URL slug *</label>
                <input
                  placeholder="rock-south-2026"
                  value={form.slug}
                  onChange={e => setField('slug', slug(e.target.value))}
                />
                <span className="hint">tickets.trackagescheme.com/events/{form.slug || '…'}</span>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Description</label>
              <textarea
                placeholder="Tell people about this event…"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={4}
              />
            </div>

            <div className="form-grid grid-2" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Start date & time *</label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={e => setField('start_time', e.target.value)}
                />
              </div>
              <div className="field">
                <label>End date & time</label>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={e => setField('end_time', e.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 14 }}>
              <label>Event type</label>
              <div className="multiday-toggle">
                <button type="button" className={`multiday-btn${!isMultiDay ? ' active' : ''}`} onClick={switchToSingleDay}>Single Day</button>
                <button type="button" className={`multiday-btn${isMultiDay ? ' active' : ''}`} onClick={switchToMultiDay}>Multi-Day / Festival</button>
              </div>
              <span className="hint">
                {isMultiDay
                  ? 'Configure each day below. Assign tickets to specific days or sell as All-Days Festival Passes.'
                  : 'Switch to Multi-Day for festivals spanning multiple dates.'}
              </span>
            </div>

            <div className="form-grid grid-2">
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => setField('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="sold_out">Sold Out</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <div className="field">
                <label>Homepage Hero</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>
                  <input
                    type="checkbox"
                    checked={form.is_featured || false}
                    onChange={e => setField('is_featured', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  Feature in homepage hero carousel
                </label>
                <span className="hint">Featured events rotate in the main hero banner on the public homepage</span>
              </div>
            </div>
            <div className="form-grid grid-2">
              <div className="field">
                <label>Platform booking fee %</label>
                <input
                  type="number" min="0" max="100" step="0.1"
                  placeholder="e.g. 10"
                  value={form.booking_fee_pct}
                  onChange={e => setField('booking_fee_pct', e.target.value)}
                />
                <span className="hint">Default for all tickets (can override per ticket)</span>
              </div>
            </div>
          </div>

          {/* ── Venue ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Venue</div>
            <div className="form-grid grid-2">
              <div className="field">
                <label>Venue name</label>
                {form.venue_name ? (
                  <div className="venue-chip">
                    <span className="venue-chip-name">📍 {form.venue_name}</span>
                    <button type="button" className="venue-chip-change" onClick={() => { setField('venue_name', ''); setField('venue_maps_url', ''); }}>× Change</button>
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
          </div>

          {/* ── Organiser & VAT ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Organiser & VAT</div>
            <div className="form-grid grid-2" style={{ marginBottom: 14 }}>
              <div className="field">
                <label>Organiser</label>
                <select
                  value={form.organiser_id}
                  onChange={e => {
                    const orgId = e.target.value;
                    setField('organiser_id', orgId);
                    if (orgId) {
                      const org = organisers.find(o => o.id === orgId);
                      if (org?.vat_number) setField('organiser_vat', org.vat_number.toUpperCase());
                    }
                  }}
                >
                  <option value="">— Select organiser —</option>
                  {organisers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Organiser VAT number</label>
                <input
                  placeholder="MT12345678"
                  value={form.organiser_vat}
                  onChange={e => setField('organiser_vat', e.target.value.toUpperCase())}
                />
                {form.organiser_vat && !/^MT\d{8}$/i.test(form.organiser_vat.trim()) && (
                  <span className="hint" style={{ color: '#ef4444' }}>Must be MT + 8 digits, e.g. MT12345678</span>
                )}
              </div>
            </div>
            <div className="form-grid grid-2">
              <div className="field">
                <label>Trackage VAT number</label>
                <input
                  placeholder="2573-6412 (exempt)"
                  value={form.platform_vat}
                  onChange={e => setField('platform_vat', e.target.value)}
                />
              </div>
              <div className="field">
                <label>VAT Permit</label>
                <input
                  placeholder="e.g. VP-12345"
                  value={form.vat_permit}
                  onChange={e => setField('vat_permit', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Images ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Images</div>
            <div className="form-grid grid-2">
              <ImageUpload
                label="Event Card Image"
                hint="Shown on homepage event cards. 16:9 landscape, min 800×450 px"
                value={form.thumbnail_url}
                onChange={v => setField('thumbnail_url', v)}
                bucket="event-images"
              />
              <ImageUpload
                label="Event Banner"
                hint="Full-width banner on event ticket page. 16:9 landscape, min 1920×1080 px"
                value={form.poster_url}
                onChange={v => setField('poster_url', v)}
                bucket="event-images"
              />
            </div>
          </div>

          {/* ── Event Days (multi-day only) ── */}
          {isMultiDay && (
            <div className="form-section">
              <div className="section-label"><span className="dot" /> Event Days</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
                Add one card per day. Set a <strong>Daily Capacity</strong> to cap total attendees for that day — Festival Passes count toward every day's cap.
              </div>
              {days.map((day, i) => {
                const key = day._id || day.id;
                return (
                  <div key={key} className="day-card">
                    <div className="day-card-header">
                      <div className="day-card-label">
                        <span className="day-card-badge">{i + 1}</span>
                        {day.name || `Day ${i + 1}`}
                        {day.date ? <span style={{ fontWeight: 400, color: '#64748b', fontSize: 12 }}>{day.date}</span> : null}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button type="button" className="btn-copy-day" onClick={() => copyDayBelow(key)}>+ Copy as next day</button>
                        {days.length > 1 && (
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeDay(key)}>Remove</button>
                        )}
                      </div>
                    </div>
                    <div className="form-grid grid-2" style={{ marginBottom: 10 }}>
                      <div className="field">
                        <label>Day label</label>
                        <input value={day.name} onChange={e => updateDay(key, 'name', e.target.value)} placeholder="e.g. Friday" />
                      </div>
                      <div className="field">
                        <label>Date</label>
                        <input type="date" value={day.date} onChange={e => updateDay(key, 'date', e.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Daily capacity</label>
                      <input
                        type="number" min="0"
                        value={day.capacity}
                        onChange={e => updateDay(key, 'capacity', e.target.value)}
                        placeholder="Leave blank for unlimited"
                      />
                      <span className="hint">Max attendees on this day. Festival Passes count against every day's cap.</span>
                    </div>
                  </div>
                );
              })}
              <button type="button" className="add-ticket-btn" onClick={addDay} style={{ marginTop: 4 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Day
              </button>
            </div>
          )}

          {/* ── Tickets ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Tickets</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
              {isMultiDay
                ? <>Assign each ticket to a specific day, or choose <strong>All Days (Festival Pass)</strong> for tickets covering the full event.</>
                : <>Fill in each ticket type below. Click <strong>+ Add another ticket type</strong> when you're ready to add more.</>
              }
            </div>
            <div className="tickets-list">
              {form.tickets.map((ticket, i) => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  index={i}
                  onChange={t => setTicket(i, t)}
                  onRemove={() => removeTicket(i)}
                  onSaveAndCreateAnother={() => saveAndCreateAnother(i)}
                  canRemove={form.tickets.length > 1}
                  days={days}
                  isMultiDay={isMultiDay}
                />
              ))}
            </div>
            {form.tickets.every(t => t._saved) && (
              <button
                type="button"
                className="add-ticket-btn"
                onClick={addTicket}
                style={{ marginTop: 12 }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add ticket type
              </button>
            )}
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : (initial ? 'Save changes' : 'Create event')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── EventPreview modal ─────────────────────────────────────────── */
function EventPreview({ event, onClose }) {
  function formatDateTime(dt) {
    if (!dt) return null;
    return new Date(dt).toLocaleDateString('en-MT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Malta',
    });
  }

  const tickets = event.tickets || [];
  const previewUrl = `trackagescheme.com/event/${event.slug || '…'}`;

  return (
    <div className="preview-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="preview-shell">

        {/* fake browser bar */}
        <div className="preview-topbar">
          <div className="preview-topbar-label">
            <span className="preview-dot" />
            <span style={{ color: '#9ca3af' }}>Live preview</span>
          </div>
          <div className="preview-url">{previewUrl}</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* public-facing event page */}
        <div className="pub-page">

          {/* poster */}
          <div className="pub-poster-wrap">
            {event.poster_url || event.thumbnail_url ? (
              <img
                src={event.poster_url || event.thumbnail_url}
                alt={event.name}
                className="pub-poster"
              />
            ) : (
              <div className="pub-poster-placeholder">🎵</div>
            )}
            <div className="pub-poster-gradient" />
            <span className={`pub-status-pill pub-pill-${event.status || 'draft'}`}>
              {event.status === 'published' ? '● On sale' : event.status === 'ended' ? '✕ Ended' : event.status === 'sold_out' ? '✕ Sold Out' : '○ Draft'}
            </span>
          </div>

          {/* content */}
          <div className="pub-content">
            <div className="pub-event-name">{event.name || 'Untitled Event'}</div>

            <div className="pub-meta">
              {event.start_time && (
                <div className="pub-meta-row">
                  <span className="pub-meta-icon">📅</span>
                  <span className="pub-meta-text">{formatDateTime(event.start_time)}{event.end_time ? ` — ${formatDateTime(event.end_time)}` : ''}</span>
                </div>
              )}
              {event.venue_name && (
                <div className="pub-meta-row">
                  <span className="pub-meta-icon">📍</span>
                  <span className="pub-meta-text">
                    {event.venue_maps_url ? (
                      <a href={event.venue_maps_url} target="_blank" rel="noreferrer" className="pub-meta-link">
                        {event.venue_name} ↗
                      </a>
                    ) : event.venue_name}
                  </span>
                </div>
              )}
            </div>

            {event.description && (
              <>
                <hr className="pub-divider" />
                <div className="pub-description">{event.description}</div>
              </>
            )}

            <hr className="pub-divider" />

            <div className="pub-tickets-title">🎫 Tickets</div>

            {tickets.length === 0 ? (
              <div className="pub-no-tickets">No tickets added yet.</div>
            ) : (
              tickets.map((t, i) => {
                const fee = parseFloat(t.booking_fee_pct) || 0;
                const price = parseFloat(t.price) || 0;
                const total = price + (price * fee / 100);
                return (
                  <div key={t._id || t.id || i} className="pub-ticket-card">
                    <div className="pub-ticket-info">
                      <div className="pub-ticket-name">{t.name || 'Ticket'}</div>
                      <div className="pub-ticket-inv">
                        {t.inventory ? `${t.inventory} available` : ''}
                      </div>
                    </div>
                    <div className="pub-ticket-right">
                      <div className="pub-ticket-price">
                        {price === 0 ? 'Free' : `€${total.toFixed(2)}`}
                      </div>
                      {fee > 0 && (
                        <div className="pub-ticket-fee">incl. {fee}% fee</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {tickets.length > 0 && (
              <button className="pub-buy-btn" disabled>Buy tickets →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DeleteConfirm ──────────────────────────────────────────────── */
function DeleteConfirm({ event, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <div className="confirm-title">Delete event?</div>
        <div className="confirm-body">
          Are you sure you want to delete <strong>{event.name}</strong>?
          This will also delete all associated tickets. This cannot be undone.
        </div>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Yes, delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────── */
function Toast({ message, type = 'success' }) {
  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? '✓' : '⚠'} {message}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */
function EventsPageInner() {
  const [events, setEvents]         = useState([]);
  const [organisers, setOrganisers] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [editEvent, setEditEvent]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewEvent, setPreviewEvent] = useState(null);
  const [toast, setToast]           = useState(null);
  const [copiedId, setCopiedId]     = useState(null);
  const searchParams = useSearchParams();
  const autoEditRef = useRef(false);

  useEffect(() => { load(); }, []);

  // Auto-open edit form when ?edit=<eventId> is in the URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || autoEditRef.current || !events.length) return;
    const ev = events.find(e => e.id === editId);
    if (ev) {
      autoEditRef.current = true;
      openEdit(ev);
    }
  }, [events, searchParams]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/events');
      const json = await res.json();
      setEvents(json.events || []);
      setOrganisers(json.organisers || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
    setLoading(false);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete() {
    const id = deleteTarget.id;
    await adminFetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    setDeleteTarget(null);
    showToast('Event deleted.');
    load();
  }

  function openEdit(ev) {
    const tickets = (ev.tickets || []).map(t => ({ ...BLANK_TICKET(), ...t, _id: t.id || uid() }));
    const days = (ev.event_days || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(d => ({ ...d, _id: d.id || uid(), capacity: d.capacity ?? '' }));
    setEditEvent({ ...ev, tickets: tickets.length ? tickets : [BLANK_TICKET()], days });
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    setEditEvent(null);
    showToast(editEvent ? 'Event updated!' : 'Event created!');
    load();
  }

  async function toggleSoldOut(ev) {
    const newStatus = ev.status === 'sold_out' ? 'published' : 'sold_out';
    setEvents(prev => prev.map(x => x.id === ev.id ? { ...x, status: newStatus } : x));
    const res = await adminFetch(`/api/admin/events/${ev.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) { showToast('Failed to update status', 'error'); load(); }
    else showToast(newStatus === 'sold_out' ? 'Event marked as sold out.' : 'Event reactivated.');
  }

  async function toggleFeatured(ev) {
    const newVal = !ev.is_featured;
    setEvents(prev => prev.map(x => x.id === ev.id ? { ...x, is_featured: newVal } : x));
    const res = await adminFetch(`/api/admin/events/${ev.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_featured: newVal }),
    });
    if (!res.ok) { showToast('Failed to update featured status', 'error'); load(); }
    else showToast(newVal ? 'Event added to homepage hero.' : 'Event removed from homepage hero.');
  }

  /* filtering */
  const filtered = events.filter(ev => {
    const matchSearch = !search || ev.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || ev.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Malta' });
  }

  return (
    <div className="ev">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Events</div>
          <div className="page-sub">{events.length} total · {events.filter(e => e.status === 'published').length} published</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditEvent(null); setShowForm(true); }}>
          + Add event
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search events…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="sold_out">Sold Out</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Loading events…</div>
        ) : (
          <div className="table-card-inner">
          <table className="ev-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Date</th>
                <th>Tickets</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={5}>
                    {search || statusFilter !== 'all' ? 'No events match your filters.' : 'No events yet. Create your first one!'}
                  </td>
                </tr>
              ) : filtered.map(ev => (
                <tr key={ev.id}>
                  <td>
                    <div className="event-name-cell">
                      <div className="event-thumb">
                        {ev.thumbnail_url
                          ? <img src={ev.thumbnail_url} alt={ev.name} />
                          : '🎵'}
                      </div>
                      <div>
                        <div className="event-name" style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'currentColor'} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'} onClick={() => openEdit(ev)}>{ev.name}</div>
                        <div className="event-slug">{ev.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${ev.status}`}>
                      {ev.status === 'published' ? '● ' : ev.status === 'draft' ? '○ ' : ev.status === 'sold_out' ? '✕ ' : '✕ '}
                      {ev.status === 'sold_out' ? 'Sold Out' : ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>{formatDate(ev.start_time)}</td>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{(ev.tickets || []).length}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>types</span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-sm"
                        style={ev.is_featured
                          ? { background: '#fef3c7', color: '#92400e', border: '1.5px solid #f59e0b' }
                          : { background: 'var(--surface)', color: 'var(--muted)', border: '1.5px solid var(--border)' }}
                        onClick={() => toggleFeatured(ev)}
                        title={ev.is_featured ? 'Remove from homepage hero' : 'Feature on homepage hero'}
                      >
                        {ev.is_featured ? '★ Featured' : '☆ Feature'}
                      </button>
                      <a className="btn btn-ghost btn-sm" href={`/admin/events/${ev.id}/attendees`} style={{ textDecoration: 'none' }}>👥 Attendees</a>
                      <a className="btn btn-ghost btn-sm" href={`/admin/events/${ev.id}/orders`} style={{ textDecoration: 'none' }}>📋 Orders</a>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        const url = `${window.location.origin}/events/${ev.slug || ev.id}`;
                        navigator.clipboard.writeText(url);
                        setCopiedId(ev.id);
                        setTimeout(() => setCopiedId(prev => prev === ev.id ? null : prev), 2000);
                      }}>{copiedId === ev.id ? '✓ Copied!' : '🔗 Copy link'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/events/${ev.slug}`, '_blank')}>👁 Preview</button>
                      <button
                        className="btn btn-sm"
                        style={ev.status === 'sold_out'
                          ? { background: 'var(--green-dim)', color: 'var(--green)', border: '1.5px solid var(--green)' }
                          : { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1.5px solid var(--danger)' }}
                        onClick={() => toggleSoldOut(ev)}
                      >
                        {ev.status === 'sold_out' ? '▶ Reactivate' : '✕ Mark Sold Out'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(ev)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Preview modal ── */}
      {previewEvent && (
        <EventPreview
          event={previewEvent}
          onClose={() => setPreviewEvent(null)}
        />
      )}

      {/* ── Form modal ── */}
      {showForm && (
        <EventForm
          event={editEvent}
          organisers={organisers}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditEvent(null); }}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <DeleteConfirm
          event={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense>
      <EventsPageInner />
    </Suspense>
  );
}
