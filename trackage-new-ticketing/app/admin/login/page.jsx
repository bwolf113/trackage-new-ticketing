/* app/admin/login/page.jsx */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const ADMIN_EMAIL    = process.env.NEXT_PUBLIC_ADMIN_EMAIL    || 'admin@trackagescheme.com';
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'changeme123';

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_authenticated', 'true');
      router.push('/admin');
    } else {
      setError('Invalid email or password. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #f9fafb; font-family: 'Inter', sans-serif; }

        .login-page {
          min-height: 100vh;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .login-wrap {
          width: 100%;
          max-width: 400px;
        }

        .login-brand {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo-mark {
          width: 48px; height: 48px;
          background: #0a9e7f;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          margin: 0 auto 12px;
        }

        .login-brand-name {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }

        .login-brand-sub {
          font-size: 13px;
          color: #9ca3af;
          margin-top: 2px;
        }

        .login-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        }

        .login-heading {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 6px;
        }

        .login-subheading {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 24px;
        }

        .field { margin-bottom: 16px; }

        .field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .field input {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          color: #111827;
          font-family: 'Inter', sans-serif;
          background: #fff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .field input:focus {
          border-color: #0a9e7f;
          box-shadow: 0 0 0 3px rgba(10,158,127,0.1);
        }

        .error-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .login-btn {
          width: 100%;
          background: #0a9e7f;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 11px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
          margin-top: 4px;
        }

        .login-btn:hover:not(:disabled) { background: #087d65; }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 12px;
          color: #9ca3af;
        }
      `}</style>

      <div className="login-wrap">
        <div className="login-brand">
          <div className="login-logo-mark">🎫</div>
          <div className="login-brand-name">Trackage Scheme</div>
          <div className="login-brand-sub">Admin Portal</div>
        </div>

        <div className="login-card">
          <div className="login-heading">Welcome back</div>
          <div className="login-subheading">Sign in to your admin account</div>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="admin@trackagescheme.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="error-box">
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="login-footer">
          Trackage Scheme © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
