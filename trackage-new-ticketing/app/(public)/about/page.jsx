/* app/(public)/about/page.jsx — About page */
import Link from 'next/link';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --black: #0a0a0a; --white: #ffffff; --off-white: #fafaf9;
  --text: #1a1a1a; --text-mid: #555; --text-light: #999;
  --border: #e8e8e6; --accent: #0a9e7f; --accent-dark: #087d65;
  --accent-pale: #e6f7f4;
  --serif: 'DM Serif Display', Georgia, serif;
  --sans: 'DM Sans', system-ui, sans-serif;
}
body { font-family: var(--sans); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; }

/* NAV */
.ab-nav {
  position: absolute; top: 0; left: 0; right: 0; z-index: 10;
  display: flex; align-items: center;
  padding: 0 40px; height: 64px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.ab-nav-logo { display: flex; align-items: center; text-decoration: none; }
.ab-nav-logo img { height: 22px; }

/* HERO */
.ab-hero {
  position: relative;
  background: var(--black);
  padding: 140px 40px 96px;
  overflow: hidden;
}
.ab-hero::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    radial-gradient(circle at 15% 60%, rgba(10,158,127,0.18) 0%, transparent 50%),
    radial-gradient(circle at 85% 20%, rgba(10,158,127,0.09) 0%, transparent 45%);
}
.ab-hero-inner {
  position: relative; z-index: 1;
  max-width: 800px; margin: 0 auto;
}
.ab-hero-tag {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent); color: white;
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 5px 12px; border-radius: 4px; margin-bottom: 24px;
}
.ab-hero-title {
  font-family: var(--serif);
  font-size: clamp(44px, 7vw, 80px);
  color: white; line-height: 1.02;
  letter-spacing: -0.025em; margin-bottom: 24px;
}
.ab-hero-title em {
  font-style: italic; color: var(--accent);
}
.ab-hero-tagline {
  font-size: clamp(16px, 2.5vw, 20px);
  color: rgba(255,255,255,0.6); line-height: 1.6; max-width: 560px;
}

/* CONTENT */
.ab-content {
  max-width: 720px; margin: 0 auto;
  padding: 72px 40px 0;
}

.ab-lead {
  font-size: 18px; line-height: 1.75; color: var(--text-mid);
  margin-bottom: 40px;
}

.ab-section-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 10px; margin-top: 48px;
}
.ab-section-title {
  font-family: var(--serif);
  font-size: clamp(26px, 3.5vw, 36px);
  color: var(--black); letter-spacing: -0.02em; line-height: 1.15;
  margin-bottom: 20px;
}
.ab-body {
  font-size: 16px; line-height: 1.75; color: #333; margin-bottom: 16px;
}

/* BENEFIT LIST */
.ab-benefits { list-style: none; padding: 0; margin: 24px 0 0; display: flex; flex-direction: column; gap: 20px; }
.ab-benefit {
  padding: 20px 24px;
  border-left: 3px solid var(--accent);
  background: var(--off-white);
  border-radius: 0 10px 10px 0;
}
.ab-benefit-title { font-weight: 700; font-size: 15px; color: var(--black); margin-bottom: 4px; }
.ab-benefit-body  { font-size: 14px; line-height: 1.65; color: var(--text-mid); }

/* QUOTE */
.ab-quote {
  margin: 52px 0;
  border-left: 3px solid var(--accent);
  padding: 20px 28px;
  background: var(--off-white);
  border-radius: 0 12px 12px 0;
}
.ab-quote-text {
  font-family: var(--serif);
  font-size: clamp(18px, 2.5vw, 22px);
  color: var(--black); line-height: 1.5;
  font-style: italic; margin-bottom: 10px;
}
.ab-quote-attr {
  font-size: 13px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.08em;
}

/* CTA SECTION */
.ab-cta {
  background: var(--black);
  margin: 72px -40px 0;
  padding: 64px 40px;
  text-align: center;
}
.ab-cta-title {
  font-family: var(--serif);
  font-size: clamp(30px, 4vw, 44px);
  color: white; letter-spacing: -0.02em; margin-bottom: 12px;
}
.ab-cta-sub {
  font-size: 16px; color: rgba(255,255,255,0.55); margin-bottom: 32px; line-height: 1.6;
}
.ab-cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: white; color: var(--black);
  padding: 16px 32px; border-radius: 10px;
  font-size: 15px; font-weight: 700; font-family: var(--sans);
  text-decoration: none;
  transition: background 0.15s, transform 0.1s;
  letter-spacing: -0.01em;
}
.ab-cta-btn:hover { background: #f0f0f0; transform: translateY(-2px); }

/* FOOTER */
.ab-footer {
  background: var(--black);
  padding: 24px 40px;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
  border-top: 1px solid rgba(255,255,255,0.07);
}
.ab-footer-copy { font-size: 12px; color: rgba(255,255,255,0.3); }
.ab-footer-back { font-size: 13px; color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.15s; }
.ab-footer-back:hover { color: white; }

@media (max-width: 600px) {
  .ab-nav  { padding: 0 20px; }
  .ab-hero { padding: 120px 20px 72px; }
  .ab-content { padding: 48px 20px 0; }
  .ab-cta { margin: 48px -20px 0; padding: 48px 20px; }
  .ab-footer { padding: 20px; }
}
`;

export default function AboutPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <nav className="ab-nav">
        <Link href="/" className="ab-nav-logo">
          <img
            src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png"
            alt="Trackage Scheme"
          />
        </Link>
      </nav>

      {/* HERO */}
      <section className="ab-hero">
        <div className="ab-hero-inner">
          <div className="ab-hero-tag">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', display: 'inline-block' }} />
            Malta's Music Platform
          </div>
          <h1 className="ab-hero-title">
            About <em>Trackage</em><br />Scheme
          </h1>
          <p className="ab-hero-tagline">
            Empowering Malta's alternative music scene since 2016 — from grassroots gigs to sold-out nights.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <div className="ab-content">

        <p className="ab-lead">
          The Maltese alternative music scene is a powerhouse of talent. From the raw energy of indie icons like Brikkuni and Brodu to the world-class precision of Beheaded and the deep electronic pulses of Owen Jay, our "small rock" in the Mediterranean punches far above its weight.
        </p>
        <p className="ab-lead" style={{ marginTop: -16 }}>
          At Trackage Scheme (TS), we believe this talent deserves a professional stage and a packed house.
        </p>

        <div className="ab-section-eyebrow">Our Purpose</div>
        <h2 className="ab-section-title">Empowering the Scene</h2>
        <p className="ab-body">
          Trackage Scheme is more than just a hub; we are a dedicated growth platform for Malta's music industry. Our mission is to bridge the gap between incredible talent and the audiences they deserve. We provide local artists and event organizers with the professional infrastructure needed to promote their vision and maximize ticket sales.
        </p>

        <div className="ab-section-eyebrow" style={{ marginTop: 48 }}>What We Offer</div>
        <h2 className="ab-section-title">Why Partner with Trackage Scheme?</h2>
        <p className="ab-body">
          We've built a one-stop ecosystem designed to take the administrative weight off your shoulders so you can focus on the music.
        </p>

        <ul className="ab-benefits">
          <li className="ab-benefit">
            <div className="ab-benefit-title">Premium Ticketing Solutions</div>
            <div className="ab-benefit-body">
              Our dedicated platform, tickets.trackagescheme.com, offers a seamless, secure, and user-friendly checkout experience. We turn "interested" fans into "confirmed" attendees.
            </div>
          </li>
          <li className="ab-benefit">
            <div className="ab-benefit-title">Strategic Promotion</div>
            <div className="ab-benefit-body">
              We don't just list events; we amplify them. By leveraging our comprehensive database and active community, we ensure your event reaches the right ears — locally and internationally.
            </div>
          </li>
          <li className="ab-benefit">
            <div className="ab-benefit-title">Digital Visibility</div>
            <div className="ab-benefit-body">
              From spotlighting artists on our high-traffic social media channels to featuring events in our music hub, we increase the "stir" around your project.
            </div>
          </li>
          <li className="ab-benefit">
            <div className="ab-benefit-title">Artist Support &amp; Education</div>
            <div className="ab-benefit-body">
              Through our music school and database resources, we encourage the next generation of talent to hone their craft and professionalize their approach.
            </div>
          </li>
        </ul>

        <div className="ab-section-eyebrow" style={{ marginTop: 48 }}>Looking Ahead</div>
        <h2 className="ab-section-title">Our Vision</h2>
        <p className="ab-body">
          To be Malta's leading gateway for alternative music. We are committed to identifying, supporting, and promoting local talent, providing them with the tools to sell more tickets, reach wider audiences, and pursue their musical aspirations on a global scale.
        </p>

        <blockquote className="ab-quote">
          <p className="ab-quote-text">
            "Big up for Trackage Scheme who are constantly promoting local acts and improving the Maltese alternative scene."
          </p>
          <p className="ab-quote-attr">— Clint Spiteri, KNTRL</p>
        </blockquote>

        {/* CTA */}
        <div className="ab-cta">
          <h2 className="ab-cta-title">Ready to sell tickets?</h2>
          <p className="ab-cta-sub">
            Join the organisers already using Trackage Scheme to sell out their events.
          </p>
          <Link href="/organiser/signup" className="ab-cta-btn">
            Start Selling Tickets with Us →
          </Link>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="ab-footer">
        <span className="ab-footer-copy">© {new Date().getFullYear()} Trackage Scheme. All rights reserved. Malta.</span>
        <Link href="/" className="ab-footer-back">← Back to home</Link>
      </footer>
    </>
  );
}
