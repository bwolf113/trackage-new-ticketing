/* app/(public)/cookies/page.jsx — Cookie Policy */
import Link from 'next/link';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --black: #0a0a0a; --white: #ffffff; --off-white: #fafaf9;
  --text: #1a1a1a; --text-mid: #555; --text-light: #999;
  --border: #e8e8e6; --accent: #0a9e7f;
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

.sp-content {
  max-width: 720px; margin: 0 auto;
  padding: 60px 40px 80px;
}

.sp-page-title {
  font-family: var(--serif);
  font-size: clamp(30px, 4vw, 42px);
  color: var(--black); letter-spacing: -0.02em;
  line-height: 1.1; margin-bottom: 8px;
}
.sp-last-updated {
  font-size: 13px; color: var(--text-light); margin-bottom: 48px;
}

.sp-section-title {
  font-size: 18px; font-weight: 700; color: var(--black);
  margin-top: 36px; margin-bottom: 12px;
}
.sp-body {
  font-size: 15px; line-height: 1.7; color: #333;
  margin-bottom: 12px;
}
.sp-list {
  font-size: 15px; line-height: 1.7; color: #333;
  padding-left: 20px; margin-bottom: 12px;
}
.sp-list li { margin-bottom: 6px; }

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
  .sp-content { padding: 40px 20px 60px; }
  .sp-footer { padding: 20px; }
}
`;

export default function CookiesPage() {
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

      <div className="sp-content">
        <h1 className="sp-page-title">Cookie Policy</h1>
        <p className="sp-last-updated">Last Updated: March 15, 2026 &nbsp;·&nbsp; Trackage Scheme</p>

        <h2 className="sp-section-title">1. What are Cookies?</h2>
        <p className="sp-body">
          Cookies are small text files stored on your device when you visit a website. They help the website recognize your device and remember information about your visit.
        </p>

        <h2 className="sp-section-title">2. How We Use Cookies</h2>
        <ul className="sp-list">
          <li><strong>Strictly Necessary Cookies:</strong> Essential for the website to function — shopping cart, secure checkout, account login.</li>
          <li><strong>Performance &amp; Analytics Cookies:</strong> Help us understand how visitors interact with our website (e.g., Google Analytics). Data is aggregated and anonymous.</li>
          <li><strong>Functional Cookies:</strong> Remember choices you make (such as your username or language preference).</li>
        </ul>

        <h2 className="sp-section-title">3. Third-Party Cookies</h2>
        <ul className="sp-list">
          <li><strong>Payment Processors:</strong> Stripe may set cookies to process payments securely and prevent fraud.</li>
          <li><strong>Analytics:</strong> Google Analytics helps us track site usage. You can opt out via the{' '}
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              Google Analytics browser add-on
            </a>.
          </li>
        </ul>

        <h2 className="sp-section-title">4. How Long Do Cookies Last?</h2>
        <ul className="sp-list">
          <li><strong>Session Cookies:</strong> Temporary, expire when you close your browser. Used for the shopping cart.</li>
          <li><strong>Persistent Cookies:</strong> Remain on your device for a set period. Help us recognize you on return visits.</li>
        </ul>

        <h2 className="sp-section-title">5. Managing Your Cookies</h2>
        <ul className="sp-list">
          <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies.</li>
          <li><strong>Cookie Banner:</strong> When you first visit our site, you can choose to "Accept All" or "Manage Preferences".</li>
        </ul>

        <h2 className="sp-section-title">6. Changes to This Policy</h2>
        <p className="sp-body">
          We may update this Cookie Policy to reflect changes in technology or data protection laws.
        </p>

        <h2 className="sp-section-title">7. Contact Us</h2>
        <p className="sp-body">
          Email:{' '}
          <a href="mailto:team@trackagescheme.com" style={{ color: 'var(--accent)' }}>
            team@trackagescheme.com
          </a>
        </p>
      </div>

      <footer className="sp-footer">
        <span className="sp-footer-copy">© {new Date().getFullYear()} Trackage Scheme. All rights reserved. Malta.</span>
        <Link href="/" className="sp-footer-back">← Back to home</Link>
      </footer>
    </>
  );
}
