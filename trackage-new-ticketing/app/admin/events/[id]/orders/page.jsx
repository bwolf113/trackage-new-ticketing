/* app/admin/events/[id]/orders/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtEventDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --accent: #0a9e7f; --accent-bg: #f0fdf9;
  --text: #111827; --text-mid: #6b7280; --text-light: #9ca3af;
  --border: #e5e7eb; --bg: #f9fafb; --white: #fff;
}
body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }
.eo { font-family: 'Inter', sans-serif; }
.back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--text-mid); font-size: 13px; text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--accent); }

/* ── Summary banner ── */
.summary-banner {
  background: var(--white); border: 1px solid var(--border); border-radius: 14px;
  overflow: hidden; margin-bottom: 28px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.banner-header {
  background: #0a0a0a; padding: 20px 28px; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
}
.banner-event-name { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 6px; }
.banner-meta { display: flex; flex-wrap: wrap; gap: 16px; }
.banner-meta-item { font-size: 12px; color: rgba(255,255,255,0.6); }
.banner-meta-item strong { color: rgba(255,255,255,0.9); }
.banner-body { padding: 22px 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
@media (max-width: 700px) { .banner-body { grid-template-columns: 1fr; } }

.banner-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-light); margin-bottom: 14px; }
.ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
.ticket-row:last-child { border-bottom: none; }
.ticket-row-name { color: var(--text-mid); }
.ticket-row-sold { font-weight: 700; color: var(--text); }
.ticket-row-inv { font-size: 11px; color: var(--text-light); margin-left: 4px; }
.ticket-row-price { font-size: 12px; color: var(--text-light); }

.totals-list { display: flex; flex-direction: column; gap: 10px; }
.total-row { display: flex; justify-content: space-between; align-items: center; }
.total-row-label { font-size: 13px; color: var(--text-mid); }
.total-row-value { font-size: 15px; font-weight: 700; color: var(--text); }
.total-row.highlight .total-row-label { color: var(--text); font-weight: 600; font-size: 14px; }
.total-row.highlight .total-row-value { color: var(--accent); font-size: 18px; }

/* ── toolbar ── */
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.search-wrap { position: relative; flex: 1; min-width: 220px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 14px; pointer-events: none; }
.search-input { width: 100%; padding: 9px 12px 9px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; background: var(--white); color: var(--text); }
.search-input:focus { border-color: var(--accent); }

/* ── table ── */
.table-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.ord-table { width: 100%; border-collapse: collapse; }
.ord-table th { background: #f9fafb; padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-mid); border-bottom: 1px solid var(--border); white-space: nowrap; }
.ord-table td { padding: 12px 16px; border-top: 1px solid #f3f4f6; font-size: 14px; color: #374151; vertical-align: middle; }
.ord-table tr:hover td { background: #fafafa; }
.mono { font-family: monospace; font-size: 12px; color: var(--text-mid); }
.name-cell { font-weight: 600; }
.email-cell { font-size: 12px; color: var(--text-light); }
.empty-state { text-align: center; padding: 56px 20px; color: var(--text-light); font-size: 14px; }
.skel { height: 16px; border-radius: 4px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--white); color: var(--text-mid); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; }
.btn-export:hover { border-color: var(--accent); color: var(--accent); }
`;

export default function EventOrdersPage() {
  const { id: eventId } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => { fetchData(); }, [eventId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/event-orders/${eventId}`);
      const json = await res.json();
      setData(json);
    } catch {}
    setLoading(false);
  }

  const orders        = data?.orders || [];
  const ticketSummary = data?.ticketSummary || [];
  const stats         = data?.stats || {};
  const event         = data?.event;

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
    const rows = [['Order #', 'Name', 'Email', 'Date', 'Total (€)']];
    for (const o of filtered) {
      rows.push([
        `#${(o.id || '').slice(0, 8).toUpperCase()}`,
        o.customer_name || '',
        o.customer_email || '',
        fmtDateShort(o.created_at),
        (o.total || 0).toFixed(2),
      ]);
    }
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `orders-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="eo">
      <style>{CSS}</style>

      <Link href="/admin/events" className="back-link">← Back to Events</Link>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skel" style={{ width: `${50 + (i % 4) * 12}%`, height: 20 }} />)}
        </div>
      ) : (
        <>
          {/* ── Event Summary Banner ── */}
          <div className="summary-banner">
            <div className="banner-header">
              <div>
                <div className="banner-event-name">{event?.name || '—'}</div>
                <div className="banner-meta">
                  {event?.start_time && <div className="banner-meta-item">📅 <strong>{fmtEventDate(event.start_time)}</strong></div>}
                  {event?.venue_name  && <div className="banner-meta-item">📍 <strong>{event.venue_name}</strong></div>}
                  {event?.organisers?.name && <div className="banner-meta-item">👤 <strong>{event.organisers.name}</strong></div>}
                  <div className="banner-meta-item">🆔 <strong>{eventId?.slice(0, 8).toUpperCase()}</strong></div>
                </div>
              </div>
            </div>

            <div className="banner-body">
              {/* Ticket Sales */}
              <div>
                <div className="banner-section-title">Ticket Sales — {stats.tickets_sold || 0} sold</div>
                {ticketSummary.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-light)' }}>No ticket types found.</div>
                ) : ticketSummary.map((t, i) => (
                  <div key={i} className="ticket-row">
                    <div>
                      <span className="ticket-row-name">{t.name}</span>
                      <span className="ticket-row-price"> ({fmt(t.price)})</span>
                    </div>
                    <div>
                      <span className="ticket-row-sold">{t.sold}</span>
                      {t.inventory ? <span className="ticket-row-inv">of {t.inventory}</span> : <span className="ticket-row-inv">unlimited</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div>
                <div className="banner-section-title">Revenue</div>
                <div className="totals-list">
                  <div className="total-row">
                    <span className="total-row-label">Completed orders</span>
                    <span className="total-row-value" style={{ fontSize: 14 }}>{stats.order_count || 0}</span>
                  </div>
                  <div className="total-row highlight">
                    <span className="total-row-label">Total Revenue</span>
                    <span className="total-row-value">{fmt(stats.total_revenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Orders Table ── */}
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by name, email or order #…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
              {filtered.length} order{filtered.length !== 1 ? 's' : ''}
            </div>
            {orders.length > 0 && (
              <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>
            )}
          </div>

          <div className="table-card">
            {filtered.length === 0 ? (
              <div className="empty-state">{search ? 'No orders match your search.' : 'No orders for this event yet.'}</div>
            ) : (
              <table className="ord-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Date</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id}>
                      <td><div className="mono">#{(order.id || '').slice(0, 8).toUpperCase()}</div></td>
                      <td><div className="name-cell">{order.customer_name || '—'}</div></td>
                      <td><div className="email-cell">{order.customer_email || '—'}</div></td>
                      <td style={{ fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{fmtDateShort(order.created_at)}</td>
                      <td style={{ fontWeight: 600, color: '#0a9e7f', whiteSpace: 'nowrap' }}>{fmt(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
