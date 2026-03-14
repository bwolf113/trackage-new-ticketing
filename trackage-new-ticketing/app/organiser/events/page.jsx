/* app/organiser/events/page.jsx — My Events list */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CSS = `
.ev-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.ev-title { font-size: 20px; font-weight: 700; color: var(--text); }
.btn-create { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; text-decoration: none; transition: background 0.15s; }
.btn-create:hover { background: var(--accent-dark); }
.search-bar { position: relative; margin-bottom: 20px; }
.search-bar input { width: 100%; padding: 10px 14px 10px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; background: var(--white); color: var(--text); }
.search-bar input:focus { border-color: var(--accent); }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 14px; pointer-events: none; }
.events-grid { display: flex; flex-direction: column; gap: 12px; }
.ev-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; transition: border-color 0.15s; cursor: pointer; text-decoration: none; }
.ev-card:hover { border-color: var(--accent); }
.ev-thumb { width: 56px; height: 56px; border-radius: 8px; background: #f3f4f6; object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.ev-info { flex: 1; min-width: 0; }
.ev-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev-meta { font-size: 12px; color: var(--text-mid); display: flex; gap: 12px; flex-wrap: wrap; }
.ev-actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-sm { padding: 6px 12px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; border: 1.5px solid var(--border); background: var(--white); color: var(--text-mid); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s; }
.btn-sm:hover { border-color: var(--accent); color: var(--accent); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.badge-pub { background: #d1fae5; color: #065f46; }
.badge-draft { background: #f3f4f6; color: #6b7280; }
.badge-sold_out { background: #fef2f2; color: #b91c1c; }
.empty-state { text-align: center; padding: 60px 24px; background: var(--white); border: 1px solid var(--border); border-radius: 12px; }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.empty-sub { font-size: 14px; color: var(--text-mid); margin-bottom: 24px; }
.skel { height: 80px; border-radius: 12px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media(max-width:600px) { .ev-actions { display: none; } }
`;

export default function OrganiserEventsPage() {
  const router = useRouter();
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  async function toggleSoldOut(ev, e) {
    e.preventDefault();
    e.stopPropagation();
    const organiser_id = localStorage.getItem('organiser_id');
    const newStatus = ev.status === 'sold_out' ? 'published' : 'sold_out';
    setEvents(prev => prev.map(x => x.id === ev.id ? { ...x, status: newStatus } : x));
    await fetch(`/api/organiser/events/${ev.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organiser_id, status: newStatus }),
    });
  }

  useEffect(() => {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) { router.push('/organiser/login'); return; }

    fetch(`/api/organiser/events?organiser_id=${organiser_id}`)
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
