/* app/organiser/profile/page.jsx — Organiser Profile */
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CSS = `
.profile-page { max-width: 640px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.page-sub { font-size: 13px; color: var(--text-mid); margin-bottom: 28px; }
.section-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
.section-head { padding: 18px 24px; border-bottom: 1px solid var(--border); }
.section-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.section-sub { font-size: 12px; color: var(--text-mid); }
.section-body { padding: 20px 24px; }
.field { margin-bottom: 18px; }
.field:last-child { margin-bottom: 0; }
.field-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 7px; }
.field-input { width: 100%; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; color: var(--text); background: var(--white); outline: none; transition: border-color 0.15s; }
.field-input:focus { border-color: var(--accent); }
.field-input:disabled { background: var(--bg); color: var(--text-mid); cursor: not-allowed; }
.field-hint { font-size: 11px; color: var(--text-light); margin-top: 5px; }
.btn-save { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; transition: background 0.15s; }
.btn-save:hover { background: var(--accent-dark); }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.msg-ok  { background: #dcfce7; color: #16a34a; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
.msg-err { background: #fee2e2; color: #dc2626; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
.skel { height: 14px; border-radius: 4px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
`;

export default function OrganiserProfilePage() {
  const router = useRouter();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [profile,  setProfile]  = useState({ name: '', email: '', vat_number: '', bank_iban: '' });
  const [organiser_id, setOrganiserId] = useState('');

  useEffect(() => {
    const oid = localStorage.getItem('organiser_id');
    if (!oid) { router.push('/organiser/login'); return; }
    setOrganiserId(oid);

    fetch(`/api/organiser/profile?organiser_id=${oid}`)
      .then(r => r.json())
      .then(json => {
        if (json.organiser) {
          setProfile({
            name:       json.organiser.name       || '',
            email:      json.organiser.email      || '',
            vat_number: json.organiser.vat_number || '',
            bank_iban:  json.organiser.bank_iban  || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  const MT_VAT_RE = /^MT\d{8}$/i;

  async function handleSave(e) {
    e.preventDefault();
    if (profile.vat_number && !MT_VAT_RE.test(profile.vat_number.trim())) {
      flash('Invalid VAT number. Must be in the format MT12345678 (MT + 8 digits).', false);
      return;
    }
    setSaving(true);
    const res  = await fetch('/api/organiser/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organiser_id,
        vat_number: profile.vat_number,
        bank_iban:  profile.bank_iban,
      }),
    });
    const data = await res.json();
    if (data.success) flash('Profile saved successfully.');
    else flash(data.error || 'Save failed', false);
    setSaving(false);
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="profile-page">
        <div className="page-title">My Profile</div>
        <div className="page-sub">Manage your organiser details and payment information.</div>

        {msg && <div className={msg.ok ? 'msg-ok' : 'msg-err'}>{msg.text}</div>}

        <form onSubmit={handleSave}>
          {/* Account info */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">Account</div>
              <div className="section-sub">Basic account information (read-only)</div>
            </div>
            <div className="section-body">
              <div className="field">
                <label className="field-label">Name</label>
                {loading
                  ? <div className="skel" style={{ height: 40 }} />
                  : <input className="field-input" value={profile.name} disabled />
                }
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                {loading
                  ? <div className="skel" style={{ height: 40 }} />
                  : <input className="field-input" type="email" value={profile.email} disabled />
                }
              </div>
            </div>
          </div>

          {/* Tax */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">Tax Information</div>
              <div className="section-sub">Your VAT number is included on invoices and ticket receipts.</div>
            </div>
            <div className="section-body">
              <div className="field">
                <label className="field-label">VAT Number</label>
                {loading
                  ? <div className="skel" style={{ height: 40 }} />
                  : <input
                      className="field-input"
                      value={profile.vat_number}
                      onChange={e => setProfile(p => ({ ...p, vat_number: e.target.value.toUpperCase() }))}
                      placeholder="e.g. MT12345678"
                    />
                }
                {profile.vat_number && !/^MT\d{8}$/i.test(profile.vat_number.trim())
                  ? <div className="field-hint" style={{ color: '#ef4444' }}>Must be MT + 8 digits, e.g. MT12345678</div>
                  : <div className="field-hint">Leave blank if you are not VAT registered.</div>
                }
              </div>
            </div>
          </div>

          {/* Banking */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">Payment Settlement</div>
              <div className="section-sub">Your IBAN is used to settle event proceeds after each event ends.</div>
            </div>
            <div className="section-body">
              <div className="field">
                <label className="field-label">Bank IBAN</label>
                {loading
                  ? <div className="skel" style={{ height: 40 }} />
                  : <input
                      className="field-input"
                      value={profile.bank_iban}
                      onChange={e => setProfile(p => ({ ...p, bank_iban: e.target.value.toUpperCase() }))}
                      placeholder="e.g. MT84MALT011000012345MTLCAST001S"
                    />
                }
                <div className="field-hint">Your IBAN is stored securely and only used for payment settlements.</div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-save" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </>
  );
}
