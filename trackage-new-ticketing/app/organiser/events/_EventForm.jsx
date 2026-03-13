/* app/organiser/events/_EventForm.jsx — Shared event create/edit form */
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

function uid() { return Math.random().toString(36).slice(2, 9); }
function toLocalDT(s) { return s ? s.slice(0, 16) : ''; }

const BLANK_TICKET = () => ({
  _id:        uid(),
  name:       '',
  price:      '',
  inventory:  '',
  sale_start: '',
  sale_end:   '',
  disclaimer: '',
  footer_image_url: '',
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
  thumbnail_url:  '',
  poster_url:     '',
  status:         'draft',
};

const CSS = `
.ef-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-mid); text-decoration: none; margin-bottom: 20px; }
.ef-back:hover { color: var(--text); }
.ef-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
.ef-title { font-size: 20px; font-weight: 700; color: var(--text); }
.ef-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.btn-save { padding: 9px 20px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; transition: background 0.15s; }
.btn-save:hover { background: var(--accent-dark); }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-delete { padding: 9px 16px; background: #fff; color: var(--danger, #ef4444); border: 1.5px solid #fca5a5; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s; }
.btn-delete:hover { background: #fef2f2; }
.btn-preview { padding: 9px 14px; background: #fff; color: var(--text-mid); border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
.btn-preview:hover { border-color: #aaa; }
.error { background: #fef2f2; border: 1px solid #fecaca; color: #ef4444; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
.form-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
.section { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 20px; }
.section-title { font-size: 13px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 18px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { margin-bottom: 16px; }
.form-group:last-child { margin-bottom: 0; }
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
input, textarea, select { width: 100%; padding: 9px 13px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff; outline: none; transition: border-color 0.15s; }
input:focus, textarea:focus, select:focus { border-color: var(--accent); }
textarea { resize: vertical; min-height: 90px; line-height: 1.5; }
.ticket-card { border: 1.5px solid var(--border); border-radius: 10px; padding: 18px; margin-bottom: 14px; position: relative; }
.ticket-card:last-child { margin-bottom: 0; }
.ticket-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.ticket-label { font-size: 13px; font-weight: 600; color: var(--text); }
.btn-remove { background: none; border: none; cursor: pointer; color: var(--text-mid); font-size: 18px; line-height: 1; padding: 0 2px; transition: color 0.15s; }
.btn-remove:hover { color: #ef4444; }
.btn-add-ticket { width: 100%; padding: 10px; border: 1.5px dashed var(--border); border-radius: 8px; background: none; color: var(--text-mid); font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s; margin-top: 14px; }
.btn-add-ticket:hover { border-color: var(--accent); color: var(--accent); }
.status-toggle { display: flex; gap: 8px; }
.status-btn { flex: 1; padding: 8px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; cursor: pointer; background: #fff; color: var(--text-mid); transition: all 0.15s; }
.status-btn.active-draft { border-color: #d1d5db; background: #f9fafb; color: var(--text); }
.status-btn.active-pub { border-color: var(--accent); background: #f0fdf9; color: var(--accent-dark); }
.hint { font-size: 11px; color: var(--text-light); margin-top: 5px; }

/* Label with tooltip */
.label-row { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; }
.label-row label { margin-bottom: 0; }
.tip-wrap { position: relative; display: inline-flex; }
.tip-icon { width: 15px; height: 15px; border-radius: 50%; background: #e5e7eb; color: #6b7280; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; cursor: default; user-select: none; }
.tip-box { display: none; position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: #111827; color: #fff; font-size: 11px; line-height: 1.5; padding: 8px 10px; border-radius: 6px; white-space: normal; width: 220px; z-index: 10; pointer-events: none; }
.tip-box::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #111827; }
.tip-wrap:hover .tip-box { display: block; }

/* Image upload */
.upload-box { border: 1.5px dashed var(--border); border-radius: 8px; padding: 14px; cursor: pointer; transition: border-color 0.15s; text-align: center; position: relative; }
.upload-box:hover { border-color: var(--accent); }
.upload-box.has-image { border-style: solid; padding: 8px; }
.upload-box input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.upload-preview { width: 100%; border-radius: 6px; object-fit: cover; display: block; }
.upload-preview.thumb { max-height: 100px; }
.upload-preview.poster { max-height: 140px; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 6px 0; pointer-events: none; }
.upload-icon { font-size: 22px; }
.upload-cta { font-size: 12px; font-weight: 600; color: var(--accent); }
.upload-spec { font-size: 11px; color: var(--text-light); line-height: 1.4; }
.upload-change { font-size: 11px; color: var(--text-mid); margin-top: 6px; }
.upload-error { font-size: 11px; color: #ef4444; margin-top: 5px; }
.upload-spinner { font-size: 11px; color: var(--text-mid); margin-top: 5px; }

/* PlaceAutocompleteElement styling */
.pac-container-wrap { width: 100%; }
.pac-container-wrap gmp-place-autocomplete { width: 100%; }
gmp-place-autocomplete { --gmp-input-padding: 9px 13px; --gmp-input-border: 1.5px solid #e5e7eb; --gmp-input-border-radius: 8px; --gmp-input-font-size: 14px; --gmp-input-font-family: 'Inter', sans-serif; --gmp-input-color: #111827; width: 100%; }
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
      const res  = await fetch('/api/organiser/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) {
        onChange(json.url);
      } else {
        setUploadErr(json.error || 'Upload failed');
      }
    } catch {
      setUploadErr('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <div className={`label-row`}>
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

/* ── Main form ────────────────────────────────────────────────── */
function normaliseEvent(ev) {
  if (!ev) return BLANK_EVENT;
  return { ...ev, start_time: toLocalDT(ev.start_time), end_time: toLocalDT(ev.end_time) };
}
function normaliseTickets(ts) {
  const rows = ts?.length ? ts : [BLANK_TICKET()];
  return rows.map(t => ({ ...t, _id: t._id || t.id || uid(), sale_start: toLocalDT(t.sale_start), sale_end: toLocalDT(t.sale_end) }));
}

export default function EventForm({ initial, onSave, onDelete, saving, error, isNew, eventId }) {
  const [event,   setEvent]   = useState(() => normaliseEvent(initial?.event));
  const [tickets, setTickets] = useState(() => normaliseTickets(initial?.tickets));
  const venueContainerRef = useRef(null);
  const pacAttached = useRef(false);

  useEffect(() => {
    if (initial) {
      setEvent(normaliseEvent(initial.event));
      setTickets(normaliseTickets(initial.tickets));
    }
  }, [initial]);

  // Google Places autocomplete for venue (PlaceAutocompleteElement — new API)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key || !venueContainerRef.current || pacAttached.current) return;

    async function init() {
      // Load Maps JS API with loading=async if not already present
      if (!window.google) {
        await new Promise((resolve, reject) => {
          if (document.getElementById('gplaces-script')) {
            const poll = setInterval(() => { if (window.google) { clearInterval(poll); resolve(); } }, 100);
            return;
          }
          const s = document.createElement('script');
          s.id  = 'gplaces-script';
          s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async`;
          s.async = true;
          s.onload  = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
      if (!venueContainerRef.current || pacAttached.current) return;

      const pac = new PlaceAutocompleteElement({ placeholder: 'Search for a venue or type a name…' });
      venueContainerRef.current.appendChild(pac);
      pacAttached.current = true;

      pac.addEventListener('gmp-select', async (e) => {
        const place = e.placePrediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'googleMapsURI'] });
        setEv('venue_name',     place.displayName?.text || '');
        setEv('venue_maps_url', place.googleMapsURI     || '');
      });
    }

    init().catch(console.error);
  }, []);

  function setEv(field, value) { setEvent(e => ({ ...e, [field]: value })); }

  function updateTicket(key, field, value) {
    setTickets(ts => ts.map(t => (t._id || t.id) === key ? { ...t, [field]: value } : t));
  }
  function removeTicket(key) {
    setTickets(ts => ts.filter(t => (t._id || t.id) !== key));
  }
  function addTicket() {
    setTickets(ts => [...ts, BLANK_TICKET()]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!event.name?.trim()) return;
    onSave({ event, tickets });
  }

  return (
    <>
      <style>{CSS}</style>
      <Link href="/organiser/events" className="ef-back">← Back to Events</Link>

      <div className="ef-header">
        <div className="ef-title">{isNew ? 'Create Event' : 'Edit Event'}</div>
        <div className="ef-actions">
          {!isNew && eventId && (
            <a href={`/events/${eventId}`} target="_blank" rel="noreferrer" className="btn-preview">
              ↗ Preview
            </a>
          )}
          {!isNew && onDelete && (
            <button type="button" className="btn-delete" onClick={onDelete}>Delete</button>
          )}
          <button className="btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create Event' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-layout">
          {/* Left column */}
          <div>
            <div className="section">
              <div className="section-title">Event Details</div>
              <div className="form-group">
                <label>Event Name *</label>
                <input
                  value={event.name} required
                  onChange={e => setEv('name', e.target.value)}
                  placeholder="e.g. Summer Rave 2025"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={event.description}
                  onChange={e => setEv('description', e.target.value)}
                  placeholder="Tell people what to expect…"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date & Time</label>
                  <input type="datetime-local" value={event.start_time} onChange={e => setEv('start_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>End Date & Time</label>
                  <input type="datetime-local" value={event.end_time} onChange={e => setEv('end_time', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Venue Name</label>
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ? (
                  <div ref={venueContainerRef} className="pac-container-wrap" />
                ) : (
                  <input
                    value={event.venue_name}
                    onChange={e => setEv('venue_name', e.target.value)}
                    placeholder="Type a venue name…"
                  />
                )}
                <div className="hint">Search by name to auto-fill from Google, or type freely.</div>
              </div>
              <div className="form-group">
                <label>Google Maps URL</label>
                <input
                  type="url"
                  value={event.venue_maps_url}
                  onChange={e => setEv('venue_maps_url', e.target.value)}
                  placeholder="https://maps.google.com/…"
                />
              </div>
            </div>

            {/* Tickets */}
            <div className="section">
              <div className="section-title">Tickets</div>
              {tickets.map((t, i) => {
                const key = t._id || t.id;
                return (
                  <div key={key} className="ticket-card">
                    <div className="ticket-header">
                      <span className="ticket-label">Ticket {i + 1}</span>
                      {tickets.length > 1 && (
                        <button type="button" className="btn-remove" onClick={() => removeTicket(key)}>×</button>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Name</label>
                        <input value={t.name} onChange={e => updateTicket(key, 'name', e.target.value)} placeholder="General Admission" />
                      </div>
                      <div className="form-group">
                        <label>Price (€)</label>
                        <input type="number" min="0" step="0.01" value={t.price} onChange={e => updateTicket(key, 'price', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Inventory</label>
                      <input type="number" min="0" value={t.inventory} onChange={e => updateTicket(key, 'inventory', e.target.value)} placeholder="100" />
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
                    <div className="form-group">
                      <label>Disclaimer (optional)</label>
                      <textarea
                        value={t.disclaimer}
                        onChange={e => updateTicket(key, 'disclaimer', e.target.value)}
                        placeholder="Terms or conditions for this ticket…"
                        style={{ minHeight: 60 }}
                      />
                    </div>
                  </div>
                );
              })}
              <button type="button" className="btn-add-ticket" onClick={addTicket}>+ Add Ticket Type</button>
            </div>
          </div>

          {/* Right sidebar */}
          <div>
            <div className="section">
              <div className="section-title">Status</div>
              <div className="form-group">
                <div className="status-toggle">
                  <button
                    type="button"
                    className={`status-btn ${event.status === 'draft' ? 'active-draft' : ''}`}
                    onClick={() => setEv('status', 'draft')}
                  >Draft</button>
                  <button
                    type="button"
                    className={`status-btn ${event.status === 'published' ? 'active-pub' : ''}`}
                    onClick={() => setEv('status', 'published')}
                  >Published</button>
                </div>
                <div className="hint">Published events are visible to the public.</div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Media</div>
              <div className="form-group">
                <ImageUpload
                  type="thumbnail"
                  value={event.thumbnail_url}
                  onChange={url => setEv('thumbnail_url', url)}
                  spec={"JPG · PNG · WebP · Max 500 KB\nRecommended: 16:9, min 800×450 px"}
                  tooltip="The thumbnail appears on the event listing card — a wide landscape image works best."
                />
              </div>
              <div className="form-group">
                <ImageUpload
                  type="poster"
                  value={event.poster_url}
                  onChange={url => setEv('poster_url', url)}
                  spec={"JPG · PNG · WebP · Max 500 KB\nRecommended: 2:3 portrait, min 600×900 px"}
                  tooltip="The poster is displayed on the event detail page, like a full event flyer."
                />
              </div>
            </div>

            <div className="section">
              <div className="section-title">Financials</div>
              <div className="form-group">
                <label>VAT Number</label>
                <input value={event.organiser_vat} onChange={e => setEv('organiser_vat', e.target.value)} placeholder="MT12345678" />
              </div>
            </div>
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
