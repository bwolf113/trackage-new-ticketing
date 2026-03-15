/* app/organiser/page.jsx — Organiser Dashboard */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { orgFetch } from '../../lib/organiserFetch';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateShort(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short' });
}

const CSS = `
.dash { max-width: 900px; margin: -24px; padding: 32px; }
.dash-welcome { font-size: 24px; font-weight: 800; color: var(--black); margin-bottom: 4px; letter-spacing: -0.02em; }
.dash-sub { font-size: 14px; color: var(--muted); font-weight: 500; margin-bottom: 28px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
.stat-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 20px; }
.stat-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
.stat-value { font-size: 26px; font-weight: 700; color: var(--black); }
.stat-accent { color: var(--green); font-weight: 700; }
.section-title { font-size: 15px; font-weight: 700; color: var(--black); letter-spacing: -0.01em; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
.section-link { font-size: 12px; font-weight: 600; color: var(--muted); text-decoration: none; }
.section-link:hover { color: var(--black); text-decoration: underline; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
.row-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; border-bottom: 1px solid var(--border); font-size: 14px; }
.row-item:last-child { border-bottom: none; }
.row-name { font-weight: 600; color: var(--black); }
.row-sub { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
.row-right { text-align: right; flex-shrink: 0; }
.row-amount { font-weight: 700; color: var(--green); }
.empty-state { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.badge-pub { background: var(--green-dim); color: var(--green); }
.badge-draft { background: rgba(0,0,0,0.06); color: var(--muted); }
.btn-create { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--black); color: var(--white); border: none; border-radius: 8px; font-size: 13px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; text-decoration: none; transition: opacity 0.15s; }
.btn-create:hover { opacity: 0.8; }
.skel { height: 14px; border-radius: 8px; background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media(max-width:700px) { .stats-grid { grid-template-columns: 1fr 1fr; } .two-col { grid-template-columns: 1fr; } }
@media(max-width:460px) { .stats-grid { grid-template-columns: 1fr; } }
`;

export default function OrganiserDashboard() {
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [name,    setName]    = useState('');

  useEffect(() => {
    const organiser_id = localStorage.getItem('organiser_id');
    const organiserName = localStorage.getItem('organiser_name') || '';
    setName(organiserName.split(' ')[0] || 'there');

    if (!organiser_id) { router.push('/organiser/login'); return; }

    orgFetch('/api/organiser/dashboard')
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const upcoming = data?.upcoming_events || [];
  const recent   = data?.recent_orders   || [];

  return (
    <>
      <style>{CSS}</style>
      <div className="dash">
        <div className="dash-welcome">Welcome back, {name} 👋</div>
        <div className="dash-sub">Here's what's happening with your events.</div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total Events',       value: loading ? null : stats.total_events     || 0,  accent: false },
            { label: 'Completed Orders',   value: loading ? null : stats.completed_orders || 0,  accent: false },
            { label: 'Tickets Sold',       value: loading ? null : stats.tickets_sold     || 0,  accent: false },
            { label: 'Total Revenue',      value: loading ? null : fmt(stats.total_revenue || 0), accent: true  },
          ].map(({ label, value, accent }) => (
            <div className="stat-card" key={label}>
              <div className="stat-label">{label}</div>
              {loading
                ? <div className="skel" style={{ height: 28, width: '60%' }} />
                : <div className={`stat-value ${accent ? 'stat-accent' : ''}`}>{value}</div>
              }
            </div>
          ))}
        </div>

        {/* Upcoming events + Recent orders */}
        <div className="two-col">
          <div>
            <div className="section-title">
              Upcoming Events
              <Link href="/organiser/events" className="section-link">View all →</Link>
            </div>
            <div className="card">
              {loading ? (
                <div style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3].map(i => <div key={i} className="skel" />)}
                </div>
              ) : upcoming.length === 0 ? (
                <div className="empty-state">
                  No upcoming published events.{' '}
                  <Link href="/organiser/events/new" style={{ color: 'var(--black)', fontWeight: 700 }}>Create one →</Link>
                </div>
              ) : upcoming.map(e => (
                <Link key={e.id} href={`/organiser/events/${e.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="row-item">
                    <div>
                      <div className="row-name">{e.name}</div>
                      <div className="row-sub">{fmtDate(e.start_time)} · {e.venue_name}</div>
                    </div>
                    <span className={`badge ${e.status === 'published' ? 'badge-pub' : 'badge-draft'}`}>
                      {e.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="section-title">Recent Orders</div>
            <div className="card">
              {loading ? (
                <div style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3].map(i => <div key={i} className="skel" />)}
                </div>
              ) : recent.length === 0 ? (
                <div className="empty-state">No completed orders yet.</div>
              ) : recent.map(o => (
                <div key={o.id} className="row-item">
                  <div>
                    <div className="row-name">{o.customer_name || o.customer_email || 'Guest'}</div>
                    <div className="row-sub">{o.event_name} · {fmtDateShort(o.created_at)}</div>
                  </div>
                  <div className="row-right">
                    <div className="row-amount">{fmt(o.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {stats.total_events === 0 && !loading && (
          <div style={{ textAlign: 'center', marginTop: 40, padding: '40px 24px', background: 'var(--surface)', borderRadius: 16, border: '1.5px solid var(--border)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Create your first event</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500, marginBottom: 20 }}>
              Set up your event, add ticket types, and start selling.
            </div>
            <Link href="/organiser/events/new" className="btn-create">+ Create Event</Link>
          </div>
        )}
      </div>
    </>
  );
}
