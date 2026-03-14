/* app/admin/orders/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { isSampleMode, setSampleMode, getSampleOrders, getSampleEvents } from '../../../lib/sampleData';

/* ─── helpers ────────────────────────────────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtDateShort(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const STATUS_TABS = [
  { key: 'all',             label: 'All orders' },
  { key: 'completed',       label: 'Completed' },
  { key: 'pending_payment', label: 'Pending' },
  { key: 'cancelled',       label: 'Cancelled' },
  { key: 'refunded',        label: 'Refunded' },
  { key: 'failed',          label: 'Failed' },
];

const STATUS_META = {
  completed:       { label: 'Completed',  color: '#16a34a', bg: '#dcfce7' },
  pending_payment: { label: 'Pending',    color: '#d97706', bg: '#fef3c7' },
  cancelled:       { label: 'Cancelled',  color: '#6b7280', bg: '#f3f4f6' },
  refunded:        { label: 'Refunded',   color: '#7c3aed', bg: '#ede9fe' },
  failed:          { label: 'Failed',     color: '#dc2626', bg: '#fee2e2' },
};

/* ─── styles ─────────────────────────────────────────────────────── */
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
}

.ord { font-family: 'Inter', sans-serif; color: var(--text); }

/* ── page header ── */
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.page-title { font-size: 22px; font-weight: 700; }
.page-sub   { font-size: 14px; color: var(--text-mid); margin-top: 2px; }

/* ── summary cards ── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.summary-card {
  background: var(--white); border: 1px solid var(--border);
  border-radius: 10px; padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.summary-label { font-size: 11px; font-weight: 600; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.summary-value { font-size: 22px; font-weight: 700; color: var(--text); line-height: 1; }
.summary-value.green  { color: #16a34a; }
.summary-value.purple { color: #7c3aed; }
.summary-value.red    { color: #dc2626; }
.summary-value.amber  { color: #d97706; }

/* ── toolbar ── */
.toolbar {
  display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
}
.search-wrap { position: relative; flex: 1; min-width: 220px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 14px; pointer-events: none; }
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

/* ── tabs ── */
.tabs {
  display: flex; gap: 2px; margin-bottom: 16px;
  border-bottom: 2px solid var(--border);
  overflow-x: auto; padding-bottom: 0;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }

.tab {
  padding: 10px 16px; font-size: 13px; font-weight: 500;
  color: var(--text-mid); border: none; background: none;
  cursor: pointer; font-family: 'Inter', sans-serif;
  white-space: nowrap; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all 0.15s;
  display: flex; align-items: center; gap: 6px;
}
.tab:hover { color: var(--text); }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

.tab-count {
  background: var(--bg); color: var(--text-mid);
  font-size: 11px; font-weight: 600;
  padding: 1px 7px; border-radius: 10px;
  border: 1px solid var(--border);
}
.tab.active .tab-count { background: var(--accent-bg); color: var(--accent); border-color: var(--accent); }

/* ── table ── */
.table-card {
  background: var(--white); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.ord-table { width: 100%; border-collapse: collapse; }
.ord-table th {
  background: #f9fafb; padding: 11px 16px;
  text-align: left; font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-mid); border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.ord-table td {
  padding: 13px 16px; border-top: 1px solid #f3f4f6;
  font-size: 14px; color: #374151; vertical-align: middle;
}
.ord-table tr:hover td { background: #fafafa; cursor: pointer; }

.order-id { font-family: monospace; font-size: 12px; color: var(--text-mid); }
.order-customer { font-weight: 600; color: var(--text); font-size: 14px; }
.order-email { font-size: 12px; color: var(--text-light); margin-top: 1px; }

.status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; white-space: nowrap;
}

.empty-state {
  text-align: center; padding: 56px 20px;
  color: var(--text-light); font-size: 14px;
}

/* ── sample mode banner ── */
.sample-banner {
  display: flex; align-items: center; justify-content: space-between;
  background: #fef9c3; border: 1.5px solid #fde047;
  border-radius: 10px; padding: 11px 16px; margin-bottom: 20px;
  flex-wrap: wrap; gap: 10px;
}
.sample-banner-left { display: flex; align-items: center; gap: 10px; }
.sample-banner-title { font-size: 13px; font-weight: 700; color: #713f12; }
.sample-banner-sub   { font-size: 12px; color: #92400e; margin-top: 1px; }
.sample-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sample-toggle-track {
  position: relative; width: 44px; height: 24px;
  background: #d1d5db; border-radius: 24px; cursor: pointer; transition: background 0.2s;
}
.sample-toggle-track.on { background: #f59e0b; }
.sample-toggle-thumb {
  position: absolute; width: 18px; height: 18px; top: 3px; left: 3px;
  background: #fff; border-radius: 50%; transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.sample-toggle-track.on .sample-toggle-thumb { transform: translateX(20px); }
.sample-label-off { color: #6b7280; }
.sample-label-on  { color: #92400e; font-weight: 700; }

/* ── buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 8px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; border: none;
  font-family: 'Inter', sans-serif;
  transition: all 0.15s; white-space: nowrap;
}
.btn-ghost  { background: transparent; color: var(--text-mid); border: 1.5px solid var(--border); }
.btn-ghost:hover  { border-color: var(--accent); color: var(--accent); }
.btn-danger { background: var(--danger-bg); color: var(--danger); border: 1.5px solid #fecaca; }
.btn-danger:hover { background: #fee2e2; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── order detail modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  z-index: 200; display: flex; align-items: flex-start; justify-content: center;
  padding: 24px 16px; overflow-y: auto;
}
.modal {
  background: var(--white); border-radius: 16px;
  width: 100%; max-width: 640px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: slide-up 0.2s ease;
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 28px; border-bottom: 1px solid var(--border);
}
.modal-title { font-size: 17px; font-weight: 700; }
.modal-title-sub { font-size: 12px; color: var(--text-light); font-family: monospace; margin-top: 2px; }
.modal-close {
  background: none; border: none; font-size: 20px;
  cursor: pointer; color: var(--text-mid); padding: 4px 8px;
  border-radius: 6px; transition: background 0.15s; line-height: 1;
}
.modal-close:hover { background: #f3f4f6; }
.modal-body { padding: 24px 28px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 18px 28px; border-top: 1px solid var(--border);
  background: #f9fafb; border-radius: 0 0 16px 16px;
}

/* ── detail sections ── */
.detail-section { margin-bottom: 24px; }
.detail-section:last-child { margin-bottom: 0; }
.detail-section-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--text-light);
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
}
.detail-section-title::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.detail-field {}
.detail-field-label { font-size: 11px; font-weight: 600; color: var(--text-light); margin-bottom: 3px; }
.detail-field-value { font-size: 14px; color: var(--text); font-weight: 500; }
.detail-field-value.mono { font-family: monospace; font-size: 12px; }

/* ── order items table ── */
.items-table { width: 100%; border-collapse: collapse; }
.items-table th {
  font-size: 11px; font-weight: 600; color: var(--text-light);
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 0 0 8px; text-align: left; border-bottom: 1px solid var(--border);
}
.items-table td {
  padding: 10px 0; border-bottom: 1px solid #f3f4f6;
  font-size: 14px; color: var(--text);
}
.items-table tr:last-child td { border-bottom: none; }

.totals-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; font-size: 14px; color: var(--text-mid);
}
.totals-row.total {
  font-size: 16px; font-weight: 700; color: var(--text);
  border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px;
}

/* ── confirm overlay ── */
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
.confirm-title  { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.confirm-body   { font-size: 14px; color: var(--text-mid); margin-bottom: 24px; line-height: 1.6; }
.confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }

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

/* ── skeleton ── */
.skel {
  height: 16px; border-radius: 4px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── stripe link ── */
.stripe-link {
  display: inline-flex; align-items: center; gap: 5px;
  color: var(--accent); font-size: 13px; text-decoration: none; font-weight: 500;
}
.stripe-link:hover { text-decoration: underline; }

/* ── pagination ── */
.pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-top: 1px solid var(--border);
  font-size: 13px; color: var(--text-mid);
}
.page-btns { display: flex; gap: 6px; }
.page-btn {
  padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 6px;
  background: var(--white); color: var(--text-mid); font-size: 13px;
  font-family: 'Inter', sans-serif; cursor: pointer; font-weight: 500;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn.current { background: var(--accent); border-color: var(--accent); color: #fff; }

/* ── responsive ── */
@media (max-width: 768px) {
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .ord-table th:nth-child(4),
  .ord-table td:nth-child(4),
  .ord-table th:nth-child(5),
  .ord-table td:nth-child(5) { display: none; }
  .modal-body { padding: 20px 16px; }
  .modal-header { padding: 18px 16px; }
  .modal-footer { padding: 16px; }
  .detail-grid { grid-template-columns: 1fr; }
}
`;

const PAGE_SIZE = 20;

/* ─── StatusBadge ────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span className="status-badge" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

/* ─── OrderDetail modal ──────────────────────────────────────────── */
function OrderDetail({ orderId, onClose, onStatusChange }) {
  const [order,         setOrder]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [editMode,      setEditMode]      = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editEmail,     setEditEmail]     = useState('');
  const [saving,        setSaving]        = useState(false);
  const [resending,     setResending]     = useState(false);
  const [noteType,      setNoteType]      = useState('private');
  const [noteContent,   setNoteContent]   = useState('');
  const [savingNote,    setSavingNote]    = useState(false);
  const [showRefund,    setShowRefund]    = useState(false);
  const [refundType,    setRefundType]    = useState('full');
  const [refundAmt,     setRefundAmt]     = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [showStatus,    setShowStatus]    = useState(false);
  const [statusSaving,  setStatusSaving]  = useState(false);
  const [msg, setMsg] = useState(null); // { text, ok }

  useEffect(() => { fetchOrder(); }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/order-detail/${orderId}`);
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        setEditName(data.order.customer_name || '');
        setEditEmail(data.order.customer_email || '');
        setNoteContent(''); // reset note field
      }
    } catch {}
    setLoading(false);
  }

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleSaveCustomer() {
    setSaving(true);
    const res  = await fetch('/api/admin/update-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, customer_name: editName, customer_email: editEmail }),
    });
    const data = await res.json();
    if (data.success) {
      setOrder(o => ({ ...o, customer_name: editName, customer_email: editEmail }));
      setEditMode(false);
      flash('Customer details updated.');
      onStatusChange?.();
    } else {
      flash(data.error || 'Save failed', false);
    }
    setSaving(false);
  }

  async function handleResend() {
    setResending(true);
    const res  = await fetch('/api/admin/resend-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    const data = await res.json();
    if (data.success) flash(`Ticket email resent to ${data.to}.`);
    else flash(data.error || 'Resend failed', false);
    setResending(false);
  }

  async function handleSaveNote() {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    const res  = await fetch('/api/admin/save-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, type: noteType, content: noteContent }),
    });
    const data = await res.json();
    if (data.success) {
      const field = noteType === 'private' ? 'admin_note' : 'public_note';
      setOrder(o => ({ ...o, [field]: noteContent.trim() }));
      setNoteContent('');
      flash(noteType === 'public' ? 'Note saved and emailed to customer.' : 'Private note saved.');
    } else {
      flash(data.error || 'Save failed', false);
    }
    setSavingNote(false);
  }

  async function handleStatusChange(newStatus) {
    setStatusSaving(true);
    const res  = await fetch('/api/admin/update-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      setOrder(o => ({ ...o, status: newStatus }));
      setShowStatus(false);
      flash(`Order status changed to ${newStatus.replace('_', ' ')}.`);
      onStatusChange?.();
    } else {
      flash(data.error || 'Status change failed', false);
    }
    setStatusSaving(false);
  }

  async function handleRefund() {
    setRefundLoading(true);
    let amount_cents;
    if (refundType === 'custom') {
      const euros = parseFloat(refundAmt);
      if (!euros || euros <= 0) { flash('Enter a valid refund amount.', false); setRefundLoading(false); return; }
      amount_cents = Math.round(euros * 100);
    }
    const res  = await fetch('/api/admin/stripe-refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, amount_cents }),
    });
    const data = await res.json();
    if (data.success) {
      flash(`✓ Refund of €${data.refunded_amount} processed successfully.`);
      setShowRefund(false);
      setOrder(o => ({ ...o, status: 'refunded' }));
      onStatusChange?.();
    } else {
      flash(data.error || 'Refund failed', false);
    }
    setRefundLoading(false);
  }

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal" style={{ padding: 48, textAlign: 'center', color: 'var(--text-light)' }}>Loading order…</div>
    </div>
  );
  if (!order) return null;

  const items    = order.order_items || [];
  const subtotal = items.reduce((s, i) => s + ((i.unit_price || 0) * (i.quantity || 1)), 0);
  const bookingFee = order.booking_fee || 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">Order #{order.id?.slice(0, 8).toUpperCase()}</div>
            <div className="modal-title-sub">{fmtDate(order.created_at)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={order.status} />
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Flash message */}
          {msg && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: msg.ok ? '#dcfce7' : '#fee2e2', color: msg.ok ? '#16a34a' : '#dc2626' }}>
              {msg.text}
            </div>
          )}

          {/* ── Customer ── */}
          <div className="detail-section">
            <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Customer</span>
              {!editMode
                ? <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setEditMode(true)}>✏️ Edit</button>
                : <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setEditMode(false)} disabled={saving}>Cancel</button>
                    <button className="btn btn-sm" style={{ fontSize: 11, background: '#0a9e7f', color: '#fff', border: 'none' }} onClick={handleSaveCustomer} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                  </div>
              }
            </div>
            {editMode ? (
              <div className="detail-grid">
                <div className="detail-field">
                  <div className="detail-field-label">Name</div>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 14, fontFamily: 'Inter,sans-serif' }} />
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Email</div>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 14, fontFamily: 'Inter,sans-serif' }} />
                </div>
              </div>
            ) : (
              <div className="detail-grid">
                <div className="detail-field">
                  <div className="detail-field-label">Name</div>
                  <div className="detail-field-value">{order.customer_name || '—'}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Email</div>
                  <div className="detail-field-value">{order.customer_email || '—'}</div>
                </div>
                <div className="detail-field">
                  <div className="detail-field-label">Phone</div>
                  <div className="detail-field-value">{order.customer_phone || '—'}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Event ── */}
          <div className="detail-section">
            <div className="detail-section-title">Event</div>
            <div className="detail-grid">
              <div className="detail-field">
                <div className="detail-field-label">Event</div>
                <div className="detail-field-value">{order.events?.name || '—'}</div>
              </div>
              <div className="detail-field">
                <div className="detail-field-label">Organiser</div>
                <div className="detail-field-value">{order.organisers?.name || '—'}</div>
              </div>
            </div>
          </div>

          {/* ── Tickets ── */}
          <div className="detail-section">
            <div className="detail-section-title">Tickets</div>
            {items.length === 0 ? (
              <div style={{ color: 'var(--text-light)', fontSize: 13 }}>No ticket items found.</div>
            ) : (
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.ticket_name || '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((item.unit_price || 0) * (item.quantity || 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: 12 }}>
              <div className="totals-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {bookingFee > 0 && <div className="totals-row"><span>Booking fee</span><span>{fmt(bookingFee)}</span></div>}
              {(order.discount || 0) > 0 && <div className="totals-row" style={{ color: '#0a9e7f' }}><span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span><span>−{fmt(order.discount)}</span></div>}
              <div className="totals-row total"><span>Total charged</span><span style={{ color: '#0a9e7f' }}>{fmt(order.total)}</span></div>
            </div>
          </div>

          {/* ── Payment ── */}
          <div className="detail-section">
            <div className="detail-section-title">Payment</div>
            <div className="detail-grid">
              <div className="detail-field">
                <div className="detail-field-label">Method</div>
                <div className="detail-field-value">Stripe</div>
              </div>
              {order.stripe_payment_intent && (
                <div className="detail-field">
                  <div className="detail-field-label">Payment intent</div>
                  <div className="detail-field-value mono">
                    <a className="stripe-link" href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent}`} target="_blank" rel="noreferrer">
                      {order.stripe_payment_intent.slice(0, 22)}… ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="detail-section">
            <div className="detail-section-title">Notes</div>
            {order.admin_note && (
              <div style={{ marginBottom: 10, padding: '10px 12px', background: '#fef9c3', borderRadius: 7, fontSize: 13, color: '#713f12' }}>
                <strong>🔒 Private:</strong> {order.admin_note}
              </div>
            )}
            {order.public_note && (
              <div style={{ marginBottom: 10, padding: '10px 12px', background: '#f0fdf9', borderRadius: 7, fontSize: 13, color: '#065f46' }}>
                <strong>📧 Public:</strong> {order.public_note}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {['private','public'].map(t => (
                <button key={t} onClick={() => setNoteType(t)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, border: '1.5px solid', borderColor: noteType === t ? '#0a9e7f' : 'var(--border)', borderRadius: 6, background: noteType === t ? '#f0fdf9' : '#fff', color: noteType === t ? '#0a9e7f' : 'var(--text-mid)', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                  {t === 'private' ? '🔒 Private' : '📧 Public'}
                </button>
              ))}
            </div>
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder={noteType === 'private' ? 'Internal note (only visible to admins)…' : 'Message to send to the customer via email…'}
              rows={3}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'Inter,sans-serif', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleSaveNote} disabled={savingNote || !noteContent.trim()}>
                {savingNote ? 'Saving…' : noteType === 'public' ? 'Save & email customer' : 'Save note'}
              </button>
            </div>
          </div>

          {/* ── Change Status panel ── */}
          {showStatus && (
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '16px 18px', background: 'var(--bg)', marginTop: 4, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Change Order Status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'completed',       label: 'Completed',  color: '#16a34a', bg: '#dcfce7' },
                  { key: 'pending_payment', label: 'Pending',    color: '#d97706', bg: '#fef3c7' },
                  { key: 'cancelled',       label: 'Cancelled',  color: '#6b7280', bg: '#f3f4f6' },
                  { key: 'refunded',        label: 'Refunded',   color: '#7c3aed', bg: '#ede9fe' },
                  { key: 'failed',          label: 'Failed',     color: '#dc2626', bg: '#fee2e2' },
                ].map(s => (
                  <button
                    key={s.key}
                    disabled={s.key === order.status || statusSaving}
                    onClick={() => handleStatusChange(s.key)}
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: '1.5px solid', borderColor: s.key === order.status ? s.color : 'var(--border)', background: s.key === order.status ? s.bg : '#fff', color: s.key === order.status ? s.color : 'var(--text-mid)', cursor: s.key === order.status ? 'default' : 'pointer', fontFamily: 'Inter,sans-serif', opacity: statusSaving ? 0.6 : 1 }}
                  >
                    {s.label}{s.key === order.status ? ' ✓' : ''}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowStatus(false)}>Done</button>
              </div>
            </div>
          )}

          {/* ── Refund panel (inline) ── */}
          {showRefund && (
            <div style={{ border: '1.5px solid #fecaca', borderRadius: 10, padding: '16px 18px', background: '#fef2f2', marginTop: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>Issue Refund — #{order.id?.slice(0,8).toUpperCase()}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['full','custom'].map(t => (
                  <button key={t} onClick={() => setRefundType(t)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: '1.5px solid', borderColor: refundType === t ? '#dc2626' : '#fecaca', borderRadius: 6, background: refundType === t ? '#fee2e2' : '#fff', color: refundType === t ? '#dc2626' : '#b91c1c', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    {t === 'full' ? `Full refund (${fmt(order.total)})` : 'Custom amount'}
                  </button>
                ))}
              </div>
              {refundType === 'custom' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c', display: 'block', marginBottom: 5 }}>Amount (€)</label>
                  <input type="number" step="0.01" min="0.01" max={order.total} value={refundAmt} onChange={e => setRefundAmt(e.target.value)} placeholder="0.00" style={{ padding: '8px 12px', border: '1.5px solid #fca5a5', borderRadius: 6, fontSize: 14, fontFamily: 'Inter,sans-serif', width: 160 }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowRefund(false)} disabled={refundLoading}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={handleRefund} disabled={refundLoading}>
                  {refundLoading ? 'Processing…' : 'Process refund via Stripe'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="modal-footer">
          {order.status === 'completed' && !showRefund && (
            <button className="btn btn-danger" onClick={() => setShowRefund(true)}>↩ Issue refund</button>
          )}
          {order.status === 'completed' && (
            <button className="btn btn-ghost" onClick={handleResend} disabled={resending}>
              {resending ? '⏳ Resending…' : '📧 Resend ticket'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => { setShowStatus(v => !v); setShowRefund(false); }}>
            🔄 Change status
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
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
export default function OrdersPage() {
  const [orders, setOrders]           = useState([]);
  const [counts, setCounts]           = useState({});
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [events, setEvents]           = useState([]);
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [toast, setToast]             = useState(null);
  const [sampleMode, setSampleModeState] = useState(false);

  useEffect(() => {
    setSampleModeState(isSampleMode());
    loadEvents();
    loadCounts();
  }, []);
  useEffect(() => { loadOrdersWithMode(sampleMode, activeTab, search, eventFilter, page); }, [activeTab, search, eventFilter, page, sampleMode]);

  function toggleSample() {
    const next = !sampleMode;
    setSampleMode(next);
    setSampleModeState(next);
    setPage(1); setSearch(''); setEventFilter('all'); setActiveTab('all');
    // Call load functions immediately with the new value, don't wait for re-render
    loadCountsWithMode(next);
    loadOrdersWithMode(next, 'all', '', 'all', 1);
  }

  async function loadEvents() {
    const { data } = await supabase.from('events').select('id, name').order('name');
    setEvents(data || []);
  }

  async function loadCounts() {
    loadCountsWithMode(sampleMode);
  }

  async function loadCountsWithMode(useSample) {
    if (useSample) {
      const all = getSampleOrders();
      const c = { all: all.length };
      ['completed','pending_payment','cancelled','refunded','failed'].forEach(s => {
        c[s] = all.filter(o => o.status === s).length;
      });
      setCounts(c); return;
    }
    const statuses = ['completed', 'pending_payment', 'cancelled', 'refunded', 'failed'];
    const results  = await Promise.all(
      statuses.map(s =>
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', s)
      )
    );
    const c = { all: 0 };
    statuses.forEach((s, i) => { c[s] = results[i].count || 0; c.all += c[s]; });
    setCounts(c);
  }

  async function loadOrders() {
    loadOrdersWithMode(sampleMode, activeTab, search, eventFilter, page);
  }

  async function loadOrdersWithMode(useSample, tab, srch, evtFilter, pg) {
    setLoading(true);
    try {
      if (useSample) {
        let all = getSampleOrders();
        if (tab !== 'all') all = all.filter(o => o.status === tab);
        if (evtFilter !== 'all') all = all.filter(o => o.event_id === evtFilter);
        if (srch) {
          const s = srch.toLowerCase();
          all = all.filter(o =>
            o.customer_name?.toLowerCase().includes(s) ||
            o.customer_email?.toLowerCase().includes(s) ||
            o.id?.toLowerCase().includes(s)
          );
        }
        setTotal(all.length);
        const start = (pg - 1) * PAGE_SIZE;
        setOrders(all.slice(start, start + PAGE_SIZE));
        const base = getSampleOrders();
        const c = { all: base.length };
        ['completed','pending_payment','cancelled','refunded','failed'].forEach(s => { c[s] = base.filter(o => o.status === s).length; });
        setCounts(c);
        setLoading(false); return;
      }

      let q = supabase
        .from('orders')
        .select(`
          id, status, total, customer_name, customer_email, customer_phone,
          created_at, event_id, booking_fee, discount, coupon_code,
          stripe_session_id,
          events ( name ),
          order_items (
            id, quantity, unit_price, ticket_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((pg - 1) * PAGE_SIZE, pg * PAGE_SIZE - 1);

      if (tab !== 'all') q = q.eq('status', tab);
      if (evtFilter !== 'all') q = q.eq('event_id', evtFilter);
      if (srch) {
        q = q.or(`customer_name.ilike.%${srch}%,customer_email.ilike.%${srch}%,id.ilike.%${srch}%`);
      }

      const { data, count, error } = await q;
      console.log('Orders query result:', { data, count, error });
      if (error) throw error;
      setOrders(data || []);
      setTotal(count || 0);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }


  // Summary stats from current filtered set
  const completedRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + (o.total || 0), 0);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleTabChange(key) {
    setActiveTab(key);
    setPage(1);
  }

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div className="ord">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-sub">{total} orders {activeTab !== 'all' ? `· filtered by ${STATUS_META[activeTab]?.label}` : 'total'}</div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">All orders</div>
          <div className="summary-value">{counts.all || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Completed</div>
          <div className="summary-value green">{counts.completed || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pending</div>
          <div className="summary-value amber">{counts.pending_payment || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Refunded</div>
          <div className="summary-value purple">{counts.refunded || 0}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Failed</div>
          <div className="summary-value red">{counts.failed || 0}</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name, email or order ID…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={eventFilter}
          onChange={e => { setEventFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All events</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skel" style={{ width: `${70 + (i % 3) * 10}%`, height: 18 }} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            {search ? 'No orders match your search.' : `No ${activeTab !== 'all' ? STATUS_META[activeTab]?.label.toLowerCase() : ''} orders yet.`}
          </div>
        ) : (
          <>
            <table className="ord-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} onClick={() => setSelectedOrderId(order.id)}>
                    <td>
                      <div className="order-id">#{order.id?.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td>
                      <div className="order-customer">{order.customer_name || '—'}</div>
                      <div className="order-email">{order.customer_email || ''}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 180 }}>
                      {order.events?.name || order.event_name || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
                      {fmtDateShort(order.created_at)}
                    </td>
                    <td style={{ fontWeight: 600, color: '#0a9e7f', whiteSpace: 'nowrap' }}>
                      {fmt(order.total)}
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="pagination">
                <span>
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
                <div className="page-btns">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        className={`page-btn ${page === p ? 'current' : ''}`}
                        onClick={() => setPage(p)}
                      >{p}</button>
                    );
                  })}
                  {totalPages > 5 && <span style={{ color: 'var(--text-light)', padding: '0 4px' }}>…</span>}
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Order detail modal ── */}
      {selectedOrderId && (
        <OrderDetail
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusChange={() => { loadOrders(); loadCounts(); }}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}
