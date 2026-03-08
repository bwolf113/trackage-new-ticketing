/* app/admin/organisers/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const EMPTY_FORM = {
  name: '', email: '', phone: '', password: '', vat_number: '', vat_percent: '',
};

export default function OrganisersPage() {
  const [organisers, setOrganisers]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null); // null = adding new
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formError, setFormError]     = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // organiser id to delete
  const [toast, setToast]             = useState('');

  useEffect(() => { fetchOrganisers(); }, []);

  async function fetchOrganisers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('organisers')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setOrganisers(data || []);
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(org) {
    setEditTarget(org);
    setForm({
      name: org.name || '',
      email: org.email || '',
      phone: org.phone || '',
      password: '',           // never pre-fill password
      vat_number: org.vat_number || '',
      vat_percent: org.vat_percent ?? '',
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const payload = {
      name:        form.name.trim(),
      email:       form.email.trim().toLowerCase(),
      phone:       form.phone.trim(),
      vat_number:  form.vat_number.trim(),
      vat_percent: form.vat_percent !== '' ? parseFloat(form.vat_percent) : null,
    };

    // Only include password if filled in
    if (form.password) payload.password = form.password;

    let error;
    if (editTarget) {
      ({ error } = await supabase
        .from('organisers')
        .update(payload)
        .eq('id', editTarget.id));
    } else {
      if (!form.password) {
        setFormError('Password is required for new organisers.');
        setFormLoading(false);
        return;
      }
      ({ error } = await supabase
        .from('organisers')
        .insert([payload]));
    }

    if (error) {
      setFormError(error.message);
    } else {
      setShowModal(false);
      showToast(editTarget ? 'Organiser updated.' : 'Organiser created.');
      fetchOrganisers();
    }
    setFormLoading(false);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('organisers').delete().eq('id', id);
    if (!error) {
      setDeleteConfirm(null);
      showToast('Organiser deleted.');
      fetchOrganisers();
    }
  }

  const filtered = organisers.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="org-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');

        .org-page { font-family: 'Syne', sans-serif; color: #f0f0f0; }

        /* ── Top bar ── */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .page-header h1 {
          font-size: 22px;
          font-weight: 800;
          color: #f0f0f0;
        }

        .header-right {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #f0f0f0;
          padding: 9px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Syne', sans-serif;
          outline: none;
          width: 220px;
          transition: border-color 0.2s;
        }
        .search-input:focus { border-color: #c8f04a; }
        .search-input::placeholder { color: #444; }

        .btn-primary {
          background: #c8f04a;
          color: #0a0a0a;
          border: none;
          padding: 9px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          letter-spacing: 0.04em;
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .btn-primary:hover { opacity: 0.85; }

        .btn-ghost {
          background: none;
          border: 1px solid #2a2a2a;
          color: #aaa;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          transition: all 0.15s;
        }
        .btn-ghost:hover { border-color: #555; color: #f0f0f0; }

        .btn-danger {
          background: none;
          border: 1px solid rgba(255,77,109,0.3);
          color: #ff4d6d;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          transition: all 0.15s;
        }
        .btn-danger:hover { background: rgba(255,77,109,0.1); }

        /* ── Count badge ── */
        .count-badge {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #555;
          margin-bottom: 16px;
        }

        /* ── Table ── */
        .org-table-wrap {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          overflow: hidden;
        }

        .org-table {
          width: 100%;
          border-collapse: collapse;
        }

        .org-table th {
          background: #1a1a1a;
          padding: 12px 20px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #555;
          font-family: 'DM Mono', monospace;
        }

        .org-table td {
          padding: 14px 20px;
          border-top: 1px solid #1a1a1a;
          font-size: 13px;
          color: #ccc;
          vertical-align: middle;
        }

        .org-table tr:hover td { background: #161616; }

        .org-name {
          font-weight: 700;
          color: #f0f0f0;
          font-size: 14px;
        }

        .org-email {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }

        .vat-pill {
          display: inline-block;
          background: rgba(200,240,74,0.1);
          color: #c8f04a;
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 11px;
          font-family: 'DM Mono', monospace;
          font-weight: 500;
        }

        .actions { display: flex; gap: 8px; align-items: center; }

        /* ── Empty / loading ── */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #444;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
        }

        .skeleton-row td {
          padding: 16px 20px;
        }

        .skel {
          height: 14px;
          border-radius: 4px;
          background: linear-gradient(90deg, #1a1a1a 25%, #232323 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(3px);
        }

        .modal {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal::before {
          content: '';
          position: absolute;
          top: 0; left: 40px; right: 40px;
          height: 2px;
          background: #c8f04a;
          border-radius: 0 0 4px 4px;
        }

        .modal-header {
          padding: 28px 28px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 800;
          color: #f0f0f0;
        }

        .modal-close {
          background: none;
          border: none;
          color: #555;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          transition: color 0.15s;
        }
        .modal-close:hover { color: #f0f0f0; }

        .modal-body { padding: 0 28px 28px; }

        .field {
          margin-bottom: 16px;
        }

        .field label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 7px;
          font-family: 'DM Mono', monospace;
        }

        .field input {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 13px;
          color: #f0f0f0;
          font-family: 'Syne', sans-serif;
          transition: border-color 0.2s;
          outline: none;
        }
        .field input:focus { border-color: #c8f04a; }
        .field input::placeholder { color: #3a3a3a; }

        .field-hint {
          font-size: 11px;
          color: #444;
          margin-top: 5px;
          font-family: 'DM Mono', monospace;
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-error {
          background: rgba(255,77,109,0.1);
          border: 1px solid rgba(255,77,109,0.3);
          color: #ff4d6d;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }

        /* ── Delete confirm ── */
        .confirm-modal {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          padding: 32px;
          max-width: 380px;
          width: 100%;
          text-align: center;
        }

        .confirm-icon { font-size: 32px; margin-bottom: 12px; }
        .confirm-title { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
        .confirm-msg { font-size: 13px; color: #777; margin-bottom: 24px; line-height: 1.5; }
        .confirm-actions { display: flex; gap: 10px; justify-content: center; }

        .btn-confirm-delete {
          background: #ff4d6d;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
        }

        /* ── Toast ── */
        .toast {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background: #c8f04a;
          color: #0a0a0a;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          z-index: 999;
          font-family: 'Syne', sans-serif;
          animation: toastIn 0.3s ease;
          white-space: nowrap;
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .org-table th:nth-child(3),
          .org-table td:nth-child(3),
          .org-table th:nth-child(4),
          .org-table td:nth-child(4) { display: none; }
          .search-input { width: 160px; }
          .field-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <h1>Organisers</h1>
        <div className="header-right">
          <input
            className="search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn-primary" onClick={openAdd}>+ Add Organiser</button>
        </div>
      </div>

      <div className="count-badge">
        {loading ? 'Loading…' : `${filtered.length} organiser${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* ── Table ── */}
      <div className="org-table-wrap">
        <table className="org-table">
          <thead>
            <tr>
              <th>Organiser</th>
              <th>Phone</th>
              <th>VAT No.</th>
              <th>VAT %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} className="skeleton-row">
                  {[180,100,120,60,80].map((w, j) => (
                    <td key={j}><div className="skel" style={{ width: w }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    {search ? `No organisers matching "${search}"` : 'No organisers yet. Add your first one!'}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(org => (
                <tr key={org.id}>
                  <td>
                    <div className="org-name">{org.name}</div>
                    <div className="org-email">{org.email}</div>
                  </td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                    {org.phone || <span style={{ color: '#333' }}>—</span>}
                  </td>
                  <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                    {org.vat_number || <span style={{ color: '#333' }}>—</span>}
                  </td>
                  <td>
                    {org.vat_percent != null
                      ? <span className="vat-pill">{org.vat_percent}%</span>
                      : <span style={{ color: '#333' }}>—</span>
                    }
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn-ghost" onClick={() => openEdit(org)}>Edit</button>
                      <button className="btn-danger" onClick={() => setDeleteConfirm(org)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editTarget ? 'Edit Organiser' : 'Add Organiser'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dublin Nights Collective"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="organiser@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="field">
                  <label>Phone</label>
                  <input
                    type="tel"
                    placeholder="+353 87 000 0000"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label>VAT Number</label>
                    <input
                      type="text"
                      placeholder="IE1234567T"
                      value={form.vat_number}
                      onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label>VAT % to charge</label>
                    <input
                      type="number"
                      placeholder="23"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.vat_percent}
                      onChange={e => setForm(f => ({ ...f, vat_percent: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Password {editTarget && <span style={{ color: '#444' }}>(leave blank to keep current)</span>}</label>
                  <input
                    type="password"
                    placeholder={editTarget ? '••••••••' : 'Set a password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required={!editTarget}
                  />
                  {!editTarget && (
                    <div className="field-hint">This is what the organiser uses to log in.</div>
                  )}
                </div>

                {formError && <div className="form-error">{formError}</div>}

                <div className="modal-footer">
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={formLoading}>
                    {formLoading ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Organiser'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="confirm-modal">
            <div className="confirm-icon">⚠️</div>
            <div className="confirm-title">Delete organiser?</div>
            <div className="confirm-msg">
              This will permanently delete <strong>{deleteConfirm.name}</strong> and cannot be undone.
              Their events will remain but will be unlinked.
            </div>
            <div className="confirm-actions">
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-confirm-delete" onClick={() => handleDelete(deleteConfirm.id)}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
