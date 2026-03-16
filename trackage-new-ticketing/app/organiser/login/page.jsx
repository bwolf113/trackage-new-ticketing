/* app/organiser/login/page.jsx */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F6FA;--surface:#FFFFFF;--border:#EBEDF0;
  --muted:#767C8C;--black:#000000;--danger:#ef4444;
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
.btn-google{background:var(--surface);color:var(--black);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;width:100%;padding:10px;border-radius:8px;font-size:14px;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:border-color 0.15s}
.btn-google:hover{border-color:var(--black)}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--muted);font-size:12px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border)}
.error{background:#fef2f2;border:1px solid #fecaca;color:var(--danger);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.footer{text-align:center;margin-top:20px;font-size:13px;color:var(--muted)}
.footer a{color:var(--black);text-decoration:none;font-weight:600}
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
              <img src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png" alt="Trackage Scheme" style={{ height: '28px', width: 'auto', display: 'block' }} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ marginBottom: 0 }}>Password</label>
                  <Link href="/organiser/forgot-password" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', fontWeight: 500 }}>
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password" value={password} required autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="divider">or</div>

            <button className="btn-google" onClick={handleGoogle}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <div className="footer">
              Don't have an account? <Link href="/organiser/signup">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
