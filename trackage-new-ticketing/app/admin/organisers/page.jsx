/* app/admin/organisers/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

/* ─── helpers ─────────────────────────────────────────────────────── */
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const BLANK = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  vat_number: '',
  vat_rate: '',
  status: 'active',
});

/* ─── styles ──────────────────────────────────────────────────────── */
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
  --warn:        #d97706;
  --warn-bg:     #fef3c7;
  --success:     #16a34a;
  --success-bg:  #dcfce7;
  --radius:      10px;
}
body { font-family: 'Inter', sans-serif; color: var(--text); background: var(--bg); }

/* ── page header ── */
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 22px; font-weight: 700; color: var(--text); }
.page-subtitle { font-size: 13px; color: var(--text-mid); margin-top: 2px; }

/* ── toolbar ── */
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 320px; }
.search-wrap input { width: 100%; border: 1.5px solid var(--border); border-radius: 8px; padding: 9px 12px 9px 36px; font-size: 14px; color: var(--text); background: var(--white); outline: none; font-family: 'Inter', sans-serif; transition: border-color 0.15s, box-shadow 0.15s; }
.search-wrap input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(10,158,127,0.1); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 14px; pointer-events: none; }
.filter-select { border: 1.5px solid var(--border); border-radius: 8px; padding: 9px 12px; font-size: 14px; color: var(--text); background: var(--white); outline: none; font-family: 'Inter', sans-serif; cursor: pointer; }
.filter-select:focus { border-color: var(--accent); }

/* ── primary button ── */
.btn-primary { display: inline-flex; align-items: center; gap: 7px; background: var(--accent); color: var(--white); border: none; border-radius: 8px; padding: 9px 16px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s, transform 0.1s; white-space: nowrap; }
.btn-primary:hover { background: var(--accent-dark); }
.btn-primary:active { transform: scale(0.98); }

/* ── stats row ── */
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; }
.stat-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-mid); margin-bottom: 6px; }
.stat-value { font-size: 26px; font-weight: 700; color: var(--text); line-height: 1; }
.stat-sub { font-size: 12px; color: var(--text-light); margin-top: 4px; }

/* ── table card ── */
.table-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
thead th { background: var(--bg); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-mid); padding: 11px 16px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: var(--bg); }
tbody td { padding: 14px 16px; font-size: 14px; color: var(--text); vertical-align: middle; }

/* ── organiser cell ── */
.org-cell { display: flex; align-items: center; gap: 11px; }
.org-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent-bg); border: 1.5px solid var(--accent); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--accent); flex-shrink: 0; }
.org-name { font-weight: 600; font-size: 14px; color: var(--text); line-height: 1.2; }
.org-email { font-size: 12px; color: var(--text-mid); margin-top: 1px; }

/* ── badges ── */
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge-active { background: var(--success-bg); color: var(--success); }
.badge-inactive { background: var(--bg); color: var(--text-mid); border: 1px solid var(--border); }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* ── row actions ── */
.row-actions { display: flex; align-items: center; gap: 6px; }
.btn-icon { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 7px; background: none; border: 1.5px solid var(--border); color: var(--text-mid); cursor: pointer; font-size: 14px; transition: all 0.15s; font-family: 'Inter', sans-serif; }
.btn-icon:hover { background: var(--bg); color: var(--text); border-color: #d1d5db; }
.btn-icon.danger:hover { background: var(--danger-bg); border-color: #fca5a5; color: var(--danger); }

/* ── empty state ── */
.empty { text-align: center; padding: 60px 24px; color: var(--text-mid); }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.empty-sub { font-size: 13px; color: var(--text-mid); }

/* ── modal backdrop ── */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeIn 0.15s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal { background: var(--white); border-radius: 14px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.18); animation: slideUp 0.2s ease; }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 18px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 17px; font-weight: 700; color: var(--text); }
.modal-close { background: none; border: 1.5px solid var(--border); color: var(--text-mid); border-radius: 7px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.modal-close:hover { background: var(--bg); color: var(--text); }
.modal-body { padding: 22px 24px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: flex-end; gap: 10px; }

/* ── form fields ── */
.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-grid.full { grid-template-columns: 1fr; }
.field { margin-bottom: 14px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 5px; }
.field label span.req { color: var(--accent); margin-left: 2px; }
.field input, .field select, .field textarea {
  width: 100%; border: 1.5px solid var(--border); border-radius: 8px;
  padding: 9px 12px; font-size: 14px; color: var(--text);
  font-family: 'Inter', sans-serif; background: var(--white); outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: var(--accent); box-shadow: 0 0 0 3px rgba(10,158,127,0.1);
}
.field-hint { font-size: 12px; color: var(--text-light); margin-top: 4px; }
.field-section { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-mid); margin: 18px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }

/* ── section divider ── */
.section-divider { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-light); margin: 6px 0 14px; }

/* ── confirm modal ── */
.confirm-modal { max-width: 400px; }
.confirm-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--danger-bg); display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 16px; }
.confirm-title { font-size: 17px; font-weight: 700; text-align: center; color: var(--text); margin-bottom: 8px; }
.confirm-text { font-size: 14px; color: var(--text-mid); text-align: center; line-height: 1.5; }

/* ── view modal ── */
.view-row { display: flex; gap: 8px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); font-size: 14px; }
.view-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.view-label { font-weight: 600; color: var(--text-mid); min-width: 130px; flex-shrink: 0; }
.view-value { color: var(--text); word-break: break-word; }

/* ── toast ── */
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1f2937; color: var(--white); padding: 12px 20px; border-radius: 9px; font-size: 14px; font-weight: 500; z-index: 999; white-space: nowrap; animation: toastIn 0.2s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ── btn secondary ── */
.btn-secondary { display: inline-flex; align-items: center; gap: 7px; background: var(--white); color: var(--text); border: 1.5px solid var(--border); border-radius: 8px; padding: 9px 16px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
.btn-secondary:hover { background: var(--bg); border-color: #d1d5db; }
.btn-danger { background: var(--danger); color: var(--white); border-color: var(--danger); }
.btn-danger:hover { background: #dc2626; border-color: #dc2626; }

/* ── loading skeleton ── */
.skeleton { background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── events count pill ── */
.events-pill { display: inline-flex; align-items: center; background: var(--accent-bg); color: var(--accent); font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }

@media (max-width: 640px) {
  .field-grid { grid-template-columns: 1fr; }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .page-header { flex-direction: column; align-items: flex-start; }
}
`;

/* ─── component ───────────────────────────────────────────────────── */
export default function OrganisersPage() {
  const [organisers, setOrganisers] = useState([]);
  const [eventCounts, setEventCounts] = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modal, setModal]           = useState(null); // null | 'add' | 'edit' | 'view' | 'delete'
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState(BLANK());
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');
  const [formError, setFormError]   = useState('');

  useEffect(() => { loadOrganisers(); }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadOrganisers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organisers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganisers(data || []);

      // load event counts per organiser
      if (data && data.length) {
        const { data: events } = await supabase
          .from('events')
          .select('organiser_id');
        const counts = {};
        (events || []).forEach(e => {
          if (e.organiser_id) counts[e.organiser_id] = (counts[e.organiser_id] || 0) + 1;
        });
        setEventCounts(counts);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  /* ── open modals ── */
  function openAdd() {
    setForm(BLANK());
    setFormError('');
    setModal('add');
  }
  function openEdit(org) {
    setSelected(org);
    setForm({
      name:       org.name       || '',
      email:      org.email      || '',
      phone:      org.phone      || '',
      password:   '',                    // never pre-fill password
      vat_number: org.vat_number || '',
      vat_rate:   org.vat_rate   != null ? String(org.vat_rate) : '',
      status:     org.status     || 'active',
    });
    setFormError('');
    setModal('edit');
  }
  function openView(org) {
    setSelected(org);
    setModal('view');
  }
  function openDelete(org) {
    setSelected(org);
    setModal('delete');
  }
  function closeModal() {
    setModal(null);
    setSelected(null);
  }

  /* ── save (add / edit) ── */
  async function handleSave() {
    setFormError('');
    if (!form.name.trim())  return setFormError('Name is required.');
    if (!form.email.trim()) return setFormError('Email is required.');
    if (modal === 'add' && !form.password.trim()) return setFormError('Password is required for new organisers.');

    setSaving(true);
    try {
      const payload = {
        name:       form.name.trim(),
        email:      form.email.trim().toLowerCase(),
        phone:      form.phone.trim(),
        vat_number: form.vat_number.trim(),
        vat_rate:   form.vat_rate !== '' ? parseFloat(form.vat_rate) : null,
        status:     form.status,
      };

      if (modal === 'add') {
        const { error } = await supabase.from('organisers').insert([payload]);
        if (error) throw error;
        showToast('✓ Organiser added successfully');
      } else {
        const { error } = await supabase.from('organisers').update(payload).eq('id', selected.id);
        if (error) throw error;

        // If a new password was provided, update it in Supabase Auth
        if (form.password.trim()) {
          const res = await fetch('/api/admin/set-organiser-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organiser_id: selected.id, password: form.password.trim() }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to update password');
        }

        showToast('✓ Organiser updated successfully');
      }
      closeModal();
      loadOrganisers();
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    }
    setSaving(false);
  }

  /* ── delete ── */
  async function handleDelete() {
    setSaving(true);
    try {
      const { error } = await supabase.from('organisers').delete().eq('id', selected.id);
      if (error) throw error;
      showToast('Organiser deleted');
      closeModal();
      loadOrganisers();
    } catch (err) {
      setFormError(err.message);
    }
    setSaving(false);
  }

  /* ── toggle status ── */
  async function toggleStatus(org) {
    const newStatus = org.status === 'active' ? 'inactive' : 'active';
    await supabase.from('organisers').update({ status: newStatus }).eq('id', org.id);
    showToast(`Organiser marked as ${newStatus}`);
    loadOrganisers();
  }

  /* ── filter ── */
  const filtered = organisers.filter(o => {
    const matchSearch = !search ||
      (o.name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.phone || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalActive   = organisers.filter(o => o.status === 'active').length;
  const totalInactive = organisers.filter(o => o.status === 'inactive').length;

  /* ── render ── */
  return (
    <>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Organisers</div>
          <div className="page-subtitle">Manage event organisers and their accounts</div>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Organiser</button>
      </div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Organisers</div>
          <div className="stat-value">{organisers.length}</div>
          <div className="stat-sub">all time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{totalActive}</div>
          <div className="stat-sub">currently active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inactive</div>
          <div className="stat-value" style={{ color: 'var(--text-mid)' }}>{totalInactive}</div>
          <div className="stat-sub">deactivated</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Events</div>
          <div className="stat-value">{Object.values(eventCounts).reduce((a, b) => a + b, 0)}</div>
          <div className="stat-sub">across all organisers</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👤</div>
            <div className="empty-title">{search || statusFilter !== 'all' ? 'No organisers match your search' : 'No organisers yet'}</div>
            <div className="empty-sub">{!search && statusFilter === 'all' && 'Add your first organiser to get started.'}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organiser</th>
                  <th>Phone</th>
                  <th>VAT Number</th>
                  <th>VAT Rate</th>
                  <th>Events</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(org => (
                  <tr key={org.id}>
                    <td>
                      <div className="org-cell">
                        <div className="org-avatar">{initials(org.name)}</div>
                        <div>
                          <div className="org-name">{org.name}</div>
                          <div className="org-email">{org.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-mid)', fontSize: 13 }}>{org.phone || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{org.vat_number || '—'}</td>
                    <td style={{ fontSize: 13 }}>{org.vat_rate != null ? `${org.vat_rate}%` : '—'}</td>
                    <td>
                      <span className="events-pill">{eventCounts[org.id] || 0} events</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${org.status === 'active' ? 'badge-active' : 'badge-inactive'}`}
                        style={{ cursor: 'pointer' }}
                        title="Click to toggle status"
                        onClick={() => toggleStatus(org)}
                      >
                        <span className="badge-dot" />
                        {org.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-mid)', fontSize: 13 }}>{fmtDate(org.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" title="View details" onClick={() => openView(org)}>👁</button>
                        <button className="btn-icon" title="Edit organiser" onClick={() => openEdit(org)}>✏️</button>
                        <button className="btn-icon danger" title="Delete organiser" onClick={() => openDelete(org)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'add' ? '+ Add New Organiser' : 'Edit Organiser'}</div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {formError && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                  ⚠ {formError}
                </div>
              )}

              <div className="field-section">Contact Information</div>
              <div className="field-grid">
                <div className="field">
                  <label>Full Name <span className="req">*</span></label>
                  <input
                    placeholder="e.g. Jane Smith"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Email Address <span className="req">*</span></label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>Phone Number</label>
                  <input
                    placeholder="+356 9999 1234"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="field-section">Account Security</div>
              <div className="field">
                <label>{modal === 'add' ? 'Password' : 'New Password'} {modal === 'add' && <span className="req">*</span>}</label>
                <input
                  type="password"
                  placeholder={modal === 'edit' ? 'Leave blank to keep current password' : 'Set a secure password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                {modal === 'edit' && <div className="field-hint">Leave blank to keep the existing password unchanged.</div>}
              </div>

              <div className="field-section">VAT Details</div>
              <div className="field-grid">
                <div className="field">
                  <label>VAT Number</label>
                  <input
                    placeholder="MT12345678"
                    value={form.vat_number}
                    onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>VAT Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 18"
                    value={form.vat_rate}
                    onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))}
                  />
                  <div className="field-hint">Percentage charged on ticket sales for this organiser.</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? '+ Add Organiser' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {modal === 'view' && selected && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="org-avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{initials(selected.name)}</div>
                <div>
                  <div className="modal-title">{selected.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{selected.email}</div>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="view-row"><span className="view-label">Status</span><span className="view-value"><span className={`badge ${selected.status === 'active' ? 'badge-active' : 'badge-inactive'}`}><span className="badge-dot" />{selected.status === 'active' ? 'Active' : 'Inactive'}</span></span></div>
              <div className="view-row"><span className="view-label">Full Name</span><span className="view-value">{selected.name || '—'}</span></div>
              <div className="view-row"><span className="view-label">Email</span><span className="view-value">{selected.email || '—'}</span></div>
              <div className="view-row"><span className="view-label">Phone</span><span className="view-value">{selected.phone || '—'}</span></div>
              <div className="view-row"><span className="view-label">VAT Number</span><span className="view-value" style={{ fontFamily: 'monospace' }}>{selected.vat_number || '—'}</span></div>
              <div className="view-row"><span className="view-label">VAT Rate</span><span className="view-value">{selected.vat_rate != null ? `${selected.vat_rate}%` : '—'}</span></div>
              <div className="view-row"><span className="view-label">Events</span><span className="view-value"><span className="events-pill">{eventCounts[selected.id] || 0} events</span></span></div>
              <div className="view-row"><span className="view-label">Added</span><span className="view-value">{fmtDate(selected.created_at)}</span></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Close</button>
              <button className="btn-primary" onClick={() => { closeModal(); openEdit(selected); }}>✏️ Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {modal === 'delete' && selected && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal confirm-modal">
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
              <div className="confirm-icon">🗑</div>
              <div className="confirm-title">Delete Organiser?</div>
              <div className="confirm-text">
                You are about to permanently delete <strong>{selected.name}</strong>.<br />
                This action cannot be undone. Any events linked to this organiser will be unaffected but will lose their organiser reference.
              </div>
              {formError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 16 }}>
                  ⚠ {formError}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
              <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn-secondary btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
