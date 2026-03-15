/* app/organiser/coupons/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { orgFetch } from '../../../lib/organiserFetch';

/* ─── helpers ─────────────────────────────────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}
function isExpired(dt) {
  if (!dt) return false;
  return new Date(dt) < new Date();
}
function generateCode() {
  return 'TS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const BLANK = () => ({
  code:               '',
  description:        '',
  discount_type:      'percent',      // 'percent' | 'fixed'
  discount_value:     '',
  applies_to:         'cart',         // 'cart' | 'ticket'
  usage_limit:        '',             // total uses allowed (blank = unlimited)
  usage_limit_per_user: '',           // per-customer limit (blank = unlimited)
  expiry_date:        '',
  event_ids:          [],
  status:             'active',
});

/* ─── styles ──────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #F5F6FA;
  --surface:   #FFFFFF;
  --border:    #EBEDF0;
  --muted:     #767C8C;
  --green:     #48C16E;
  --green-dim: rgba(72,193,110,0.12);
  --black:     #000000;
  --white:     #FFFFFF;
  --danger:    #ef4444;
  --danger-bg: rgba(239,68,68,0.1);
  --warn:      #d97706;
  --purple:    #7c3aed;
  --purple-bg: #ede9fe;
}
body { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); background: var(--bg); }

/* ── page header ── */
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 24px; font-weight: 800; color: var(--black); letter-spacing: -0.02em; }
.page-sub    { font-size: 14px; color: var(--muted); margin-top: 2px; font-weight: 500; }

/* ── stats ── */
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-card  { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 16px 18px; }
.stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 6px; }
.stat-value { font-size: 26px; font-weight: 700; color: var(--black); line-height: 1; }
.stat-sub   { font-size: 12px; color: var(--muted); margin-top: 4px; font-weight: 500; }

/* ── info banner ── */
.info-banner { background: var(--purple-bg); border: 1.5px solid #c4b5fd; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: var(--purple); font-weight: 500; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }

/* ── tabs ── */
.tabs { display: flex; gap: 2px; border-bottom: 1.5px solid var(--border); margin-bottom: 20px; overflow-x: auto; }
.tab  { padding: 9px 16px; font-size: 13px; font-weight: 600; color: var(--muted); border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; font-family: 'Plus Jakarta Sans', sans-serif; transition: color 0.15s; display: flex; align-items: center; gap: 6px; }
.tab:hover  { color: var(--black); }
.tab.active { color: var(--black); border-bottom-color: var(--black); }
.tab-count  { background: rgba(0,0,0,0.06); border-radius: 100px; padding: 1px 7px; font-size: 11px; font-weight: 700; color: var(--muted); }
.tab.active .tab-count { background: var(--black); color: var(--white); }

/* ── toolbar ── */
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 320px; }
.search-wrap input { width: 100%; border: 1.5px solid var(--border); border-radius: 8px; padding: 8px 12px 8px 36px; font-size: 14px; color: var(--black); background: var(--surface); outline: none; font-family: 'Plus Jakarta Sans', sans-serif; transition: border-color 0.15s; }
.search-wrap input:focus { border-color: var(--black); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; pointer-events: none; }

/* ── buttons ── */
.btn-primary   { display: inline-flex; align-items: center; gap: 7px; background: var(--black); color: var(--white); border: none; border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: opacity 0.15s; white-space: nowrap; }
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { display: inline-flex; align-items: center; gap: 7px; background: var(--surface); color: var(--muted); border: 1.5px solid var(--border); border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; white-space: nowrap; }
.btn-secondary:hover { border-color: var(--black); color: var(--black); }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger    { background: var(--danger); color: var(--white); border-color: var(--danger); }
.btn-danger:hover { background: #dc2626; border-color: #dc2626; color: var(--white); }
.btn-ghost     { background: var(--surface); border: 1.5px solid var(--border); color: var(--muted); border-radius: 8px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: all 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
.btn-ghost:hover { background: var(--bg); color: var(--black); border-color: var(--black); }
.btn-ghost.danger:hover { background: var(--danger-bg); color: var(--danger); border-color: #fca5a5; }

/* ── coupons grid ── */
.coupons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }

/* ── coupon card ── */
.coupon-card {
  background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 16px; overflow: hidden;
  transition: border-color 0.15s;
}
.coupon-card:hover { border-color: var(--black); }
.coupon-card.expired { opacity: 0.65; }

/* dashed ticket top strip */
.coupon-strip {
  background: var(--black); padding: 14px 18px;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  position: relative;
}
.coupon-strip::after {
  content: ''; position: absolute; bottom: -1px; left: 0; right: 0;
  height: 10px;
  background: radial-gradient(circle at 10px -2px, var(--bg) 8px, transparent 8px),
              radial-gradient(circle at -2px -2px, var(--bg) 8px, transparent 8px);
  background-size: 20px 10px;
  background-repeat: repeat-x;
}
.coupon-strip.inactive  { background: #6b7280; }
.coupon-strip.expired-s { background: #9ca3af; }
.coupon-code { font-size: 18px; font-weight: 800; color: var(--white); letter-spacing: 0.08em; font-family: 'Courier New', monospace; }
.coupon-value-badge { background: rgba(255,255,255,0.2); color: var(--white); font-size: 15px; font-weight: 700; padding: 4px 12px; border-radius: 100px; white-space: nowrap; }

/* card body */
.coupon-body { padding: 16px 18px 14px; }
.coupon-desc { font-size: 13px; color: var(--muted); margin-bottom: 12px; min-height: 18px; font-style: italic; }
.coupon-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.meta-item   { display: flex; flex-direction: column; gap: 2px; }
.meta-label  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.meta-value  { font-size: 13px; font-weight: 600; color: var(--black); }

/* usage bar */
.usage-bar-wrap  { margin-bottom: 14px; }
.usage-bar-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 5px; font-weight: 500; }
.usage-bar-track { height: 6px; background: var(--bg); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
.usage-bar-fill  { height: 100%; background: var(--green); border-radius: 10px; transition: width 0.4s ease; }
.usage-bar-fill.full { background: var(--danger); }
.usage-bar-fill.warn { background: var(--warn); }

/* events pills */
.events-bound { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px; }
.event-pill   { background: var(--green-dim); color: var(--green); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* card footer */
.coupon-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
.coupon-actions { display: flex; gap: 6px; }

/* ── badges ── */
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
.badge-active   { background: var(--green-dim); color: var(--green); }
.badge-inactive { background: rgba(0,0,0,0.06); color: var(--muted); }
.badge-expired  { background: var(--danger-bg); color: var(--danger); }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* ── empty state ── */
.empty { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }
.empty-icon  { font-size: 40px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--black); margin-bottom: 6px; }
.empty-sub   { font-size: 13px; color: var(--muted); }

/* ── modal ── */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.15s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal { background: var(--surface); border-radius: 20px; border: 1.5px solid var(--border); width: 100%; max-width: 600px; max-height: 92vh; overflow-y: auto; animation: slideUp 0.2s ease; }
.modal-sm { max-width: 420px; }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 18px; border-bottom: 1.5px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 1; border-radius: 20px 20px 0 0; }
.modal-title  { font-size: 17px; font-weight: 700; color: var(--black); }
.modal-close  { background: var(--surface); border: 1.5px solid var(--border); color: var(--muted); border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.modal-close:hover { background: var(--bg); color: var(--black); border-color: var(--black); }
.modal-body   { padding: 22px 24px; }
.modal-footer { padding: 16px 24px; border-top: 1.5px solid var(--border); display: flex; align-items: center; justify-content: flex-end; gap: 10px; }

/* ── form ── */
.field-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1.5px solid var(--border); }
.field-section:first-child { margin-top: 0; }
.field-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field       { margin-bottom: 14px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: 13px; font-weight: 600; color: var(--black); margin-bottom: 5px; }
.field label .req { color: var(--green); margin-left: 2px; }
.field input, .field select, .field textarea {
  width: 100%; border: 1.5px solid var(--border); border-radius: 8px;
  padding: 8px 12px; font-size: 14px; color: var(--black);
  font-family: 'Plus Jakarta Sans', sans-serif; background: var(--surface); outline: none;
  transition: border-color 0.15s;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--black); }
.field-hint  { font-size: 12px; color: var(--muted); margin-top: 4px; font-weight: 500; }
.field-error { font-size: 12px; color: var(--danger); margin-top: 4px; }

/* code input row */
.code-row { display: flex; gap: 8px; }
.code-row input { flex: 1; }
.code-generate { background: var(--bg); border: 1.5px solid var(--border); color: var(--muted); border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; }
.code-generate:hover { border-color: var(--black); color: var(--black); }

/* discount type toggle */
.type-toggle { display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; }
.type-opt    { flex: 1; padding: 9px 12px; font-size: 13px; font-weight: 600; color: var(--muted); background: var(--surface); border: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; text-align: center; }
.type-opt.active { background: var(--black); color: var(--white); }
.type-opt:not(.active):hover { background: var(--bg); color: var(--black); }

/* events multi-select */
.events-checklist { border: 1.5px solid var(--border); border-radius: 8px; max-height: 180px; overflow-y: auto; }
.event-check-row  { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.1s; }
.event-check-row:last-child { border-bottom: none; }
.event-check-row:hover { background: var(--bg); }
.event-check-row input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; flex-shrink: 0; }
.event-check-name { font-size: 13px; color: var(--black); font-weight: 500; font-family: 'Plus Jakarta Sans', sans-serif; flex: 1; }
.event-check-date { font-size: 12px; color: var(--muted); font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; white-space: nowrap; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 2px 7px; }

/* form error banner */
.form-error { background: var(--danger-bg); border: 1px solid #fca5a5; color: var(--danger); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

/* confirm modal */
.confirm-icon  { width: 48px; height: 48px; border-radius: 50%; background: var(--danger-bg); display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 16px; }
.confirm-title { font-size: 17px; font-weight: 700; text-align: center; color: var(--black); margin-bottom: 8px; }
.confirm-text  { font-size: 14px; color: var(--muted); text-align: center; line-height: 1.6; font-weight: 500; }

/* skeleton */
.skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* toast */
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--black); color: var(--white); padding: 12px 20px; border-radius: 9px; font-size: 14px; font-weight: 600; z-index: 999; white-space: nowrap; animation: toastIn 0.2s ease; }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* copy btn */
.copy-btn { background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.7); font-size: 13px; padding: 0 4px; transition: color 0.15s; }
.copy-btn:hover { color: var(--white); }

@media (max-width: 640px) {
  .field-grid { grid-template-columns: 1fr; }
  .coupons-grid { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
`;

/* ─── component ───────────────────────────────────────────────────── */
export default function OrganiserCouponsPage() {
  const [coupons,  setCoupons]  = useState([]);
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('all');   // all | active | inactive | expired
  const [search,   setSearch]   = useState('');

  const [modal,    setModal]    = useState(null);    // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(BLANK());
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');
  const [toast,    setToast]    = useState('');
  const [copied,   setCopied]   = useState(null);

  useEffect(() => { loadData(); }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadData() {
    setLoading(true);
    try {
      const res  = await orgFetch('/api/organiser/coupons');
      const json = await res.json();
      setCoupons(json.coupons || []);
      setEvents(json.events  || []);
    } catch {}
    setLoading(false);
  }

  /* ── helpers ── */
  function couponStatus(c) {
    if (c.status === 'inactive') return 'inactive';
    if (isExpired(c.expiry_date)) return 'expired';
    if (c.usage_limit && c.usage_count >= c.usage_limit) return 'exhausted';
    return 'active';
  }

  function usagePct(c) {
    if (!c.usage_limit) return null;
    return Math.min(100, Math.round((c.usage_count || 0) / c.usage_limit * 100));
  }

  function discountLabel(c) {
    if (c.discount_type === 'percent') return `${c.discount_value}% off`;
    return `${fmt(c.discount_value)} off`;
  }

  async function copyCode(code) {
    try { await navigator.clipboard.writeText(code); } catch {}
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  /* ── open modals ── */
  function openAdd() {
    setForm(BLANK());
    setFormErr('');
    setModal('add');
  }
  function openEdit(c) {
    setSelected(c);
    setForm({
      code:                 c.code               || '',
      description:          c.description         || '',
      discount_type:        c.discount_type       || 'percent',
      discount_value:       c.discount_value != null ? String(c.discount_value) : '',
      applies_to:           c.applies_to          || 'cart',
      usage_limit:          c.usage_limit    != null ? String(c.usage_limit)    : '',
      usage_limit_per_user: c.usage_limit_per_user != null ? String(c.usage_limit_per_user) : '',
      expiry_date:          c.expiry_date ? c.expiry_date.split('T')[0] : '',
      event_ids:            c.event_ids            || [],
      status:               c.status               || 'active',
    });
    setFormErr('');
    setModal('edit');
  }
  function openDelete(c) {
    setSelected(c);
    setModal('delete');
  }
  function closeModal() { setModal(null); setSelected(null); }

  /* ── save ── */
  async function handleSave() {
    setFormErr('');
    if (!form.code.trim())          return setFormErr('Coupon code is required.');
    if (!form.discount_value)       return setFormErr('Discount value is required.');
    if (parseFloat(form.discount_value) <= 0) return setFormErr('Discount value must be greater than 0.');
    if (form.discount_type === 'percent' && parseFloat(form.discount_value) > 100)
      return setFormErr('Percentage discount cannot exceed 100%.');
    if (form.event_ids.length === 0)
      return setFormErr('You must link this coupon to at least one of your events.');

    setSaving(true);
    try {
      const payload = {
        code:                 form.code.trim().toUpperCase(),
        description:          form.description.trim(),
        discount_type:        form.discount_type,
        discount_value:       parseFloat(form.discount_value),
        applies_to:           form.applies_to,
        usage_limit:          form.usage_limit          !== '' ? parseInt(form.usage_limit)          : null,
        usage_limit_per_user: form.usage_limit_per_user !== '' ? parseInt(form.usage_limit_per_user) : null,
        expiry_date:          form.expiry_date || null,
        event_ids:            form.event_ids,
        status:               form.status,
      };

      const res = modal === 'add'
        ? await orgFetch('/api/organiser/coupons', { method: 'POST', body: JSON.stringify(payload) })
        : await orgFetch('/api/organiser/coupons', { method: 'PUT',  body: JSON.stringify({ id: selected.id, ...payload }) });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong.');

      showToast(modal === 'add' ? '✓ Coupon created successfully' : '✓ Coupon updated successfully');
      closeModal();
      loadData();
    } catch (err) {
      setFormErr(err.message || 'Something went wrong.');
    }
    setSaving(false);
  }

  /* ── delete ── */
  async function handleDelete() {
    setSaving(true);
    try {
      const res  = await orgFetch(`/api/organiser/coupons?id=${selected.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong.');
      showToast('Coupon deleted');
      closeModal();
      loadData();
    } catch (err) {
      setFormErr(err.message);
    }
    setSaving(false);
  }

  /* ── toggle status ── */
  async function toggleStatus(c) {
    const next = c.status === 'active' ? 'inactive' : 'active';
    await orgFetch('/api/organiser/coupons', {
      method: 'PATCH',
      body:   JSON.stringify({ id: c.id, status: next }),
    });
    showToast(`Coupon marked as ${next}`);
    loadData();
  }

  /* ── filter ── */
  const filtered = coupons.filter(c => {
    const s = couponStatus(c);
    const matchTab =
      tab === 'all'      ? true :
      tab === 'active'   ? s === 'active' :
      tab === 'inactive' ? s === 'inactive' :
      tab === 'expired'  ? (s === 'expired' || s === 'exhausted') : true;
    const matchSearch = !search ||
      (c.code        || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const counts = {
    all:      coupons.length,
    active:   coupons.filter(c => couponStatus(c) === 'active').length,
    inactive: coupons.filter(c => couponStatus(c) === 'inactive').length,
    expired:  coupons.filter(c => ['expired','exhausted'].includes(couponStatus(c))).length,
  };

  /* ── event toggle helper ── */
  function toggleEvent(id) {
    setForm(f => ({
      ...f,
      event_ids: f.event_ids.includes(id)
        ? f.event_ids.filter(x => x !== id)
        : [...f.event_ids, id],
    }));
  }

  /* ── render ── */
  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Discount Coupons</div>
          <div className="page-sub">Create and manage coupon codes for your events</div>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Create Coupon</button>
      </div>

      {/* Info banner */}
      <div className="info-banner">
        🏷️ Coupons must be linked to at least one of your events. Global platform coupons are managed by admin.
      </div>

      {/* Stats — 3 cards only */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Coupons</div>
          <div className="stat-value">{coupons.length}</div>
          <div className="stat-sub">all time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{counts.active}</div>
          <div className="stat-sub">live & usable</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Expired / Used up</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{counts.expired}</div>
          <div className="stat-sub">no longer valid</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'all',      label: 'All' },
          { key: 'active',   label: 'Active' },
          { key: 'inactive', label: 'Inactive' },
          { key: 'expired',  label: 'Expired / Used' },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="tab-count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search by code or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="coupons-grid">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 220 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🏷️</div>
          <div className="empty-title">{search ? 'No coupons match your search' : 'No coupons yet'}</div>
          <div className="empty-sub">{!search && 'Create your first discount coupon to get started.'}</div>
        </div>
      ) : (
        <div className="coupons-grid">
          {filtered.map(c => {
            const status = couponStatus(c);
            const pct    = usagePct(c);
            const boundEvents = events.filter(e => (c.event_ids || []).includes(e.id));

            return (
              <div key={c.id} className={`coupon-card ${status === 'expired' || status === 'exhausted' ? 'expired' : ''}`}>
                {/* Strip */}
                <div className={`coupon-strip ${status === 'inactive' ? 'inactive' : status === 'expired' || status === 'exhausted' ? 'expired-s' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="coupon-code">{c.code}</div>
                    <button
                      className="copy-btn"
                      title="Copy code"
                      onClick={() => copyCode(c.code)}
                    >{copied === c.code ? '✓' : '⎘'}</button>
                  </div>
                  <div className="coupon-value-badge">{discountLabel(c)}</div>
                </div>

                {/* Body */}
                <div className="coupon-body">
                  {c.description && <div className="coupon-desc">"{c.description}"</div>}

                  <div className="coupon-meta">
                    <div className="meta-item">
                      <span className="meta-label">Type</span>
                      <span className="meta-value">{c.discount_type === 'percent' ? 'Percentage' : 'Fixed €'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Applies to</span>
                      <span className="meta-value">{c.applies_to === 'cart' ? 'Entire cart' : 'Per ticket'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Per customer</span>
                      <span className="meta-value">{c.usage_limit_per_user ? `${c.usage_limit_per_user}x` : 'Unlimited'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Expires</span>
                      <span className="meta-value" style={{ color: isExpired(c.expiry_date) ? '#ef4444' : 'inherit' }}>
                        {c.expiry_date ? fmtDate(c.expiry_date) : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div className="usage-bar-wrap">
                    <div className="usage-bar-label">
                      <span>Usage</span>
                      <span>{c.usage_count || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ' uses (unlimited)'}</span>
                    </div>
                    {c.usage_limit ? (
                      <div className="usage-bar-track">
                        <div
                          className={`usage-bar-fill ${pct >= 100 ? 'full' : pct >= 75 ? 'warn' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <div className="usage-bar-track">
                        <div className="usage-bar-fill" style={{ width: `${Math.min(100, (c.usage_count || 0) * 10)}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Bound events */}
                  <div className="events-bound">
                    {boundEvents.map(e => (
                      <span key={e.id} className="event-pill" title={e.name}>{e.name}</span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="coupon-footer">
                    <span
                      className={`badge ${status === 'active' ? 'badge-active' : status === 'inactive' ? 'badge-inactive' : 'badge-expired'}`}
                      style={{ cursor: status !== 'expired' && status !== 'exhausted' ? 'pointer' : 'default' }}
                      title={status !== 'expired' && status !== 'exhausted' ? 'Click to toggle' : ''}
                      onClick={() => status !== 'expired' && status !== 'exhausted' && toggleStatus(c)}
                    >
                      <span className="badge-dot" />
                      {status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : status === 'exhausted' ? 'Used up' : 'Expired'}
                    </span>
                    <div className="coupon-actions">
                      <button className="btn-ghost" title="Edit coupon" onClick={() => openEdit(c)}>✏️</button>
                      <button className="btn-ghost danger" title="Delete coupon" onClick={() => openDelete(c)}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? '+ Create Coupon' : 'Edit Coupon'}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {formErr && <div className="form-error">⚠ {formErr}</div>}

              {/* Coupon code */}
              <div className="field-section">Coupon Code</div>
              <div className="field">
                <label>Code <span className="req">*</span></label>
                <div className="code-row">
                  <input
                    placeholder="e.g. SUMMER25"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' }}
                  />
                  <button className="code-generate" onClick={() => setForm(f => ({ ...f, code: generateCode() }))}>
                    ↻ Generate
                  </button>
                </div>
                <div className="field-hint">Codes are automatically uppercased. Purchasers enter this at checkout.</div>
              </div>
              <div className="field">
                <label>Internal Description</label>
                <input
                  placeholder="e.g. Summer sale — 25% off all tickets"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Discount */}
              <div className="field-section">Discount Settings</div>
              <div className="field">
                <label>Discount Type <span className="req">*</span></label>
                <div className="type-toggle">
                  <button className={`type-opt ${form.discount_type === 'percent' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, discount_type: 'percent' }))}>
                    % Percentage
                  </button>
                  <button className={`type-opt ${form.discount_type === 'fixed' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, discount_type: 'fixed' }))}>
                    € Fixed Amount
                  </button>
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Discount Value <span className="req">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step={form.discount_type === 'percent' ? '1' : '0.01'}
                    placeholder={form.discount_type === 'percent' ? 'e.g. 25' : 'e.g. 5.00'}
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  />
                  <div className="field-hint">{form.discount_type === 'percent' ? 'Enter a percentage between 1–100' : 'Enter a fixed Euro amount'}</div>
                </div>
                <div className="field">
                  <label>Applies To <span className="req">*</span></label>
                  <select value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))}>
                    <option value="cart">Entire cart total</option>
                    <option value="ticket">Per ticket (each ticket discounted)</option>
                  </select>
                </div>
              </div>

              {/* Usage limits */}
              <div className="field-section">Usage Limits</div>
              <div className="field-grid">
                <div className="field">
                  <label>Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.usage_limit}
                    onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                  />
                  <div className="field-hint">Max total times this coupon can be used. Leave blank for unlimited.</div>
                </div>
                <div className="field">
                  <label>Limit Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={form.usage_limit_per_user}
                    onChange={e => setForm(f => ({ ...f, usage_limit_per_user: e.target.value }))}
                  />
                  <div className="field-hint">Max times one customer can use this coupon.</div>
                </div>
              </div>

              {/* Expiry & Status */}
              <div className="field-section">Validity</div>
              <div className="field-grid">
                <div className="field">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                  />
                  <div className="field-hint">Leave blank for no expiry date.</div>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Event binding */}
              <div className="field-section">Bind to Events <span className="req">*</span></div>
              <div className="field">
                <label>Select events for this coupon <span className="req">*</span></label>
                <div className="field-hint" style={{ marginBottom: 8 }}>
                  You must tick at least one event. The coupon will only be usable at checkout for those events.
                </div>
                {events.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 0' }}>No events found. Create an event first.</div>
                ) : (
                  <div className="events-checklist">
                    {events.map(e => (
                      <label key={e.id} className="event-check-row">
                        <input
                          type="checkbox"
                          checked={form.event_ids.includes(e.id)}
                          onChange={() => toggleEvent(e.id)}
                        />
                        <span className="event-check-name">{e.name}</span>
                        <span className="event-check-date">{fmtDate(e.start_time)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? '+ Create Coupon' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {modal === 'delete' && selected && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-sm">
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
              <div className="confirm-icon">🗑</div>
              <div className="confirm-title">Delete Coupon?</div>
              <div className="confirm-text">
                You are about to permanently delete coupon <strong style={{ fontFamily: 'monospace' }}>{selected.code}</strong>.<br />
                This cannot be undone. Any existing usage history will also be removed.
              </div>
              {formErr && <div className="form-error" style={{ marginTop: 16, textAlign: 'left' }}>⚠ {formErr}</div>}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn-secondary btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
