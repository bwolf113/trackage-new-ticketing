/* app/organiser/events/[id]/orders/page.jsx — Event orders for organiser */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { orgFetch } from '../../../../../lib/organiserFetch';

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
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', ...MT });
}

const STATUS_STYLES = {
  completed:       { bg: 'var(--green-dim)', color: 'var(--green)' },
  pending_payment: { bg: 'rgba(0,0,0,0.06)', color: 'var(--muted)' },
  cancelled:       { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  refunded:        { bg: 'rgba(139,92,246,0.1)', color: '#7c3aed' },
  failed:          { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

const CSS = `
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); font-weight: 500; text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--black); }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 800; color: var(--black); margin-bottom: 4px; letter-spacing: -0.02em; }
.page-sub { font-size: 14px; color: var(--muted); font-weight: 500; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 16px 18px; }
.stat-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.stat-val { font-size: 22px; font-weight: 700; color: var(--black); }
.stat-accent { color: var(--green); font-weight: 700; }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-wrap input { width: 100%; padding: 9px 13px 9px 34px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; outline: none; background: var(--surface); }
.search-wrap input:focus { border-color: var(--black); }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; }
.count-label { font-size: 13px; color: var(--muted); font-weight: 500; white-space: nowrap; }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: all 0.15s; }
.btn-export:hover { border-color: var(--black); color: var(--black); }
.table-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); background: var(--bg); border-bottom: 1.5px solid var(--border); }
td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; color: var(--black); vertical-align: middle; font-weight: 500; }
tbody tr:hover td { background: var(--bg); }
tbody tr { cursor: pointer; }
.mono { font-family: monospace; font-size: 12px; color: var(--muted); }
.badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.empty-state { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }
.ticket-summary { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 18px 20px; margin-bottom: 20px; }
.ticket-summary-title { font-size: 15px; font-weight: 700; color: var(--black); letter-spacing: -0.01em; margin-bottom: 14px; }
.ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.ticket-row:last-child { border-bottom: none; }
.skel { height: 14px; border-radius: 8px; background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
/* modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
.modal { background: var(--surface); border-radius: 20px; border: 1.5px solid var(--border); width: 100%; max-width: 520px; animation: slide-up 0.2s ease; }
@keyframes slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1.5px solid var(--border); }
.modal-title { font-size: 16px; font-weight: 700; color: var(--black); }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--muted); padding: 4px 8px; border-radius: 6px; line-height: 1; }
.modal-close:hover { background: var(--bg); color: var(--black); }
.modal-body { padding: 20px 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1.5px solid var(--border); background: var(--bg); border-radius: 0 0 20px 20px; }
.field-label { font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em; }
.field-value { font-size: 14px; color: var(--black); font-weight: 500; margin-bottom: 14px; }
.field-input { width: 100%; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; margin-bottom: 12px; background: var(--surface); }
.field-input:focus { border-color: var(--black); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; }
.btn-primary { background: var(--black); color: var(--white); border: none; }
.btn-primary:hover { opacity: 0.8; }
.btn-ghost { background: var(--surface); color: var(--muted); border: 1.5px solid var(--border); }
.btn-ghost:hover { border-color: var(--black); color: var(--black); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.msg-ok  { background: var(--green-dim); color: var(--green); border-radius: 8px; padding: 9px 12px; font-size: 13px; font-weight: 700; margin-bottom: 14px; }
.msg-err { background: rgba(239,68,68,0.1); color: #ef4444; border-radius: 8px; padding: 9px 12px; font-size: 13px; font-weight: 700; margin-bottom: 14px; }
@media(min-width:700px) {
  .stats-row { grid-template-columns: repeat(5, 1fr); }
}
@media(max-width:700px) {
  .stat-val { font-size: 18px; }
  .search-wrap { min-width: 0; }
  .ticket-row { flex-direction: column; align-items: flex-start; gap: 4px; }
}
@media(max-width:640px) {
  .table-card { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { min-width: 520px; }
  .page-title { font-size: 20px; }
  .stat-card { padding: 12px 14px; }
  .stat-label { font-size: 10px; }
  .stat-val { font-size: 16px; }
  .toolbar { gap: 8px; }
  .btn-export { padding: 7px 10px; font-size: 12px; }
}
`;

function OrderModal({ order, onClose, onUpdated }) {
  const [editMode,  setEditMode]  = useState(false);
  const [editName,  setEditName]  = useState(order.customer_name  || '');
  const [editEmail, setEditEmail] = useState(order.customer_email || '');
  const [saving,    setSaving]    = useState(false);
  const [resending, setResending] = useState(false);
  const [msg,       setMsg]       = useState(null);

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleSave() {
    setSaving(true);
    const res  = await orgFetch('/api/organiser/update-order', {
      method: 'POST',
      body: JSON.stringify({ order_id: order.id, customer_name: editName, customer_email: editEmail }),
    });
    const data = await res.json();
    if (data.success) {
      flash('Customer details updated.');
      setEditMode(false);
      onUpdated?.({ ...order, customer_name: editName, customer_email: editEmail });
    } else {
      flash(data.error || 'Save failed', false);
    }
    setSaving(false);
  }

  async function handleResend() {
    setResending(true);
    const res  = await orgFetch('/api/organiser/resend-ticket', {
      method: 'POST',
      body: JSON.stringify({ order_id: order.id }),
    });
    const data = await res.json();
    if (data.success) flash(`Ticket resent to ${data.to}.`);
    else flash(data.error || 'Resend failed', false);
    setResending(false);
  }

  const style = STATUS_STYLES[order.status] || STATUS_STYLES.failed;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Order #{order.id?.slice(0,8).toUpperCase()}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginTop: 2 }}>{fmtDate(order.created_at)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge" style={{ background: style.bg, color: style.color }}>{order.status?.replace('_',' ')}</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {msg && <div className={msg.ok ? 'msg-ok' : 'msg-err'}>{msg.text}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="field-label" style={{ marginBottom: 0 }}>Customer</div>
            {!editMode
              ? <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setEditMode(true)}>✏️ Edit</button>
              : <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setEditMode(false); setEditName(order.customer_name || ''); setEditEmail(order.customer_email || ''); }} disabled={saving}>Cancel</button>
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
            }
          </div>

          {editMode ? (
            <>
              <div className="field-label">Name</div>
              <input className="field-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Customer name" />
              <div className="field-label">Email</div>
              <input className="field-input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="customer@email.com" />
            </>
          ) : (
            <>
              <div className="field-label">Name</div>
              <div className="field-value">{order.customer_name || '—'}</div>
              <div className="field-label">Email</div>
              <div className="field-value">{order.customer_email || '—'}</div>
            </>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />

          <div className="field-label">Ticket value</div>
          <div className="field-value" style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtComp((order.total || 0) - (order.booking_fee || 0))}</div>
        </div>

        <div className="modal-footer">
          {order.status === 'completed' && (
            <button className="btn btn-ghost" onClick={handleResend} disabled={resending}>
              {resending ? '⏳ Resending…' : '📧 Resend tickets'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function OrgEventOrdersPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  useEffect(() => {
    if (!(localStorage.getItem('organiser_id') || sessionStorage.getItem('organiser_id'))) { router.push('/organiser/login'); return; }

    orgFetch(`/api/organiser/events/${eventId}/orders`)
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  const orders        = data?.orders        || [];
  const stats         = data?.stats         || {};
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
        ((o.total || 0) - (o.booking_fee || 0)).toFixed(2),
      ]);
    }
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `orders-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleOrderUpdated(updated) {
    setData(d => ({
      ...d,
      orders: (d?.orders || []).map(o => o.id === updated.id ? updated : o),
    }));
    setSelectedOrder(updated);
  }

  return (
    <>
      <style>{CSS}</style>
      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={handleOrderUpdated}
        />
      )}

      <Link href="/organiser/events" className="back-link">← Back to Events</Link>

      <div className="page-header">
        <div className="page-title">{loading ? 'Loading…' : data?.event?.name}</div>
        <div className="page-sub">
          {data?.event?.start_time && fmtDate(data.event.start_time)}
          {data?.event?.venue_name && ` · ${data.event.venue_name}`}
          {' · '}
          <Link href={`/organiser/events/${eventId}/attendees`} style={{ color: 'var(--black)', fontWeight: 700, textDecoration: 'none' }}>
            View Attendees →
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Ticket Face Value</div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val stat-accent">{fmt(stats.total_revenue)}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Stripe Processing Fees <a href="https://stripe.com/pricing" target="_blank" rel="noopener noreferrer" title="View Stripe's pricing page" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: 'var(--border)', color: 'var(--muted)', fontSize: 9, fontWeight: 700, textDecoration: 'none' }}>?</a></div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val" style={{ color: 'var(--danger, #e53e3e)' }}>{fmt(stats.total_stripe_fees)}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Tickets Sold</div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val">{stats.tickets_sold || 0}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Orders</div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val">{stats.order_count || 0}</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Comp Tickets</div>
          {loading ? <div className="skel" style={{ height: 24, width: '50%' }} /> : <div className="stat-val">{stats.comp_tickets_count || 0}</div>}
        </div>
      </div>

      {/* Ticket type breakdown */}
      {!loading && ticketSummary.length > 0 && (
        <div className="ticket-summary">
          <div className="ticket-summary-title">Ticket Breakdown</div>
          {ticketSummary.map((t, i) => (
            <div key={i} className="ticket-row">
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
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
                  <tr key={o.id} onClick={() => setSelectedOrder(o)}>
                    <td className="mono">#{o.id?.slice(0,8).toUpperCase()}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.customer_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{o.customer_email}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: style.bg, color: style.color }}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>{fmtDate(o.created_at)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmtComp((o.total || 0) - (o.booking_fee || 0))}</td>
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
