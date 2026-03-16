/* app/organiser/reset-password/page.jsx */
'use client';
import { useState, useEffect, useRef } from 'react';
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
.success-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 16px;text-align:center;margin-bottom:16px}
.success-icon{font-size:36px;margin-bottom:12px}
.success-title{font-size:16px;font-weight:700;color:var(--black);margin-bottom:8px}
.success-text{font-size:13px;color:var(--muted);line-height:1.5}
.invalid-box{text-align:center;padding:8px 0}
.invalid-icon{font-size:36px;margin-bottom:16px}
.invalid-title{font-size:16px;font-weight:700;color:var(--black);margin-bottom:8px}
.invalid-text{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:20px}
.footer{text-align:center;margin-top:20px;font-size:13px;color:var(--muted)}
.footer a{color:var(--black);text-decoration:none;font-weight:600}
.footer a:hover{text-decoration:underline}
.hint{font-size:12px;color:var(--muted);margin-top:4px}
`;

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready,       setReady]       = useState(false);   // recovery token confirmed
  const [invalid,     setInvalid]     = useState(false);   // token missing/expired
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [succeeded,   setSucceeded]   = useState(false);

  // Track whether we've confirmed a valid recovery token without triggering re-renders
  const readyRef = useRef(false);

  function markReady() {
    readyRef.current = true;
    setReady(true);
  }

  useEffect(() => {
    // Listen for Supabase's PASSWORD_RECOVERY event (fires when user lands
    // from the reset email link and Supabase processes the hash token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        markReady();
      }
    });

    // Also handle the hash directly — Supabase's JS client processes the
    // hash on load, but the event fires async. Check hash as a fallback so
    // the form appears even if the event fires before our listener registers.
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        markReady();
      }
    }

    // If no valid recovery token found within 3 seconds, show the invalid state
    const invalidTimer = setTimeout(() => {
      if (!readyRef.current) {
        setInvalid(true);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(invalidTimer);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      setSucceeded(true);
      setTimeout(() => router.push('/organiser/login'), 2000);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <style>{CSS}</style>
      <div className="page">
        <div className="card">
          <div className="card-top">
            <Link href="/" className="logo">
              <img
                src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png"
                alt="Trackage Scheme"
                style={{ height: '28px', width: 'auto', display: 'block' }}
              />
            </Link>
            <div className="card-title">Set New Password</div>
            <div className="card-sub">Choose a strong password for your account</div>
          </div>

          <div className="card-body">
            {succeeded && (
              <div className="success-box">
                <div className="success-icon">✅</div>
                <div className="success-title">Password updated!</div>
                <div className="success-text">
                  Your password has been changed. Redirecting you to sign in…
                </div>
              </div>
            )}

            {!succeeded && invalid && (
              <div className="invalid-box">
                <div className="invalid-icon">🔗</div>
                <div className="invalid-title">Link invalid or expired</div>
                <div className="invalid-text">
                  This password reset link has expired or already been used.
                  Please request a new one.
                </div>
                <Link href="/organiser/forgot-password" className="btn btn-primary"
                  style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px', borderRadius: 8, background: '#000', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                  Request new link
                </Link>
              </div>
            )}

            {!succeeded && !invalid && !ready && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 14 }}>
                Verifying reset link…
              </div>
            )}

            {!succeeded && ready && (
              <>
                {error && <div className="error">{error}</div>}
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={password}
                      required
                      autoFocus
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                    <div className="hint">Minimum 8 characters</div>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={confirm}
                      required
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your new password"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </>
            )}

            {!succeeded && (
              <div className="footer">
                <Link href="/organiser/login">← Back to sign in</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
