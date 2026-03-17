/* app/admin/login/page.jsx */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
.error{background:#fef2f2;border:1px solid #fecaca;color:var(--danger);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.remember{display:flex;align-items:center;gap:8px;margin-bottom:18px;cursor:pointer;user-select:none}
.remember input[type=checkbox]{width:16px;height:16px;accent-color:var(--black);cursor:pointer;margin:0}
.remember span{font-size:13px;color:var(--muted);font-weight:500}
`;

export default function AdminLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [remember, setRemember] = useState(true);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/admin/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        const store = remember ? localStorage : sessionStorage;
        // Clear the other storage to avoid stale tokens
        (remember ? sessionStorage : localStorage).removeItem('admin_authenticated');
        (remember ? sessionStorage : localStorage).removeItem('admin_token');
        store.setItem('admin_authenticated', 'true');
        store.setItem('admin_token', data.token);
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid email or password. Please try again.');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div>
      <style>{CSS}</style>
      <div className="page">
        <div className="card">
          <div className="card-top">
            <div className="logo">
              <img src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png" alt="Trackage Scheme" style={{ height: '28px', width: 'auto', display: 'block' }} />
            </div>
            <div className="card-title">Admin Portal</div>
            <div className="card-sub">Sign in to manage the platform</div>
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
                  type="password" value={password} required autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <label className="remember">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
