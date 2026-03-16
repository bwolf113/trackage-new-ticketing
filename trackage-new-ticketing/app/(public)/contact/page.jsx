/* app/(public)/contact/page.jsx — Contact form */
'use client';
import { useState } from 'react';
import Link from 'next/link';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --black: #0a0a0a; --white: #ffffff; --off-white: #fafaf9;
  --text: #1a1a1a; --text-mid: #555; --text-light: #999;
  --border: #e8e8e6; --accent: #0a9e7f; --accent-dark: #087d65;
  --danger: #ef4444; --danger-bg: #fef2f2;
  --serif: 'DM Serif Display', Georgia, serif;
  --sans: 'DM Sans', system-ui, sans-serif;
}
body { font-family: var(--sans); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; }

.sp-nav {
  background: var(--black);
  display: flex; align-items: center;
  padding: 0 40px; height: 64px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.sp-nav-logo { display: flex; align-items: center; text-decoration: none; }
.sp-nav-logo img { height: 22px; }

.ct-wrap {
  max-width: 640px; margin: 0 auto;
  padding: 60px 40px 80px;
}
.ct-title {
  font-family: var(--serif);
  font-size: clamp(34px, 5vw, 50px);
  color: var(--black); letter-spacing: -0.02em;
  line-height: 1.05; margin-bottom: 12px;
}
.ct-intro {
  font-size: 16px; line-height: 1.65; color: var(--text-mid);
  margin-bottom: 40px;
}

.ct-form { display: flex; flex-direction: column; gap: 18px; }

.ct-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.ct-field { display: flex; flex-direction: column; gap: 6px; }
.ct-field label {
  font-size: 13px; font-weight: 600; color: var(--text);
  display: flex; align-items: center; gap: 4px;
}
.ct-field label .req { color: var(--accent); }
.ct-field input,
.ct-field select,
.ct-field textarea {
  width: 100%; padding: 11px 14px;
  border: 1.5px solid var(--border); border-radius: 9px;
  font-size: 14px; font-family: var(--sans);
  color: var(--text); background: var(--white);
  outline: none; transition: border-color 0.15s;
  appearance: none; -webkit-appearance: none;
}
.ct-field input:focus,
.ct-field select:focus,
.ct-field textarea:focus { border-color: var(--black); }
.ct-field textarea { resize: vertical; min-height: 140px; line-height: 1.6; }
.ct-field select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }

.ct-char-count { font-size: 11px; color: var(--text-light); text-align: right; margin-top: -4px; }
.ct-char-count.warn { color: var(--danger); }

.ct-error {
  background: var(--danger-bg); border: 1px solid #fecaca;
  color: var(--danger); border-radius: 9px;
  padding: 12px 16px; font-size: 13px; font-weight: 500;
}

.ct-btn {
  width: 100%; padding: 14px;
  background: var(--black); color: var(--white);
  border: none; border-radius: 10px;
  font-size: 15px; font-weight: 700; font-family: var(--sans);
  cursor: pointer; transition: opacity 0.15s; letter-spacing: -0.01em;
}
.ct-btn:hover:not(:disabled) { opacity: 0.85; }
.ct-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ct-success {
  text-align: center; padding: 48px 24px;
  border: 1.5px solid var(--border); border-radius: 16px;
  background: var(--off-white);
}
.ct-success-icon { font-size: 40px; margin-bottom: 16px; }
.ct-success-title {
  font-family: var(--serif); font-size: 28px;
  color: var(--black); margin-bottom: 10px; letter-spacing: -0.02em;
}
.ct-success-text { font-size: 15px; color: var(--text-mid); line-height: 1.6; margin-bottom: 24px; }
.ct-success-back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 14px; font-weight: 600; color: var(--text-mid);
  text-decoration: none; transition: color 0.15s;
}
.ct-success-back:hover { color: var(--black); }

.sp-footer {
  background: var(--black);
  padding: 28px 40px;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.sp-footer-copy { font-size: 12px; color: rgba(255,255,255,0.3); }
.sp-footer-back { font-size: 13px; color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.15s; }
.sp-footer-back:hover { color: white; }

@media (max-width: 600px) {
  .sp-nav { padding: 0 20px; }
  .ct-wrap { padding: 40px 20px 60px; }
  .ct-row { grid-template-columns: 1fr; }
  .sp-footer { padding: 20px; }
}
`;

const TOPICS = [
  { value: 'general',     label: 'General enquiry' },
  { value: 'ticket',      label: 'Ticket support' },
  { value: 'partnership', label: 'Event partnership' },
  { value: 'other',       label: 'Other' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not send message. Please check your connection and try again.');
    }
    setLoading(false);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <nav className="sp-nav">
        <Link href="/" className="sp-nav-logo">
          <img
            src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png"
            alt="Trackage Scheme"
          />
        </Link>
      </nav>

      <div className="ct-wrap">
        <h1 className="ct-title">Get in Touch</h1>
        <p className="ct-intro">
          Have a question about your order, an upcoming event, or want to partner with us? Fill in the form and we'll get back to you.
        </p>

        {success ? (
          <div className="ct-success">
            <div className="ct-success-icon">✉️</div>
            <div className="ct-success-title">Message sent!</div>
            <p className="ct-success-text">
              Thanks for reaching out. We'll get back to you at <strong>{form.email}</strong> as soon as possible.
            </p>
            <Link href="/" className="ct-success-back">← Back to events</Link>
          </div>
        ) : (
          <form className="ct-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="ct-error">{error}</div>}

            <div className="ct-row">
              <div className="ct-field">
                <label>Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={set('name')}
                  required
                  autoFocus
                />
              </div>
              <div className="ct-field">
                <label>Email <span className="req">*</span></label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            </div>

            <div className="ct-field">
              <label>Topic</label>
              <select value={form.topic} onChange={set('topic')}>
                {TOPICS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="ct-field">
              <label>Message <span className="req">*</span></label>
              <textarea
                placeholder={form.topic === 'ticket'
                  ? 'Please include your order reference number so we can assist you quickly…'
                  : 'How can we help?'}
                value={form.message}
                onChange={set('message')}
                required
              />
              <div className={`ct-char-count${form.message.length > 1800 ? ' warn' : ''}`}>
                {form.message.length} / 2000
              </div>
            </div>

            <button type="submit" className="ct-btn" disabled={loading}>
              {loading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>

      <footer className="sp-footer">
        <span className="sp-footer-copy">© {new Date().getFullYear()} Trackage Scheme. All rights reserved. Malta.</span>
        <Link href="/" className="sp-footer-back">← Back to home</Link>
      </footer>
    </>
  );
}
