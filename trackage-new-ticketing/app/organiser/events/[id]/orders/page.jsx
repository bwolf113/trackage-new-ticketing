/* app/organiser/events/[id]/orders/page.jsx — Event orders for organiser */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtComp(n) {
  if (!n || n === 0) return '€0 (Free/Comp)';
  return fmt(n);
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
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
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
tbody tr:hover td { background: #fafafa; }
tbody tr { cursor: pointer; }
.mono { font-family: monospace; font-size: 12px; color: var(--text-mid); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.empty-state { text-align: center; padding: 48px 20px; color: var(--text-mid); font-size: 14px; }
.ticket-summary { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; }
.ticket-summary-title { font-size: 13px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
.ticket-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
.ticket-row:last-child { border-bottom: none; }
.skel { height: 14px; border-radius: 4px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
/* modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slide-up 0.2s ease; }
@keyframes slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 16px; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-mid); padding: 4px 8px; border-radius: 6px; line-height: 1; }
.modal-close:hover { background: #f3f4f6; }
.modal-body { padding: 20px 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--border); background: #f9fafb; border-radius: 0 0 16px 16px; }
.field-label { font-size: 11px; font-weight: 600; color: var(--text-light); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.field-value { font-size: 14px; color: var(--text); font-weight: 500; margin-bottom: 14px; }
.field-input { width: 100%; padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 7px; font-size: 14px; font-family: 'Inter',sans-serif; outline: none; margin-bottom: 12px; }
.field-input:focus { border-color: var(--accent); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: 'Inter',sans-serif; transition: all 0.15s; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-dark); }
.btn-ghost { background: transparent; color: var(--text-mid); border: 1.5px solid var(--border); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.msg-ok  { background: #dcfce7; color: #16a34a; border-radius: 7px; padding: 9px 12px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
.msg-err { background: #fee2e2; color: #dc2626; border-radius: 7px; padding: 9px 12px; font-size: 13px; font-weight: 600; margin-bottom: 14px; }
@media(max-width:700px) { .stats-row { grid-template-columns: 1fr 1fr; } }
`;

function OrderModal({ order, organiser_id, onClose, onUpdated }) {
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
    const res  = await fetch('/api/organiser/update-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, organiser_id, customer_name: editName, customer_email: editEmail }),
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
    const res  = await fetch('/api/organiser/resend-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, organiser_id }),
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
            <div style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2 }}>{fmtDate(order.created_at)}</div>
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

          <div className="field-label">Total paid</div>
          <div className="field-value" style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmtComp(order.total)}</div>
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
  const [organiser_id,  setOrganiserId]   = useState('');

  useEffect(() => {
    const oid = localStorage.getItem('organiser_id');
    if (!oid) { router.push('/organiser/login'); return; }
    setOrganiserId(oid);

    fetch(`/api/organiser/events/${eventId}/orders?organiser_id=${oid}`)
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
        (o.total || 0).toFixed(2),
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
          organiser_id={organiser_id}
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
                  <tr key={o.id} onClick={() => setSelectedOrder(o)}>
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
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtComp(o.total)}</td>
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
