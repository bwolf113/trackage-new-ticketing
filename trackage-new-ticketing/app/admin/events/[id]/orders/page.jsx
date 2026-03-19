/* app/admin/events/[id]/orders/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '../../../../../lib/adminFetch';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtComp(n) {
  if (!n || n === 0) return '€0 (Free/Comp)';
  return fmt(n);
}
const MT = { timeZone: 'Europe/Malta' };
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...MT });
}
function fmtDateShort(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', ...MT });
}
function fmtEventDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', ...MT });
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #F5F6FA; --surface: #FFFFFF; --border: #EBEDF0;
  --muted: #767C8C; --green: #48C16E; --green-dim: rgba(72,193,110,0.12);
  --black: #000000; --white: #FFFFFF;
}
body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--black); }
.eo { font-family: 'Plus Jakarta Sans', sans-serif; }
.back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; text-decoration: none; margin-bottom: 20px; font-weight: 500; }
.back-link:hover { color: var(--black); }

/* ── Summary banner ── */
.summary-banner {
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px;
  overflow: hidden; margin-bottom: 28px;
}
.banner-header {
  background: #000000; padding: 20px 28px; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
}
.banner-event-name { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 6px; letter-spacing: -0.02em; }
.banner-meta { display: flex; flex-wrap: wrap; gap: 16px; }
.banner-meta-item { font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 500; }
.banner-meta-item strong { color: rgba(255,255,255,0.9); font-weight: 700; }
.banner-body { padding: 22px 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
@media (max-width: 700px) { .banner-body { grid-template-columns: 1fr; } }

.banner-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 14px; }
.ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.ticket-row:last-child { border-bottom: none; }
.ticket-row-name { color: var(--muted); font-weight: 500; }
.ticket-row-sold { font-weight: 700; color: var(--black); }
.ticket-row-inv { font-size: 11px; color: var(--muted); margin-left: 4px; }
.ticket-row-price { font-size: 12px; color: var(--muted); }

.totals-list { display: flex; flex-direction: column; gap: 10px; }
.total-row { display: flex; justify-content: space-between; align-items: center; }
.total-row-label { font-size: 13px; color: var(--muted); font-weight: 500; }
.total-row-value { font-size: 15px; font-weight: 700; color: var(--black); }
.total-row.highlight .total-row-label { color: var(--black); font-weight: 600; font-size: 14px; }
.total-row.highlight .total-row-value { color: var(--green); font-size: 18px; }

/* ── toolbar ── */
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.search-wrap { position: relative; flex: 1; min-width: 220px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; pointer-events: none; }
.search-input { width: 100%; padding: 8px 12px 8px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; background: var(--surface); color: var(--black); }
.search-input:focus { border-color: var(--black); }

/* ── table ── */
.table-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
.ord-table { width: 100%; border-collapse: collapse; }
.ord-table th { background: var(--bg); padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); border-bottom: 1.5px solid var(--border); white-space: nowrap; }
.ord-table td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; color: var(--black); vertical-align: middle; font-weight: 500; }
.ord-table tr:hover td { background: var(--bg); cursor: pointer; }
.mono { font-family: monospace; font-size: 12px; color: var(--muted); }
.name-cell { font-weight: 600; color: var(--black); }
.email-cell { font-size: 12px; color: var(--muted); }
.empty-state { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }
.skel { height: 16px; border-radius: 8px; background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; }
.btn-export:hover { border-color: var(--black); color: var(--black); }
`;

export default function EventOrdersPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => { fetchData(); }, [eventId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res  = await adminFetch(`/api/admin/event-orders/${eventId}`);
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
    const rows = [['Order #', 'Name', 'Email', 'Date', 'Ticket Value (€)', 'Booking Fee (€)']];
    for (const o of filtered) {
      rows.push([
        `#${(o.id || '').slice(0, 8).toUpperCase()}`,
        o.customer_name || '',
        o.customer_email || '',
        fmtDateShort(o.created_at),
        ((o.total || 0) - (o.booking_fee || 0)).toFixed(2),
        (o.booking_fee || 0).toFixed(2),
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
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>No ticket types found.</div>
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
                  <div className="total-row">
                    <span className="total-row-label">Gross Revenue</span>
                    <span className="total-row-value" style={{ fontSize: 14 }}>{fmt(stats.total_revenue)}</span>
                  </div>
                  <div className="total-row">
                    <span className="total-row-label">Ticket Face Value</span>
                    <span className="total-row-value" style={{ fontSize: 14 }}>{fmt(stats.total_ticket_rev)}</span>
                  </div>
                  <div className="total-row">
                    <span className="total-row-label">Booking Fees</span>
                    <span className="total-row-value" style={{ fontSize: 14, color: 'var(--green)' }}>{fmt(stats.total_booking_fees)}</span>
                  </div>
                  <div className="total-row">
                    <span className="total-row-label">Stripe Fees</span>
                    <span className="total-row-value" style={{ fontSize: 14, color: '#e53e3e' }}>{fmt(stats.total_stripe_fees)}</span>
                  </div>
                  <div className="total-row highlight">
                    <span className="total-row-label">Organiser Payout</span>
                    <span className="total-row-value">{fmt((stats.total_ticket_rev || 0) - (stats.total_stripe_fees || 0))}</span>
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
            <div style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
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
                    <th>Ticket Value</th>
                    <th>Booking Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/orders?order=${order.id}`)}>
                      <td><div className="mono">#{(order.id || '').slice(0, 8).toUpperCase()}</div></td>
                      <td><div className="name-cell">{order.customer_name || '—'}</div></td>
                      <td><div className="email-cell">{order.customer_email || '—'}</div></td>
                      <td style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDateShort(order.created_at)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>{fmtComp((order.total || 0) - (order.booking_fee || 0))}</td>
                      <td style={{ fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmt(order.booking_fee)}</td>
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
