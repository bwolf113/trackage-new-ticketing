/* app/(public)/orders/success/page.jsx */
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
const MT = { timeZone: 'Europe/Malta' };
function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...MT,
  });
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --accent:#0a9e7f;--accent-dark:#087d65;--accent-pale:#e6f7f4;
  --black:#0a0a0a;--white:#fff;--off:#fafaf9;--text:#1a1a1a;
  --mid:#555;--light:#999;--border:#e8e8e6;
  --serif:'DM Serif Display',Georgia,serif;
  --sans:'DM Sans',system-ui,sans-serif;
}
html,body{font-family:var(--sans);background:var(--off);color:var(--text);-webkit-font-smoothing:antialiased;min-height:100vh}

.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:64px;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.nav-logo{font-family:var(--sans);font-size:17px;font-weight:700;color:var(--black);text-decoration:none;letter-spacing:-0.02em;text-transform:uppercase;display:flex;align-items:center;gap:10px}
.nav-logo-mark{width:28px;height:28px;background:var(--black);border-radius:6px;display:flex;align-items:center;justify-content:center}

.page{padding-top:64px;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:84px 20px 60px}

.success-card{background:var(--white);border-radius:24px;max-width:560px;width:100%;overflow:hidden;box-shadow:0 8px 60px rgba(0,0,0,0.08)}

.success-top{background:var(--black);padding:48px 40px;text-align:center;position:relative;overflow:hidden}
.success-top::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(10,158,127,0.25) 0%,transparent 60%)}
.success-checkmark{width:72px;height:72px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;position:relative;z-index:1;animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both}
@keyframes popIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
.success-checkmark svg{width:32px;height:32px}
.success-title{font-family:var(--serif);font-size:32px;color:white;letter-spacing:-0.02em;margin-bottom:8px;position:relative;z-index:1;animation:fadeUp 0.5s 0.15s ease both}
.success-sub{font-size:14px;color:rgba(255,255,255,0.6);position:relative;z-index:1;animation:fadeUp 0.5s 0.25s ease both;line-height:1.5}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

.success-body{padding:32px 40px}

.order-ref{background:var(--accent-pale);border:1px solid rgba(10,158,127,0.2);border-radius:10px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.order-ref-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent-dark)}
.order-ref-value{font-size:13px;font-weight:700;color:var(--black);font-family:monospace;letter-spacing:0.04em}

.detail-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);font-size:14px}
.detail-row:last-child{border-bottom:none}
.detail-label{color:var(--mid)}
.detail-value{font-weight:600;color:var(--text);text-align:right}

.total-row{display:flex;justify-content:space-between;align-items:center;padding:16px 0;font-family:var(--serif);font-size:22px;color:var(--black)}

.divider{height:1px;background:var(--border);margin:20px 0}

.what-next{margin-top:24px}
.what-next-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--light);margin-bottom:14px}
.next-item{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
.next-item:last-child{margin-bottom:0}
.next-item-icon{width:36px;height:36px;border-radius:8px;background:var(--off);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;border:1px solid var(--border)}
.next-item-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px}
.next-item-sub{font-size:12px;color:var(--mid);line-height:1.4}

.btn-browse{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;background:var(--black);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;font-family:var(--sans);cursor:pointer;text-decoration:none;margin-top:28px;transition:background 0.15s}
.btn-browse:hover{background:#222}

.skel{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

@media(max-width:600px){
  .nav{padding:0 20px}
  .success-body{padding:24px 24px}
  .success-top{padding:36px 24px}
}
`;

function OrdersPageInner() {
  const searchParams = useSearchParams();
  const sessionId    = searchParams.get('session_id');

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (sessionId) confirmOrder();
    else setError(true);
  }, [sessionId]);

  async function confirmOrder() {
    setLoading(true);
    try {
      // Confirm via our webhook handler - poll for order completion
      // The webhook (stripe) marks it completed; we just fetch it by session id
      let attempts = 0;
      let found = null;

      while (attempts < 8 && !found) {
        await new Promise(r => setTimeout(r, 1000));
        const { data } = await supabase
          .from('orders')
          .select(`
            id, status, total, subtotal, booking_fee, discount,
            customer_email, coupon_code, created_at,
            events ( name, start_time, venue ),
            order_items ( ticket_name, quantity, unit_price )
          `)
          .eq('stripe_session_id', sessionId)
          .single();

        if (data) { found = data; break; }
        attempts++;
      }

      if (found) setOrder(found);
      else setError(true);
    } catch (err) {
      console.error(err);
      setError(true);
    }
    setLoading(false);
  }

  return (
    <div>
      <style>{CSS}</style>

      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-mark">
            <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#0a9e7f" strokeWidth="2"/><circle cx="7" cy="7" r="2" fill="#0a9e7f"/></svg>
          </div>
          Trackage Scheme
        </Link>
      </nav>

      <div className="page">
        {loading ? (
          <div className="success-card" style={{ padding: 40 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 6 }}>Confirming your order…</div>
              <div style={{ fontSize: 13, color: 'var(--mid)' }}>This usually takes just a moment.</div>
            </div>
            <div className="skel" style={{ height: 16, marginBottom: 10 }} />
            <div className="skel" style={{ height: 16, width: '70%', marginBottom: 10 }} />
            <div className="skel" style={{ height: 16, width: '50%' }} />
          </div>
        ) : error ? (
          <div className="success-card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎫</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 8 }}>Payment received!</div>
            <div style={{ fontSize: 14, color: 'var(--mid)', marginBottom: 24, lineHeight: 1.6 }}>
              Your tickets are on their way. Check your email for confirmation.
              If you don't receive it within a few minutes, check your spam folder.
            </div>
            <Link href="/" className="btn-browse">Browse more events</Link>
          </div>
        ) : (
          <div className="success-card">
            <div className="success-top">
              <div className="success-checkmark">
                <svg viewBox="0 0 32 32" fill="none">
                  <path d="M6 16l7 7 13-13" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="success-title">You're going!</div>
              <div className="success-sub">
                Your tickets for <strong style={{color:'white'}}>{order.events?.name}</strong> are confirmed.
                {order.customer_email && ` A confirmation has been sent to ${order.customer_email}.`}
              </div>
            </div>

            <div className="success-body">

              <div className="order-ref">
                <div className="order-ref-label">Order reference</div>
                <div className="order-ref-value">#{order.id?.slice(0, 8).toUpperCase()}</div>
              </div>

              {/* Event details */}
              {order.events && (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Event</span>
                    <span className="detail-value">{order.events.name}</span>
                  </div>
                  {order.events.start_time && (
                    <div className="detail-row">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{fmtDate(order.events.start_time)}</span>
                    </div>
                  )}
                  {order.events.venue && (
                    <div className="detail-row">
                      <span className="detail-label">Venue</span>
                      <span className="detail-value">{order.events.venue}</span>
                    </div>
                  )}
                </>
              )}

              {/* Tickets */}
              {(order.order_items || []).map((item, i) => (
                <div key={i} className="detail-row">
                  <span className="detail-label">{item.ticket_name}</span>
                  <span className="detail-value">{item.quantity}× {fmt(item.unit_price)}</span>
                </div>
              ))}

              <div className="divider" />

              {/* Totals */}
              {order.booking_fee > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Booking fee</span>
                  <span className="detail-value">{fmt(order.booking_fee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span className="detail-value" style={{color:'var(--accent)'}}>−{fmt(order.discount)}</span>
                </div>
              )}

              <div className="total-row">
                <span>Total paid</span>
                <span style={{color:'var(--accent)'}}>{fmt(order.total)}</span>
              </div>

              <div className="divider" />

              {/* What's next */}
              <div className="what-next">
                <div className="what-next-title">What happens next</div>
                <div className="next-item">
                  <div className="next-item-icon">📧</div>
                  <div>
                    <div className="next-item-title">Check your email</div>
                    <div className="next-item-sub">Your ticket confirmation and PDF will be sent to {order.customer_email}.</div>
                  </div>
                </div>
                <div className="next-item">
                  <div className="next-item-icon">📱</div>
                  <div>
                    <div className="next-item-title">Show your ticket at the door</div>
                    <div className="next-item-sub">Present the QR code from your email to gain entry. Screenshots are fine.</div>
                  </div>
                </div>
                <div className="next-item">
                  <div className="next-item-icon">❓</div>
                  <div>
                    <div className="next-item-title">Need help?</div>
                    <div className="next-item-sub">Email us at <a href="mailto:info@trackagescheme.com" style={{color:'var(--accent)'}}>info@trackagescheme.com</a> with your order reference.</div>
                  </div>
                </div>
              </div>

              <Link href="/" className="btn-browse">Browse more events →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageInner />
    </Suspense>
  );
}
