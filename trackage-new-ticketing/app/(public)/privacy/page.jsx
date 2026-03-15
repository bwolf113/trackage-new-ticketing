/* app/(public)/privacy/page.jsx — Privacy Policy */
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

export default function PrivacyPage() {
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
        <h1 className="sp-page-title">Privacy Policy</h1>
        <p className="sp-last-updated">Last Updated: March 15, 2026 &nbsp;·&nbsp; Trackage Scheme</p>

        <h2 className="sp-section-title">1. Introduction</h2>
        <p className="sp-body">
          Trackage Scheme ("we," "us," or "our"), operating from Malta, provides an online event ticketing system. We are committed to protecting your privacy and processing your personal data in compliance with the EU General Data Protection Regulation (GDPR) and the Data Protection Act (Chapter 586 of the Laws of Malta).
        </p>

        <h2 className="sp-section-title">2. Data Controller</h2>
        <p className="sp-body">
          Trackage Scheme is the data controller for the personal data collected through{' '}
          <a href="https://tickets.trackagescheme.com" style={{ color: 'var(--accent)' }}>
            https://tickets.trackagescheme.com
          </a>.
        </p>
        <p className="sp-body">
          Contact Email:{' '}
          <a href="mailto:team@trackagescheme.com" style={{ color: 'var(--accent)' }}>
            team@trackagescheme.com
          </a>
        </p>

        <h2 className="sp-section-title">3. Data We Collect</h2>
        <ul className="sp-list">
          <li><strong>Identity Data:</strong> Name, surname.</li>
          <li><strong>Contact Data:</strong> Email address, phone number, billing address.</li>
          <li><strong>Transaction Data:</strong> Details about payments and tickets purchased. (Note: We do not store full credit card details; these are processed by our secure payment providers).</li>
          <li><strong>Technical Data:</strong> IP address, browser type, and usage data via cookies.</li>
        </ul>

        <h2 className="sp-section-title">4. How We Use Your Data (Legal Basis)</h2>
        <ul className="sp-list">
          <li><strong>Contractual Necessity:</strong> To process your order, issue your ticket, and provide entry to the event.</li>
          <li><strong>Legal Obligation:</strong> To maintain financial records for Maltese VAT and tax purposes.</li>
          <li><strong>Legitimate Interest:</strong> To prevent fraudulent transactions and improve our platform's security.</li>
          <li><strong>Consent:</strong> To send marketing communications (newsletters) where you have opted in.</li>
        </ul>

        <h2 className="sp-section-title">5. Sharing Your Data</h2>
        <p className="sp-body">We share your data with the following third parties only when necessary:</p>
        <ul className="sp-list">
          <li><strong>Event Organizers:</strong> We provide your name and ticket details to the specific organizer of the event you are attending for entry management.</li>
          <li><strong>Service Providers:</strong> Payment gateways (e.g., Stripe/PayPal), email delivery services, and cloud hosting providers.</li>
          <li><strong>Authorities:</strong> When required by Maltese law or court order.</li>
        </ul>

        <h2 className="sp-section-title">6. International Transfers</h2>
        <p className="sp-body">
          If we transfer data outside the European Economic Area (EEA), we ensure appropriate safeguards (such as Standard Contractual Clauses) are in place to protect your information.
        </p>

        <h2 className="sp-section-title">7. Data Retention</h2>
        <ul className="sp-list">
          <li><strong>Transaction Records:</strong> Kept for 10 years to comply with Maltese tax and auditing requirements.</li>
          <li><strong>Marketing Data:</strong> Kept until you withdraw consent or after 2 years of inactivity.</li>
        </ul>

        <h2 className="sp-section-title">8. Your Rights</h2>
        <p className="sp-body">
          Under the GDPR, you have the right to: request access, correction, erasure, objection, restriction, and portability of your personal data.
        </p>
        <p className="sp-body">
          To exercise these rights, please contact us at the email provided above. You also have the right to lodge a complaint with the Information and Data Protection Commissioner (IDPC) in Malta.
        </p>

        <h2 className="sp-section-title">9. Cookies</h2>
        <p className="sp-body">
          Our website uses cookies to manage the shopping cart and analyze traffic. You can manage your cookie preferences through your browser settings. See our{' '}
          <Link href="/cookies" style={{ color: 'var(--accent)' }}>Cookie Policy</Link> for more details.
        </p>

        <h2 className="sp-section-title">10. Amendments</h2>
        <p className="sp-body">
          We may update this policy from time to time. Changes will be posted on this page with an updated "Last Updated" date.
        </p>
      </div>

      <footer className="sp-footer">
        <span className="sp-footer-copy">© {new Date().getFullYear()} Trackage Scheme. All rights reserved. Malta.</span>
        <Link href="/" className="sp-footer-back">← Back to home</Link>
      </footer>
    </>
  );
}
