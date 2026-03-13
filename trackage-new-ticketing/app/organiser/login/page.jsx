/* app/organiser/login/page.jsx */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --accent:#0a9e7f;--accent-dark:#087d65;
  --text:#111827;--text-mid:#6b7280;--border:#e5e7eb;
  --bg:#f9fafb;--white:#ffffff;--danger:#ef4444;
}
html,body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:var(--white);border-radius:16px;width:100%;max-width:420px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.08)}
.card-top{background:#000;padding:40px 36px 32px;text-align:center}
.logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:20px;text-decoration:none}
.logo-mark{width:36px;height:36px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center}
.logo-name{font-size:15px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.04em}
.card-title{font-size:22px;font-weight:700;color:#fff;margin-bottom:6px}
.card-sub{font-size:13px;color:rgba(255,255,255,0.55)}
.card-body{padding:32px 36px}
.form-group{margin-bottom:18px}
label{display:block;font-size:12px;font-weight:600;color:var(--text-mid);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px}
input{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);background:var(--white);outline:none;transition:border-color 0.15s}
input:focus{border-color:var(--accent)}
.btn{width:100%;padding:11px;border:none;border-radius:8px;font-size:14px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;transition:background 0.15s;margin-top:4px}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-dark)}
.btn-primary:disabled{opacity:0.6;cursor:not-allowed}
.btn-google{background:var(--white);color:var(--text);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;width:100%;padding:10px;border-radius:8px;font-size:14px;font-weight:500;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color 0.15s}
.btn-google:hover{border-color:#aaa}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--text-mid);font-size:12px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border)}
.error{background:#fef2f2;border:1px solid #fecaca;color:var(--danger);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.footer{text-align:center;margin-top:20px;font-size:13px;color:var(--text-mid)}
.footer a{color:var(--accent);text-decoration:none;font-weight:500}
.footer a:hover{text-decoration:underline}
`;

export default function OrganiserLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); setLoading(false); return; }

      await loadOrganiser(data.session.access_token, data.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/organiser/auth/callback` },
    });
    if (authError) setError(authError.message);
  }

  async function loadOrganiser(token, user) {
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
    } else {
      setError(json.error || 'Could not load organiser profile');
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
              <div className="logo-mark">
                <svg viewBox="0 0 14 14" fill="none" width="18" height="18">
                  <circle cx="7" cy="7" r="5" stroke="#fff" strokeWidth="2"/>
                  <circle cx="7" cy="7" r="2" fill="#fff"/>
                </svg>
              </div>
              <span className="logo-name">Trackage</span>
            </Link>
            <div className="card-title">Organiser Portal</div>
            <div className="card-sub">Sign in to manage your events</div>
          </div>

          <div className="card-body">
            {error && <div className="error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email" value={email} required autoFocus
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password" value={password} required
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="footer">
              Don't have an account? <Link href="/organiser/signup">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
