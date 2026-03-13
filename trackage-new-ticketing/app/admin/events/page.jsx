/* app/admin/events/page.jsx */
'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

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
  platform_vat: '',
  booking_fee_pct: '',
  thumbnail_url: '',
  poster_url: '',
  status: 'draft',
  tickets: [BLANK_TICKET()],
});

/* ─── styles ──────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --accent:      #0a9e7f;
  --accent-dark: #087d65;
  --accent-bg:   #f0fdf9;
  --text:        #111827;
  --text-mid:    #6b7280;
  --text-light:  #9ca3af;
  --border:      #e5e7eb;
  --bg:          #f9fafb;
  --white:       #ffffff;
  --danger:      #ef4444;
  --danger-bg:   #fef2f2;
  --warning:     #f59e0b;
  --warning-bg:  #fffbeb;
  --info:        #3b82f6;
  --info-bg:     #eff6ff;
}

.ev { font-family: 'Inter', sans-serif; color: var(--text); }

/* ── page header ── */
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.page-title { font-size: 22px; font-weight: 700; }
.page-sub   { font-size: 14px; color: var(--text-mid); margin-top: 2px; }

/* ── buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 8px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; border: none;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-primary  { background: var(--accent); color: #fff; }
.btn-primary:hover  { background: var(--accent-dark); }
.btn-ghost    { background: transparent; color: var(--text-mid); border: 1.5px solid var(--border); }
.btn-ghost:hover    { border-color: var(--accent); color: var(--accent); }
.btn-danger   { background: var(--danger-bg); color: var(--danger); border: 1.5px solid #fecaca; }
.btn-danger:hover   { background: #fee2e2; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── status badge ── */
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
}
.badge-draft     { background: #f3f4f6; color: #6b7280; }
.badge-published { background: #dcfce7; color: #16a34a; }
.badge-ended     { background: #fee2e2; color: #dc2626; }

/* ── search / filter bar ── */
.toolbar {
  display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
}
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 14px; }
.search-input {
  width: 100%; padding: 9px 12px 9px 36px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 14px; font-family: 'Inter', sans-serif; color: var(--text);
  background: var(--white); outline: none;
}
.search-input:focus { border-color: var(--accent); }

.filter-select {
  padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text);
  background: var(--white); outline: none; cursor: pointer;
}
.filter-select:focus { border-color: var(--accent); }

/* ── events table ── */
.table-card {
  background: var(--white); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.ev-table { width: 100%; border-collapse: collapse; }
.ev-table th {
  background: #f9fafb; padding: 11px 16px;
  text-align: left; font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-mid); border-bottom: 1px solid var(--border);
}
.ev-table td { padding: 14px 16px; border-top: 1px solid #f3f4f6; font-size: 14px; color: #374151; vertical-align: middle; }
.ev-table tr:hover td { background: #fafafa; }

.event-thumb {
  width: 48px; height: 48px; border-radius: 8px; object-fit: cover;
  background: #f3f4f6; border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--text-light); flex-shrink: 0;
}
.event-thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }

.event-name-cell { display: flex; align-items: center; gap: 12px; }
.event-name  { font-weight: 600; color: var(--text); font-size: 14px; }
.event-slug  { font-size: 11px; color: var(--text-light); margin-top: 2px; font-family: monospace; }

.actions { display: flex; gap: 6px; }

.empty-row td { text-align: center; padding: 56px 20px; color: var(--text-light); font-size: 14px; }

/* ── modal overlay ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  z-index: 200; display: flex; align-items: flex-start; justify-content: center;
  padding: 24px 16px; overflow-y: auto;
}
.modal {
  background: var(--white); border-radius: 16px;
  width: 100%; max-width: 820px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: slide-up 0.2s ease;
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 28px; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--white);
  border-radius: 16px 16px 0 0; z-index: 10;
}
.modal-title { font-size: 18px; font-weight: 700; }
.modal-close {
  background: none; border: none; font-size: 20px;
  cursor: pointer; color: var(--text-mid); padding: 4px;
  border-radius: 6px; transition: background 0.15s;
  font-family: 'Inter', sans-serif;
}
.modal-close:hover { background: #f3f4f6; }

.modal-body { padding: 28px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 20px 28px; border-top: 1px solid var(--border);
  background: #f9fafb; border-radius: 0 0 16px 16px;
}

/* ── form ── */
.form-section {
  margin-bottom: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}
.form-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

.section-label {
  font-size: 13px; font-weight: 700; color: var(--text);
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
}
.section-label .dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
}

.form-grid { display: grid; gap: 14px; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }

.field { display: flex; flex-direction: column; gap: 5px; }
.field label {
  font-size: 12px; font-weight: 600; color: #374151;
  letter-spacing: 0.02em;
}
.field input, .field textarea, .field select {
  border: 1.5px solid var(--border); border-radius: 8px;
  padding: 9px 12px; font-size: 14px; color: var(--text);
  font-family: 'Inter', sans-serif; background: var(--white);
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
}
.field input:focus, .field textarea:focus, .field select:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px rgba(10,158,127,0.08);
}
.field textarea { resize: vertical; min-height: 90px; }
.field .hint { font-size: 11px; color: var(--text-light); margin-top: 2px; }

/* ── image upload ── */
.img-upload {
  border: 2px dashed var(--border); border-radius: 10px;
  padding: 20px; text-align: center; cursor: pointer;
  transition: border-color 0.15s, background 0.15s; position: relative;
}
.img-upload:hover { border-color: var(--accent); background: var(--accent-bg); }
.img-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.img-upload-icon { font-size: 24px; margin-bottom: 8px; }
.img-upload-text { font-size: 13px; color: var(--text-mid); }
.img-upload-hint { font-size: 11px; color: var(--text-light); margin-top: 4px; }
.img-preview {
  width: 100%; max-height: 140px; object-fit: cover;
  border-radius: 8px; display: block;
}

/* ── tickets ── */
.tickets-list { display: flex; flex-direction: column; gap: 16px; }

.ticket-card {
  border: 1.5px solid var(--border); border-radius: 10px;
  overflow: hidden; background: #fafafa;
}
.ticket-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: var(--white);
  border-bottom: 1px solid var(--border);
  cursor: pointer; user-select: none;
}
.ticket-header-left { display: flex; align-items: center; gap: 10px; }
.ticket-num {
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--accent-bg); color: var(--accent);
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.ticket-header-name { font-size: 14px; font-weight: 600; color: var(--text); }
.ticket-header-price { font-size: 13px; color: var(--text-mid); }

.ticket-body { padding: 16px; }

.add-ticket-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px;
  border: 2px dashed var(--border); border-radius: 10px;
  background: none; cursor: pointer; color: var(--accent);
  font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.add-ticket-btn:hover { border-color: var(--accent); background: var(--accent-bg); }

/* ── toast ── */
.toast {
  position: fixed; bottom: 24px; right: 24px;
  background: #111827; color: #fff;
  padding: 12px 20px; border-radius: 10px;
  font-size: 14px; font-weight: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  z-index: 999; display: flex; align-items: center; gap: 8px;
  animation: slide-up 0.2s ease;
}
.toast-success { background: var(--accent); }
.toast-error   { background: var(--danger); }

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
  background: var(--white); border-radius: 16px;
  width: 100%; max-width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
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
.preview-dot { width: 8px; height: 8px; border-radius: 50%; background: #0a9e7f; }
.preview-url {
  font-size: 11px; color: #9ca3af; font-family: monospace;
  background: #1f2937; padding: 4px 10px; border-radius: 6px;
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* public page styles scoped inside .pub- */
.pub-page { font-family: 'Inter', sans-serif; background: #0d0d0d; color: #fff; min-height: 400px; }

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
  padding: 4px 12px; border-radius: 20px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
}
.pub-pill-draft     { background: rgba(255,255,255,0.15); color: #d1d5db; backdrop-filter: blur(4px); }
.pub-pill-published { background: rgba(10,158,127,0.85); color: #fff; backdrop-filter: blur(4px); }
.pub-pill-ended     { background: rgba(239,68,68,0.85);  color: #fff; backdrop-filter: blur(4px); }

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
.pub-meta-link { color: #0a9e7f; text-decoration: none; font-weight: 500; }
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
.pub-ticket-price { font-size: 18px; font-weight: 800; color: #0a9e7f; }
.pub-ticket-fee   { font-size: 11px; color: #6b7280; margin-top: 2px; }
.pub-buy-btn {
  display: block; width: 100%;
  background: #0a9e7f; color: #fff;
  border: none; border-radius: 10px;
  padding: 14px; font-size: 15px; font-weight: 700;
  text-align: center; cursor: pointer; margin-top: 16px;
  font-family: 'Inter', sans-serif;
}
.pub-no-tickets { color: #6b7280; font-size: 14px; text-align: center; padding: 20px 0; }

/* ── delete confirm ── */
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.confirm-box {
  background: var(--white); border-radius: 12px; padding: 28px;
  max-width: 400px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: slide-up 0.15s ease;
}
.confirm-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.confirm-body  { font-size: 14px; color: var(--text-mid); margin-bottom: 24px; line-height: 1.5; }
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
function TicketCard({ ticket, index, onChange, onRemove, canRemove }) {
  const [open, setOpen] = useState(true);

  function set(field, val) {
    onChange({ ...ticket, [field]: val });
  }

  return (
    <div className="ticket-card">
      <div className="ticket-header" onClick={() => setOpen(o => !o)}>
        <div className="ticket-header-left">
          <span className="ticket-num">{index + 1}</span>
          <span className="ticket-header-name">
            {ticket.name || 'Untitled ticket'}
          </span>
          {ticket.price && (
            <span className="ticket-header-price">· €{parseFloat(ticket.price || 0).toFixed(2)}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {canRemove && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={e => { e.stopPropagation(); onRemove(); }}
            >
              Remove
            </button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-light)', alignSelf: 'center' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {open && (
        <div className="ticket-body">
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

          <div className="form-grid grid-3" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Inventory *</label>
              <input
                type="number" min="1"
                placeholder="e.g. 200"
                value={ticket.inventory}
                onChange={e => set('inventory', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Booking fee %</label>
              <input
                type="number" min="0" max="100" step="0.1"
                placeholder="e.g. 10"
                value={ticket.booking_fee_pct}
                onChange={e => set('booking_fee_pct', e.target.value)}
              />
              <span className="hint">Added on top of face price at checkout</span>
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
              <span className="hint">When this ticket appears on the front end</span>
            </div>
            <div className="field">
              <label>Sale ends</label>
              <input
                type="datetime-local"
                value={ticket.sale_end}
                onChange={e => set('sale_end', e.target.value)}
              />
              <span className="hint">When this ticket disappears from front end</span>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Disclaimer text (printed on PDF ticket)</label>
            <textarea
              placeholder="e.g. This ticket is non-refundable. Management reserves the right of admission..."
              value={ticket.disclaimer}
              onChange={e => set('disclaimer', e.target.value)}
              rows={3}
            />
          </div>

          <div className="field">
            <label>Footer image URL (printed on PDF ticket)</label>
            <input
              type="url"
              placeholder="https://..."
              value={ticket.footer_image_url}
              onChange={e => set('footer_image_url', e.target.value)}
            />
            <span className="hint">Optional — logo or sponsor banner for the ticket footer</span>
          </div>
        </div>
      )}
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
    // Normalise dates from ISO → datetime-local format
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
            sale_start: toLocalDT(t.sale_start),
            sale_end:   toLocalDT(t.sale_end),
          }))
        : [BLANK_TICKET()],
    };
  });
  const [saving, setSaving]   = useState(false);

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

  function removeTicket(i) {
    setForm(f => ({ ...f, tickets: f.tickets.filter((_, idx) => idx !== i) }));
  }

  async function handleSave() {
    if (!form.name || !form.start_time) {
      alert('Event name and start time are required.');
      return;
    }
    setSaving(true);
    try {
      const { tickets } = form;

      // Whitelist only known event columns — nothing else goes to Supabase
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
        thumbnail_url:    form.thumbnail_url     || null,
        poster_url:       form.poster_url        || null,
        status:           form.status            || 'draft',
      };

      let eventId = initial?.id;
      if (eventId) {
        const { error } = await supabase.from('events').update({
          ...eventData,
          updated_at: new Date().toISOString(),
        }).eq('id', eventId);
        if (error) throw error;
        await supabase.from('tickets').delete().eq('event_id', eventId);
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert({ ...eventData, created_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        eventId = data.id;
      }

      // Insert tickets
      if (tickets.length) {
        const rows = tickets.map(({ _id, ...t }) => {
          // Sanitise ticket date fields
          ['sale_start', 'sale_end'].forEach(k => {
            if (t[k] === '' || t[k] === undefined) t[k] = null;
          });
          return {
            ...t,
            event_id: eventId,
            price: parseFloat(t.price) || 0,
            booking_fee_pct: parseFloat(t.booking_fee_pct) || 0,
            inventory: t.inventory !== '' && t.inventory != null ? parseInt(t.inventory) : null,
            sold: t.sold || 0,
            created_at: new Date().toISOString(),
          };
        });
        const { error } = await supabase.from('tickets').insert(rows);
        if (error) throw error;
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
                <span className="hint">shop.trackagescheme.com/event/{form.slug || '…'}</span>
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

            <div className="form-grid grid-2">
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={e => setField('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
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
                <input
                  placeholder="e.g. The Grand Social, Dublin"
                  value={form.venue_name}
                  onChange={e => setField('venue_name', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Google Maps URL</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={form.venue_maps_url}
                  onChange={e => setField('venue_maps_url', e.target.value)}
                />
                <span className="hint">Paste a Google Maps share link</span>
              </div>
            </div>
          </div>

          {/* ── Organiser & VAT ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Organiser & VAT</div>
            <div className="form-grid grid-3">
              <div className="field">
                <label>Organiser</label>
                <select value={form.organiser_id} onChange={e => setField('organiser_id', e.target.value)}>
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
                  onChange={e => setField('organiser_vat', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Trackage VAT number</label>
                <input
                  placeholder="IE9876543B"
                  value={form.platform_vat}
                  onChange={e => setField('platform_vat', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Images ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Images</div>
            <div className="form-grid grid-2">
              <ImageUpload
                label="Thumbnail (homepage listing)"
                hint="Mobile-first: portrait 3:4 or square 1:1 recommended"
                value={form.thumbnail_url}
                onChange={v => setField('thumbnail_url', v)}
                bucket="event-images"
              />
              <ImageUpload
                label="Poster (event landing page)"
                hint="Mobile-first: portrait recommended"
                value={form.poster_url}
                onChange={v => setField('poster_url', v)}
                bucket="event-images"
              />
            </div>
          </div>

          {/* ── Tickets ── */}
          <div className="form-section">
            <div className="section-label"><span className="dot" /> Tickets</div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 14, lineHeight: 1.5 }}>
              Fill in each ticket type below. Click <strong>+ Add another ticket type</strong> when you're ready to add more. All tickets are saved when you click <strong>Create event</strong>.
            </div>
            <div className="tickets-list">
              {form.tickets.map((ticket, i) => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  index={i}
                  onChange={t => setTicket(i, t)}
                  onRemove={() => removeTicket(i)}
                  canRemove={form.tickets.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              className="add-ticket-btn"
              onClick={addTicket}
              style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600 }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add another ticket type
            </button>
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--accent-bg)', border: '1px solid #6ee7b7', borderRadius: 8, fontSize: 12, color: '#065f46', display: 'flex', alignItems: 'center', gap: 7 }}>
              ✓ All ticket types are saved together when you click <strong style={{ marginLeft: 2 }}>{initial ? 'Save changes' : 'Create event'}</strong> below
            </div>
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
      hour: '2-digit', minute: '2-digit',
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
              {event.status === 'published' ? '● On sale' : event.status === 'ended' ? '✕ Ended' : '○ Draft'}
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
export default function EventsPage() {
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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: evs }, { data: orgs }] = await Promise.all([
      supabase.from('events').select('*, tickets(*)').order('start_time', { ascending: false }),
      supabase.from('organisers').select('id, name').order('name'),
    ]);
    setEvents(evs || []);
    setOrganisers(orgs || []);
    setLoading(false);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete() {
    const id = deleteTarget.id;
    await supabase.from('tickets').delete().eq('event_id', id);
    await supabase.from('events').delete().eq('id', id);
    setDeleteTarget(null);
    showToast('Event deleted.');
    load();
  }

  function openEdit(ev) {
    // Map event + tickets into form shape
    const tickets = (ev.tickets || []).map(t => ({ ...t, _id: t.id || uid() }));
    setEditEvent({ ...ev, tickets: tickets.length ? tickets : [BLANK_TICKET()] });
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    setEditEvent(null);
    showToast(editEvent ? 'Event updated!' : 'Event created!');
    load();
  }

  /* filtering */
  const filtered = events.filter(ev => {
    const matchSearch = !search || ev.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || ev.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
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
          <option value="ended">Ended</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-light)', fontSize: 14 }}>Loading events…</div>
        ) : (
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
                        <div className="event-name">{ev.name}</div>
                        <div className="event-slug">{ev.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${ev.status}`}>
                      {ev.status === 'published' ? '● ' : ev.status === 'draft' ? '○ ' : '✕ '}
                      {ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{formatDate(ev.start_time)}</td>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{(ev.tickets || []).length}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-light)', marginLeft: 4 }}>types</span>
                  </td>
                  <td>
                    <div className="actions">
                      <a className="btn btn-ghost btn-sm" href={`/admin/events/${ev.id}/attendees`} style={{ textDecoration: 'none' }}>👥 Attendees</a>
                      <a className="btn btn-ghost btn-sm" href={`/admin/events/${ev.id}/orders`} style={{ textDecoration: 'none' }}>📋 Orders</a>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreviewEvent(ev)}>👁 Preview</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ev)}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(ev)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
