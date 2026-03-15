/* app/organiser/forgot-password/page.jsx */
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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
.success-box{background:#f0fdf4;border:1px solid #bbf7d0;color:var(--success);border-radius:8px;padding:20px 16px;font-size:14px;text-align:center;margin-bottom:16px}
.success-icon{font-size:36px;margin-bottom:12px}
.success-title{font-size:16px;font-weight:700;color:var(--black);margin-bottom:8px}
.success-text{font-size:13px;color:var(--muted);line-height:1.5}
.footer{text-align:center;margin-top:20px;font-size:13px;color:var(--muted)}
.footer a{color:var(--black);text-decoration:none;font-weight:600}
.footer a:hover{text-decoration:underline}
.cooldown-note{text-align:center;font-size:12px;color:var(--muted);margin-top:10px}
`;

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [cooldown,  setCooldown]  = useState(0); // seconds remaining
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCooldown(seconds = 60) {
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading || cooldown > 0) return;
    setError('');
    setLoading(true);

    try {
      const res  = await fetch('/api/organiser/request-password-reset', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      startCooldown(60);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
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
            <div className="card-title">Reset Your Password</div>
            <div className="card-sub">Enter your email and we'll send you a reset link</div>
          </div>

          <div className="card-body">
            {error && <div className="error">{error}</div>}

            {submitted ? (
              <div className="success-box">
                <div className="success-icon">✉️</div>
                <div className="success-title">Check your email</div>
                <div className="success-text">
                  If an account exists for that address, we've sent a password reset link.
                  Check your inbox (and spam folder, just in case).
                </div>
              </div>
            ) : null}

            {!submitted && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    required
                    autoFocus
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || cooldown > 0}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}

            {submitted && cooldown > 0 && (
              <>
                <button
                  className="btn btn-primary"
                  disabled
                  style={{ marginTop: 16 }}
                >
                  Resend in {cooldown}s
                </button>
                <div className="cooldown-note">
                  Didn't receive it? Check your spam folder or wait {cooldown}s to resend.
                </div>
              </>
            )}

            {submitted && cooldown === 0 && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => { setSubmitted(false); setError(''); }}
              >
                Send another link
              </button>
            )}

            <div className="footer">
              <Link href="/organiser/login">← Back to sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
