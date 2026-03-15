/* app/(public)/terms/page.jsx — Terms & Conditions */
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

export default function TermsPage() {
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
        <h1 className="sp-page-title">Terms &amp; Conditions</h1>
        <p className="sp-last-updated">Last Updated: March 15, 2026 &nbsp;·&nbsp; Trackage Scheme</p>

        <h2 className="sp-section-title">1. General</h2>
        <p className="sp-body">
          By purchasing a ticket through{' '}
          <a href="https://tickets.trackagescheme.com" style={{ color: 'var(--accent)' }}>
            https://tickets.trackagescheme.com
          </a>
          , you agree to these Terms and Conditions. Trackage Scheme acts as a ticketing agent on behalf of Event Organizers.
        </p>

        <h2 className="sp-section-title">2. Ticket Purchase &amp; Validity</h2>
        <ul className="sp-list">
          <li>All tickets are issued digitally. It is your responsibility to provide a valid email address.</li>
          <li>A ticket is valid only for the specific event, date, and time shown.</li>
          <li>Unauthorized duplication or resale of tickets is strictly prohibited and may result in the ticket being voided without a refund.</li>
        </ul>

        <h2 className="sp-section-title">3. Pricing and Fees</h2>
        <ul className="sp-list">
          <li>All prices are inclusive of VAT where applicable.</li>
          <li>A non-refundable Booking Fee may be applied to each transaction to cover the costs of our secure platform and payment processing.</li>
        </ul>

        <h2 className="sp-section-title">4. Refunds and Cancellations</h2>
        <p className="sp-body">
          <strong>General Policy:</strong> All ticket sales are final. No refunds or exchanges will be issued unless an event is cancelled or significantly rescheduled.
        </p>
        <p className="sp-body">
          <strong>Cancelled Events:</strong> If an event is cancelled by the Organizer, you will be entitled to a refund of the face value of the ticket. Booking fees are generally non-refundable.
        </p>
        <p className="sp-body">
          <strong>Rescheduled Events:</strong> If an event is postponed, your ticket will typically remain valid for the new date. If you cannot attend the new date, you must contact us within the timeframe specified by the Organizer to request a refund.
        </p>

        <h2 className="sp-section-title">5. Entry to Events</h2>
        <ul className="sp-list">
          <li>The Event Organizer reserves the right to refuse admission for reasons of public safety, hygiene, or unacceptable behavior.</li>
          <li>You may be required to present a valid photo ID (e.g., Passport, ID Card, or Driver's License) alongside your ticket to verify your identity or age.</li>
        </ul>

        <h2 className="sp-section-title">6. Limitation of Liability</h2>
        <ul className="sp-list">
          <li>Trackage Scheme is not responsible for any personal property lost or stolen at an event, nor for any injuries sustained during an event.</li>
          <li>Our liability is limited to the total amount paid for the ticket (excluding booking fees).</li>
        </ul>

        <h2 className="sp-section-title">7. Force Majeure</h2>
        <p className="sp-body">
          Trackage Scheme and the Event Organizer shall not be liable for any failure to perform obligations where such failure is caused by events beyond reasonable control (e.g., natural disasters, strikes, or government mandates).
        </p>

        <h2 className="sp-section-title">8. Governing Law</h2>
        <p className="sp-body">
          These Terms &amp; Conditions are governed by and construed in accordance with the Laws of Malta. Any disputes shall be subject to the exclusive jurisdiction of the Maltese Courts.
        </p>

        <h2 className="sp-section-title">9. Contact Us</h2>
        <p className="sp-body">For any queries regarding your purchase, please contact:</p>
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
