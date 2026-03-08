/* app/admin/organisers/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', vat_number: '', vat_percent: '' };

export default function OrganisersPage() {
  const [organisers, setOrganisers]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [formError, setFormError]       = useState('');
  const [formLoading, setFormLoading]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast]               = useState('');

  useEffect(() => { fetchOrganisers(); }, []);

  async function fetchOrganisers() {
    setLoading(true);
    const { data } = await supabase.from('organisers').select('*').order('created_at', { ascending: false });
    setOrganisers(data || []);
    setLoading(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function openAdd() {
    setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); setShowModal(true);
  }

  function openEdit(org) {
    setEditTarget(org);
    setForm({ name: org.name||'', email: org.email||'', phone: org.phone||'', password: '', vat_number: org.vat_number||'', vat_percent: org.vat_percent??'' });
    setFormError(''); setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setFormError(''); setFormLoading(true);

    const payload = {
      name:        form.name.trim(),
      email:       form.email.trim().toLowerCase(),
      phone:       form.phone.trim(),
      vat_number:  form.vat_number.trim(),
      vat_percent: form.vat_percent !== '' ? parseFloat(form.vat_percent) : null,
    };
    if (form.password) payload.password = form.password;

    let error;
    if (editTarget) {
      ({ error } = await supabase.from('organisers').update(payload).eq('id', editTarget.id));
    } else {
      if (!form.password) { setFormError('Password is required.'); setFormLoading(false); return; }
      ({ error } = await supabase.from('organisers').insert([payload]));
    }

    if (error) { setFormError(error.message); }
    else { setShowModal(false); showToast(editTarget ? 'Organiser updated.' : 'Organiser created successfully.'); fetchOrganisers(); }
    setFormLoading(false);
  }

  async function handleDelete(id) {
    await supabase.from('organisers').delete().eq('id', id);
    setDeleteConfirm(null); showToast('Organiser deleted.'); fetchOrganisers();
  }

  const filtered = organisers.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="org-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .org-page { font-family: 'Inter', sans-serif; color: #111827; }

        /* ── Header ── */
        .page-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
        }

        .page-title { font-size: 22px; font-weight: 700; color: #111827; }

        .header-right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        .search-wrap {
          position: relative;
        }
        .search-icon {
          position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
          color: #9ca3af; font-size: 14px; pointer-events: none;
        }
        .search-input {
          background: #fff;
          border: 1.5px solid #e5e7eb;
          color: #111827;
          padding: 8px 14px 8px 34px;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          outline: none;
          width: 230px;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: #0a9e7f; }
        .search-input::placeholder { color: #9ca3af; }

        .btn-primary {
          background: #0a9e7f; color: #fff; border: none;
          padding: 9px 18px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
          white-space: nowrap;
        }
        .btn-primary:hover { background: #087d65; }

        .btn-secondary {
          background: #fff; color: #374151;
          border: 1.5px solid #e5e7eb;
          padding: 7px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: all 0.15s;
        }
        .btn-secondary:hover { border-color: #9ca3af; }

        .btn-danger-ghost {
          background: none; border: none;
          color: #dc2626; font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: 'Inter', sans-serif;
          padding: 4px 8px; border-radius: 6px;
          transition: background 0.15s;
        }
        .btn-danger-ghost:hover { background: #fef2f2; }

        /* ── Count ── */
        .count-label { font-size: 13px; color: #6b7280; margin-bottom: 14px; }

        /* ── Table ── */
        .table-wrap {
          background: #fff; border: 1px solid #e5e7eb;
          border-radius: 12px; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .data-table { width: 100%; border-collapse: collapse; }

        .data-table th {
          background: #f9fafb; padding: 12px 20px; text-align: left;
          font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 14px 20px; border-top: 1px solid #f3f4f6;
          font-size: 14px; color: #374151; vertical-align: middle;
        }

        .data-table tr:hover td { background: #fafafa; }

        .org-name  { font-weight: 600; color: #111827; }
        .org-email { font-size: 12px; color: #6b7280; margin-top: 2px; }

        .vat-badge {
          display: inline-block;
          background: #f0fdf9; color: #0a9e7f;
          border: 1px solid #d1fae5;
          border-radius: 20px; padding: 2px 10px;
          font-size: 12px; font-weight: 600;
        }

        .actions { display: flex; gap: 8px; align-items: center; }

        /* ── Skeleton ── */
        .skel {
          height: 14px; border-radius: 4px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .empty-state { text-align: center; padding: 60px 20px; color: #9ca3af; font-size: 14px; }

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          z-index: 200; display: flex; align-items: center; justify-content: center;
          padding: 20px; backdrop-filter: blur(2px);
        }

        .modal {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
          width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }

        .modal-header {
          padding: 24px 24px 0;
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px;
        }

        .modal-title { font-size: 18px; font-weight: 700; color: #111827; }

        .modal-close {
          background: #f3f4f6; border: none; color: #6b7280;
          width: 30px; height: 30px; border-radius: 6px;
          font-size: 16px; cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .modal-close:hover { background: #e5e7eb; color: #111827; }

        .modal-body { padding: 0 24px 24px; }

        .field { margin-bottom: 16px; }

        .field label {
          display: block; font-size: 13px; font-weight: 600;
          color: #374151; margin-bottom: 6px;
        }

        .field input {
          width: 100%; border: 1.5px solid #e5e7eb; border-radius: 8px;
          padding: 10px 14px; font-size: 14px; color: #111827;
          font-family: 'Inter', sans-serif; background: #fff; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field input:focus { border-color: #0a9e7f; box-shadow: 0 0 0 3px rgba(10,158,127,0.1); }
        .field input::placeholder { color: #d1d5db; }

        .field-hint { font-size: 12px; color: #9ca3af; margin-top: 5px; }
        .field-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .form-error {
          background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
          border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
        }

        .modal-footer {
          display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;
          padding-top: 20px; border-top: 1px solid #f3f4f6;
        }

        /* ── Delete confirm ── */
        .confirm-modal {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
          padding: 32px; max-width: 380px; width: 100%; text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .confirm-icon  { font-size: 36px; margin-bottom: 12px; }
        .confirm-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #111827; }
        .confirm-msg   { font-size: 14px; color: #6b7280; margin-bottom: 24px; line-height: 1.6; }
        .confirm-actions { display: flex; gap: 10px; justify-content: center; }
        .btn-delete { background: #dc2626; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s; }
        .btn-delete:hover { background: #b91c1c; }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: #111827; color: #fff;
          padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 500;
          z-index: 999; white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          animation: toastIn 0.3s ease;
        }
        @keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }

        @media (max-width: 640px) {
          .data-table th:nth-child(3), .data-table td:nth-child(3),
          .data-table th:nth-child(4), .data-table td:nth-child(4) { display: none; }
          .search-input { width: 160px; }
          .field-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-title">Organisers</div>
        <div className="header-right">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={openAdd}>+ Add organiser</button>
        </div>
      </div>

      <div className="count-label">
        {loading ? 'Loading…' : `${filtered.length} organiser${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organiser</th>
              <th>Phone</th>
              <th>VAT Number</th>
              <th>VAT %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i}>
                  {[180,100,120,60,80].map((w,j) => (
                    <td key={j}><div className="skel" style={{ width: w }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  {search ? `No results for "${search}"` : 'No organisers yet. Add your first one.'}
                </div>
              </td></tr>
            ) : filtered.map(org => (
              <tr key={org.id}>
                <td>
                  <div className="org-name">{org.name}</div>
                  <div className="org-email">{org.email}</div>
                </td>
                <td>{org.phone || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {org.vat_number || <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td>
                  {org.vat_percent != null
                    ? <span className="vat-badge">{org.vat_percent}%</span>
                    : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td>
                  <div className="actions">
                    <button className="btn-secondary" onClick={() => openEdit(org)}>Edit</button>
                    <button className="btn-danger-ghost" onClick={() => setDeleteConfirm(org)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editTarget ? 'Edit organiser' : 'Add organiser'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="field">
                  <label>Full name</label>
                  <input type="text" placeholder="e.g. Dublin Nights Collective" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Email address</label>
                  <input type="email" placeholder="organiser@example.com" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Phone number</label>
                  <input type="tel" placeholder="+353 87 000 0000" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>VAT number</label>
                    <input type="text" placeholder="IE1234567T" value={form.vat_number}
                      onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>VAT % to charge</label>
                    <input type="number" placeholder="23" min="0" max="100" step="0.1"
                      value={form.vat_percent}
                      onChange={e => setForm(f => ({ ...f, vat_percent: e.target.value }))} />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Password {editTarget && <span style={{ color: '#9ca3af', fontWeight: 400 }}> — leave blank to keep current</span>}
                  </label>
                  <input type="password" placeholder={editTarget ? 'Leave blank to keep current' : 'Set a password'}
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required={!editTarget} />
                  {!editTarget && <div className="field-hint">This is what the organiser uses to log in.</div>}
                </div>

                {formError && <div className="form-error">⚠ {formError}</div>}

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={formLoading}>
                    {formLoading ? 'Saving…' : editTarget ? 'Save changes' : 'Create organiser'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="confirm-modal">
            <div className="confirm-icon">🗑️</div>
            <div className="confirm-title">Delete organiser?</div>
            <div className="confirm-msg">
              You're about to permanently delete <strong>{deleteConfirm.name}</strong>. This cannot be undone.
            </div>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-delete" onClick={() => handleDelete(deleteConfirm.id)}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
