/* app/organiser/set-password/page.jsx
   Landing page for the invite link — lets a new organiser set their password.
   Supabase redirects here with #access_token=...&type=invite in the hash.
*/
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F6FA;--surface:#FFFFFF;--border:#EBEDF0;
  --muted:#767C8C;--black:#000000;--danger:#ef4444;--success:#16a34a;
}
html,body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--black);min-height:100vh}
.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:var(--surface);border-radius:16px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.08)}
.card-top{background:#000;padding:40px 36px 32px;text-align:center}
.logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:20px;text-decoration:none}
.card-title{font-size:22px;font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-0.02em}
.card-sub{font-size:13px;color:rgba(255,255,255,0.55)}
.card-body{padding:32px 36px}
.form-group{margin-bottom:18px}
label{display:block;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px}
input{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:var(--black);background:var(--surface);outline:none;transition:border-color 0.15s}
input:focus{border-color:var(--black)}
.btn{width:100%;padding:11px;border:none;border-radius:8px;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:opacity 0.15s;margin-top:4px}
.btn-primary{background:var(--black);color:#fff}
.btn-primary:hover{opacity:0.85}
.btn-primary:disabled{opacity:0.5;cursor:not-allowed}
.error{background:#fef2f2;border:1px solid #fecaca;color:var(--danger);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.info{background:#f0fdf4;border:1px solid #bbf7d0;color:var(--success);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.hint{font-size:12px;color:var(--muted);margin-top:6px}
`;

export default function SetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [ready,     setReady]     = useState(false); // session established from invite link
  const [error,     setError]     = useState('');
  const [showPw,    setShowPw]    = useState(false);

  // Exchange the invite token from the URL hash for a session
  useEffect(() => {
    async function handleInvite() {
      // getSession will pick up the tokens from the URL hash automatically
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !data.session) {
        setError('This invite link is invalid or has expired. Please ask your administrator for a new one.');
        return;
      }
      setReady(true);
    }
    handleInvite();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      // Session is already active — load the organiser profile and redirect
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        const res  = await fetch('/api/organiser/me', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({}),
        });
        const json = await res.json();
        if (json.organiser) {
          localStorage.setItem('organiser_id',   json.organiser.id);
          localStorage.setItem('organiser_name', json.organiser.name);
          router.push('/organiser');
          return;
        }
      }
      // Fallback — send them to login
      router.push('/organiser/login');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div>
      <style>{CSS}</style>
      <div className="page">
        <div className="card">
          <div className="card-top">
            <Link href="/" className="logo">
              <img src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png" alt="Trackage Scheme" style={{ height: '28px', width: 'auto', display: 'block' }} />
            </Link>
            <div className="card-title">Set your password</div>
            <div className="card-sub">Choose a password to activate your organiser account</div>
          </div>

          <div className="card-body">
            {error && <div className="error">{error}</div>}

            {ready ? (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      required
                      autoFocus
                      placeholder="At least 8 characters"
                      onChange={e => setPassword(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--muted)', padding: 4 }}
                    >{showPw ? '🙈' : '👁'}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    required
                    placeholder="Repeat your password"
                    onChange={e => setConfirm(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving…' : 'Set password & log in'}
                </button>
              </form>
            ) : !error ? (
              <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>Verifying your invite link…</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
