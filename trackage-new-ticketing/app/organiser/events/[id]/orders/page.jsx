/* app/organiser/events/[id]/orders/page.jsx — Event orders for organiser */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLES = {
  completed:       { bg: '#d1fae5', color: '#065f46' },
  pending_payment: { bg: '#fef9c3', color: '#713f12' },
  cancelled:       { bg: '#fee2e2', color: '#991b1b' },
  refunded:        { bg: '#ede9fe', color: '#4c1d95' },
  failed:          { bg: '#f3f4f6', color: '#374151' },
};

const CSS = `
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-mid); text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--text); }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.page-sub { font-size: 13px; color: var(--text-mid); }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; }
.stat-label { font-size: 11px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
.stat-val { font-size: 22px; font-weight: 700; color: var(--text); }
.stat-accent { color: var(--accent); }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-wrap input { width: 100%; padding: 9px 13px 9px 34px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; }
.search-wrap input:focus { border-color: var(--accent); }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 13px; }
.count-label { font-size: 13px; color: var(--text-mid); white-space: nowrap; }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: #fff; color: var(--text-mid); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; }
.btn-export:hover { border-color: var(--accent); color: var(--accent); }
.table-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-mid); background: #f9fafb; border-bottom: 1px solid var(--border); }
td { padding: 12px 16px; border-top: 1px solid #f3f4f6; font-size: 14px; color: var(--text); vertical-align: middle; }
tr:hover td { background: #fafafa; }
.mono { font-family: monospace; font-size: 12px; color: var(--text-mid); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.empty-state { text-align: center; padding: 48px 20px; color: var(--text-mid); font-size: 14px; }
.ticket-summary { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; }
.ticket-summary-title { font-size: 13px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
.ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.ticket-row:last-child { border-bottom: none; }
.skel { height: 14px; border-radius: 4px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media(max-width:600px) { .stats-row { grid-template-columns: 1fr 1fr; } }
`;

export default function OrgEventOrdersPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) { router.push('/organiser/login'); return; }

    fetch(`/api/organiser/events/${eventId}/orders?organiser_id=${organiser_id}`)
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  const orders   = data?.orders        || [];
  const stats    = data?.stats         || {};
  const ticketSummary = data?.ticketSummary || [];

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q)
    );
  });

  function exportCSV() {
    const rows = [['Order #', 'Status', 'Name', 'Email', 'Date', 'Total (€)']];
    for (const o of filtered) {
      rows.push([
        `#${(o.id || '').slice(0,8).toUpperCase()}`,
        o.status,
        o.customer_name  || '',
        o.customer_email || '',
        fmtDate(o.created_at),
        (o.total || 0).toFixed(2),
      ]);
    }
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `orders-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{CSS}</style>
      <Link href="/organiser/events" className="back-link">← Back to Events</Link>

      <div className="page-header">
        <div className="page-title">{loading ? 'Loading…' : data?.event?.name}</div>
        <div className="page-sub">
          {data?.event?.start_time && fmtDate(data.event.start_time)}
          {data?.event?.venue_name && ` · ${data.event.venue_name}`}
          {' · '}
          <Link href={`/organiser/events/${eventId}/attendees`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            View Attendees →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Orders</div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val">{stats.order_count || 0}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Tickets Sold</div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val">{stats.tickets_sold || 0}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue</div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val stat-accent">{fmt(stats.total_revenue)}</div>}
        </div>
      </div>

      {/* Ticket type breakdown */}
      {!loading && ticketSummary.length > 0 && (
        <div className="ticket-summary">
          <div className="ticket-summary-title">Ticket Breakdown</div>
          {ticketSummary.map((t, i) => (
            <div key={i} className="ticket-row">
              <span style={{ fontWeight: 500 }}>{t.name}</span>
              <span style={{ color: 'var(--text-mid)', fontSize: 13 }}>
                {t.sold} / {t.inventory} sold · {fmt(t.price)} each
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Orders table */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-ico">🔍</span>
          <input
            placeholder="Search by name, email or order #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="count-label">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</div>
        {orders.length > 0 && (
          <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>
        )}
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} className="skel" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">{search ? 'No orders match your search.' : 'No orders yet for this event.'}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const style = STATUS_STYLES[o.status] || STATUS_STYLES.failed;
                return (
                  <tr key={o.id}>
                    <td className="mono">#{o.id?.slice(0,8).toUpperCase()}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.customer_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>{o.customer_email}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: style.bg, color: style.color }}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-mid)', fontSize: 13 }}>{fmtDate(o.created_at)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(o.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
