/* app/organiser/events/page.jsx — My Events list */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { orgFetch } from '../../../lib/organiserFetch';

const MT = { timeZone: 'Europe/Malta' };
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', ...MT });
}

const CSS = `
.ev-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.ev-title { font-size: 24px; font-weight: 800; color: var(--black); letter-spacing: -0.02em; }
.btn-create { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--black); color: var(--white); border: none; border-radius: 8px; font-size: 13px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; text-decoration: none; transition: opacity 0.15s; }
.btn-create:hover { opacity: 0.8; }
.search-bar { position: relative; margin-bottom: 20px; }
.search-bar input { width: 100%; padding: 10px 14px 10px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; background: var(--surface); color: var(--black); font-weight: 500; }
.search-bar input:focus { border-color: var(--black); }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; pointer-events: none; }
.events-grid { display: flex; flex-direction: column; gap: 12px; }
.ev-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; transition: border-color 0.15s; cursor: pointer; text-decoration: none; }
.ev-card:hover { border-color: var(--black); }
.ev-thumb { width: 56px; height: 56px; border-radius: 8px; background: var(--bg); object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.ev-info { flex: 1; min-width: 0; }
.ev-name { font-size: 15px; font-weight: 700; color: var(--black); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev-meta { font-size: 12px; color: var(--muted); font-weight: 500; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.ev-actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-sm { padding: 6px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s; }
.btn-sm:hover { border-color: var(--black); color: var(--black); }
.btn-copy { padding: 6px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s; }
.btn-copy:hover { border-color: var(--black); color: var(--black); }
.btn-copy.copied { border-color: var(--green); color: var(--green); background: rgba(72,193,110,0.08); }
.badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.badge-pub { background: var(--green-dim); color: var(--green); }
.badge-draft { background: rgba(0,0,0,0.06); color: var(--muted); }
.badge-sold_out { background: rgba(239,68,68,0.1); color: #ef4444; }
.empty-state { text-align: center; padding: 56px 24px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; color: var(--muted); font-size: 14px; font-weight: 500; }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-title { font-size: 17px; font-weight: 800; margin-bottom: 8px; color: var(--black); letter-spacing: -0.02em; }
.empty-sub { font-size: 14px; color: var(--muted); font-weight: 500; margin-bottom: 24px; }
.skel { height: 80px; border-radius: 16px; background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media(max-width:600px) {
  .ev-card { flex-wrap: wrap; }
  .ev-actions { width: 100%; overflow-x: auto; padding-bottom: 2px; flex-shrink: 0; scrollbar-width: none; }
  .ev-actions::-webkit-scrollbar { display: none; }
}
`;

export default function OrganiserEventsPage() {
  const router = useRouter();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [copiedId, setCopiedId] = useState(null);

  function copyEventLink(ev, e) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/events/${ev.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(ev.id);
    setTimeout(() => setCopiedId(prev => prev === ev.id ? null : prev), 2000);
  }

  async function toggleSoldOut(ev, e) {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = ev.status === 'sold_out' ? 'published' : 'sold_out';
    setEvents(prev => prev.map(x => x.id === ev.id ? { ...x, status: newStatus } : x));
    await orgFetch(`/api/organiser/events/${ev.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
  }

  useEffect(() => {
    if (!localStorage.getItem('organiser_id')) { router.push('/organiser/login'); return; }

    orgFetch('/api/organiser/events')
      .then(r => r.json())
      .then(json => { setEvents(json.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name?.toLowerCase().includes(q) || e.venue_name?.toLowerCase().includes(q);
  });

  return (
    <>
      <style>{CSS}</style>

      <div className="ev-header">
        <div className="ev-title">My Events</div>
        <Link href="/organiser/events/new" className="btn-create">+ New Event</Link>
      </div>

      {!loading && events.length > 0 && (
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search events…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skel" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎫</div>
          <div className="empty-title">{search ? 'No events match your search' : 'No events yet'}</div>
          <div className="empty-sub">{search ? 'Try a different search term.' : 'Create your first event to start selling tickets.'}</div>
          {!search && <Link href="/organiser/events/new" className="btn-create">+ Create Event</Link>}
        </div>
      ) : (
        <div className="events-grid">
          {filtered.map(ev => (
            <Link key={ev.id} href={`/organiser/events/${ev.id}`} className="ev-card">
              <div className="ev-thumb">
                {ev.thumbnail_url
                  ? <img src={ev.thumbnail_url} alt={ev.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  : '🎫'
                }
              </div>
              <div className="ev-info">
                <div className="ev-name">{ev.name}</div>
                <div className="ev-meta">
                  <span>📅 {fmtDate(ev.start_time)}</span>
                  {ev.venue_name && <span>📍 {ev.venue_name}</span>}
                  <span>🎟 {ev.completed_orders} order{ev.completed_orders !== 1 ? 's' : ''}</span>
                  <span className={`badge ${ev.status === 'published' ? 'badge-pub' : ev.status === 'sold_out' ? 'badge-sold_out' : 'badge-draft'}`}>{ev.status === 'sold_out' ? 'Sold Out' : ev.status}</span>
                </div>
              </div>
              <div className="ev-actions">
                <button
                  className={`btn-copy${copiedId === ev.id ? ' copied' : ''}`}
                  onClick={e => copyEventLink(ev, e)}
                >
                  {copiedId === ev.id ? '✓ Copied!' : '🔗 Copy link'}
                </button>
                <Link
                  href={`/organiser/events/${ev.id}/orders`}
                  className="btn-sm"
                  onClick={e => e.stopPropagation()}
                >
                  Orders
                </Link>
                <Link
                  href={`/organiser/events/${ev.id}/attendees`}
                  className="btn-sm"
                  onClick={e => e.stopPropagation()}
                >
                  Attendees
                </Link>
                <Link
                  href={`/organiser/events/${ev.id}/stats`}
                  className="btn-sm"
                  onClick={e => e.stopPropagation()}
                >
                  Stats
                </Link>
                <Link
                  href={`/organiser/events/${ev.id}/comps`}
                  className="btn-sm"
                  onClick={e => e.stopPropagation()}
                >
                  Issue Comps
                </Link>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
