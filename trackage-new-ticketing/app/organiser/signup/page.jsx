/* app/organiser/signup/page.jsx */
'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { supabase } from '../../../lib/supabase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F6FA;--surface:#FFFFFF;--border:#EBEDF0;
  --muted:#767C8C;--green:#48C16E;--black:#000000;--danger:#ef4444;
}
html,body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg);color:var(--black);min-height:100vh}
.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:var(--surface);border-radius:16px;width:100%;max-width:440px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.08)}
.card-top{background:#000;padding:36px 36px 28px;text-align:center}
.logo{display:inline-flex;align-items:center;gap:10px;margin-bottom:16px;text-decoration:none}
.card-title{font-size:22px;font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-0.02em}
.card-sub{font-size:13px;color:rgba(255,255,255,0.55)}
.card-body{padding:28px 36px 32px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.form-group{margin-bottom:16px}
label{display:block;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px}
input{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:var(--black);background:var(--surface);outline:none;transition:border-color 0.15s}
input:focus{border-color:var(--black)}
.btn{width:100%;padding:11px;border:none;border-radius:8px;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:opacity 0.15s;margin-top:4px}
.btn-primary{background:var(--black);color:#fff}
.btn-primary:hover{opacity:0.85}
.btn-primary:disabled{opacity:0.5;cursor:not-allowed}
.btn-google{background:var(--surface);color:var(--black);border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px;border-radius:8px;font-size:14px;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:border-color 0.15s;margin-top:12px}
.btn-google:hover{border-color:var(--black)}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--muted);font-size:12px}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border)}
.error{background:#fef2f2;border:1px solid #fecaca;color:var(--danger);border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
.success{background:rgba(72,193,110,0.1);border:1px solid rgba(72,193,110,0.3);color:#065f46;border-radius:8px;padding:12px 14px;font-size:13px;margin-bottom:16px;line-height:1.5}
.footer{text-align:center;margin-top:20px;font-size:13px;color:var(--muted)}
.footer a{color:var(--black);text-decoration:none;font-weight:600}
`;

export default function OrganiserSignupPage() {
  const router = useRouter();
  const recaptchaRef = useRef(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }

    const token = recaptchaRef.current?.getValue();
    if (!token) { setError('Please complete the reCAPTCHA'); return; }

    setLoading(true);

    // Verify reCAPTCHA server-side
    const verifyRes = await fetch('/api/verify-recaptcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      setError(verifyData.error || 'reCAPTCHA failed. Please try again.');
      recaptchaRef.current?.reset();
      setLoading(false);
      return;
    }
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options:  { data: { full_name: fullName } },
      });

      if (authError) { setError(authError.message); recaptchaRef.current?.reset(); setLoading(false); return; }

      // If email confirmation is required
      if (!data.session) {
        setSuccess('Account created! Check your email to confirm your address, then sign in.');
        setLoading(false);
        return;
      }

      // Auto-confirmed — create organiser profile and redirect
      const res  = await fetch('/api/organiser/me', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body:    JSON.stringify({ name: fullName }),
      });
      const json = await res.json();
      if (json.organiser) {
        localStorage.setItem('organiser_id',   json.organiser.id);
        localStorage.setItem('organiser_name', json.organiser.name);
        router.push('/organiser');
      } else {
        setError(json.error || 'Profile creation failed');
        setLoading(false);
      }
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

  return (
    <div>
      <style>{CSS}</style>
      <div className="page">
        <div className="card">
          <div className="card-top">
            <Link href="/" className="logo">
              <img src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png" alt="Trackage Scheme" style={{ height: '28px', width: 'auto', display: 'block' }} />
            </Link>
            <div className="card-title">Create your account</div>
            <div className="card-sub">Start selling tickets in minutes</div>
          </div>

          <div className="card-body">
            {error   && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            {!success && (
              <form onSubmit={handleSignup}>
                <div className="row">
                  <div className="form-group">
                    <label>First name</label>
                    <input value={form.firstName} onChange={set('firstName')} required placeholder="Jane" />
                  </div>
                  <div className="form-group">
                    <label>Last name</label>
                    <input value={form.lastName} onChange={set('lastName')} required placeholder="Smith" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={form.password} onChange={set('password')} required placeholder="Min. 6 characters" />
                </div>
                <div className="form-group">
                  <label>Confirm password</label>
                  <input type="password" value={form.confirm} onChange={set('confirm')} required placeholder="••••••••" />
                </div>
                <div style={{ margin: '16px 0 4px' }}>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            )}

            {!success && (
              <>
                <div className="divider">or</div>
                <button className="btn-google" onClick={handleGoogle}>
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Sign up with Google
                </button>
              </>
            )}

            <div className="footer">
              Already have an account? <Link href="/organiser/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
