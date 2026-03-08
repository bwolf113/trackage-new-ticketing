/* app/admin/login/page.jsx */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ⚠️ Replace these with your real admin credentials
  // In production, you should verify against Supabase or a secure env variable
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@trackagescheme.com';
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'changeme123';

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simple credential check — swap for Supabase Auth later
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_authenticated', 'true');
      router.push('/admin');
    } else {
      setError('Invalid email or password.');
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #0a0a0a; }

        .login-page {
          min-height: 100vh;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        /* Grid background */
        .login-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(200,240,74,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200,240,74,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .login-card {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: -1px; left: 40px; right: 40px;
          height: 2px;
          background: #c8f04a;
          border-radius: 0 0 4px 4px;
        }

        .login-logo {
          text-align: center;
          margin-bottom: 36px;
        }

        .login-logo .brand {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c8f04a;
        }

        .login-logo .subtitle {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #666;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .login-title {
          font-size: 20px;
          font-weight: 700;
          color: #f0f0f0;
          margin-bottom: 24px;
        }

        .field {
          margin-bottom: 16px;
        }

        .field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 8px;
          font-family: 'DM Mono', monospace;
        }

        .field input {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 14px;
          color: #f0f0f0;
          font-family: 'Syne', sans-serif;
          transition: border-color 0.2s;
          outline: none;
        }

        .field input:focus {
          border-color: #c8f04a;
        }

        .error-msg {
          background: rgba(255,77,109,0.1);
          border: 1px solid rgba(255,77,109,0.3);
          color: #ff4d6d;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .login-btn {
          width: 100%;
          background: #c8f04a;
          color: #0a0a0a;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          transition: opacity 0.2s, transform 0.1s;
          margin-top: 8px;
        }

        .login-btn:hover { opacity: 0.9; }
        .login-btn:active { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="login-card">
        <div className="login-logo">
          <div className="brand">Trackage</div>
          <div className="subtitle">Admin Access</div>
        </div>

        <div className="login-title">Sign in</div>

        <form onSubmit={handleLogin}>
          <div className="field">
            <label>Email</label>
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
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}
