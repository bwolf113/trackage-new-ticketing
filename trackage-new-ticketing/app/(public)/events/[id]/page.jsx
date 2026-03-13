/* app/(public)/events/[id]/page.jsx */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase';

/* ── helpers ──────────────────────────────────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtFull(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' });
}
function fmtMonth(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { month: 'short' }).toUpperCase();
}
function fmtDay(dt) {
  if (!dt) return '';
  return new Date(dt).getDate();
}
function ticketAvailable(ticket) {
  const inv = ticket.inventory ?? ticket.quantity_available;
  if (inv == null) return true;
  return (ticket.sold ?? ticket.quantity_sold ?? 0) < inv;
}
function ticketRemaining(ticket) {
  const inv = ticket.inventory ?? ticket.quantity_available;
  if (inv == null) return null;
  return inv - (ticket.sold ?? ticket.quantity_sold ?? 0);
}

/* ── CSS ──────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --accent:#0a9e7f; --accent-dark:#087d65; --accent-pale:#e6f7f4;
  --black:#0a0a0a; --white:#fff; --off:#fafaf9; --text:#1a1a1a;
  --mid:#555; --light:#999; --border:#e8e8e6;
  --serif:'DM Serif Display',Georgia,serif;
  --sans:'DM Sans',system-ui,sans-serif;
  --danger:#ef4444; --danger-bg:#fef2f2;
  --warn:#f59e0b; --warn-bg:#fffbeb;
}
html{scroll-behavior:smooth}
body{font-family:var(--sans);background:var(--white);color:var(--text);-webkit-font-smoothing:antialiased}

/* ── NAV ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:64px;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);box-shadow:0 1px 20px rgba(0,0,0,0.06)}
.nav-logo{font-family:var(--sans);font-size:17px;font-weight:700;color:var(--black);text-decoration:none;letter-spacing:-0.02em;text-transform:uppercase;display:flex;align-items:center;gap:10px}
.nav-logo-mark{width:28px;height:28px;background:var(--black);border-radius:6px;display:flex;align-items:center;justify-content:center}
.nav-logo-mark svg{width:14px;height:14px}
.nav-back{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:var(--mid);text-decoration:none;transition:color 0.15s}
.nav-back:hover{color:var(--text)}
.nav-right{display:flex;align-items:center;gap:12px}
.nav-login-btn{display:flex;align-items:center;gap:7px;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;background:var(--black);color:var(--white);border:none;cursor:pointer;font-family:var(--sans);text-decoration:none;transition:background 0.15s}
.nav-login-btn:hover{background:#222}

/* ── HERO ── */
.event-hero{margin-top:64px;position:relative;height:420px;overflow:hidden;background:var(--black)}
.event-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.event-hero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.7) 100%)}
.event-hero-placeholder{position:absolute;inset:0;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 50%,rgba(10,158,127,0.15) 100%)}
.event-hero-placeholder::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle at 25% 60%,rgba(10,158,127,0.12) 0%,transparent 50%),radial-gradient(circle at 75% 30%,rgba(10,158,127,0.06) 0%,transparent 40%)}
.event-hero-content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:40px}
.event-hero-tag{display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:white;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:4px;margin-bottom:16px;width:fit-content}
.event-hero-title{font-family:var(--serif);font-size:clamp(32px,5vw,56px);color:white;line-height:1.05;letter-spacing:-0.02em;margin-bottom:12px}
.event-hero-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.event-hero-meta-item{display:flex;align-items:center;gap:6px;font-size:14px;color:rgba(255,255,255,0.75)}
.event-hero-dot{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,0.3)}

/* ── LAYOUT ── */
.page-body{max-width:1100px;margin:0 auto;padding:48px 40px 80px;display:grid;grid-template-columns:1fr 380px;gap:48px;align-items:start}
.page-left{}
.page-right{position:sticky;top:84px}

/* ── SECTION ── */
.section{margin-bottom:40px}
.section-title{font-family:var(--serif);font-size:22px;color:var(--black);letter-spacing:-0.02em;margin-bottom:16px}
.divider{height:1px;background:var(--border);margin:32px 0}

/* ── EVENT INFO ── */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.info-card{background:var(--off);border:1px solid var(--border);border-radius:12px;padding:16px 18px;display:flex;align-items:flex-start;gap:12px}
.info-icon{font-size:20px;flex-shrink:0;margin-top:2px}
.info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--light);margin-bottom:3px}
.info-value{font-size:14px;font-weight:600;color:var(--text);line-height:1.4}
.info-sub{font-size:12px;color:var(--mid);margin-top:2px}

/* ── DESCRIPTION ── */
.event-desc{font-size:15px;color:var(--mid);line-height:1.75}

/* ── ORGANISER ── */
.organiser-card{display:flex;align-items:center;gap:14px;padding:16px 20px;background:var(--off);border:1px solid var(--border);border-radius:12px}
.organiser-avatar{width:44px;height:44px;border-radius:10px;background:var(--black);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:white;flex-shrink:0;font-family:var(--serif)}
.organiser-name{font-size:15px;font-weight:600;color:var(--text)}
.organiser-label{font-size:11px;color:var(--light);font-weight:500}

/* ── TICKET PANEL ── */
.ticket-panel{background:var(--white);border:1.5px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.07)}
.ticket-panel-header{padding:20px 24px;border-bottom:1px solid var(--border);background:var(--off)}
.ticket-panel-title{font-family:var(--serif);font-size:20px;color:var(--black);letter-spacing:-0.02em}
.ticket-panel-sub{font-size:12px;color:var(--mid);margin-top:3px}

/* ── TICKET ROWS ── */
.ticket-list{padding:8px 0}
.ticket-row{padding:14px 24px;border-bottom:1px solid var(--border);transition:background 0.1s;position:relative}
.ticket-row:last-child{border-bottom:none}
.ticket-row.selected{background:rgba(10,158,127,0.03)}
.ticket-row.soldout{opacity:0.5}
.ticket-row-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
.ticket-name{font-size:15px;font-weight:600;color:var(--text)}
.ticket-desc{font-size:12px;color:var(--mid);margin-top:2px;line-height:1.4}
.ticket-price-wrap{text-align:right;flex-shrink:0}
.ticket-price{font-size:18px;font-weight:700;color:var(--black);font-family:var(--serif)}
.ticket-price.free{color:var(--accent)}
.ticket-fee{font-size:10px;color:var(--light);margin-top:1px}
.ticket-qty-row{display:flex;align-items:center;justify-content:space-between}
.ticket-remaining{font-size:11px;font-weight:600;color:var(--warn)}
.ticket-qty-control{display:flex;align-items:center;gap:10px}
.qty-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-size:18px;font-weight:300;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;line-height:1;font-family:var(--sans)}
.qty-btn:hover:not(:disabled){border-color:var(--accent);color:var(--accent);background:var(--accent-pale)}
.qty-btn:disabled{opacity:0.3;cursor:not-allowed}
.qty-btn.has-qty{border-color:var(--accent);color:var(--accent)}
.qty-num{font-size:16px;font-weight:700;min-width:28px;text-align:center;color:var(--text)}
.qty-num.nonzero{color:var(--accent)}
.soldout-tag{font-size:11px;font-weight:700;color:var(--danger);background:var(--danger-bg);padding:3px 10px;border-radius:20px}

/* ── ORDER SUMMARY ── */
.order-summary{padding:20px 24px;border-top:1.5px solid var(--border);background:var(--off)}
.order-summary-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--light);margin-bottom:14px}
.order-line{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--mid);margin-bottom:8px}
.order-line-name{flex:1}
.order-line-price{font-weight:600;color:var(--text);flex-shrink:0}
.order-subtotal{display:flex;justify-content:space-between;font-size:13px;color:var(--mid);padding-top:10px;border-top:1px solid var(--border);margin-top:4px;margin-bottom:6px}
.order-fee{display:flex;justify-content:space-between;font-size:13px;color:var(--mid);margin-bottom:4px}
.order-discount{display:flex;justify-content:space-between;font-size:13px;color:var(--accent);font-weight:600;margin-bottom:4px}
.order-total{display:flex;justify-content:space-between;align-items:baseline;font-size:18px;font-weight:700;color:var(--black);padding-top:12px;border-top:1.5px solid var(--border);margin-top:8px;font-family:var(--serif)}

/* ── COUPON ── */
.coupon-section{padding:14px 24px;border-top:1px solid var(--border)}
.coupon-row{display:flex;gap:8px}
.coupon-input{flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--sans);color:var(--text);background:var(--white);outline:none;transition:border-color 0.15s}
.coupon-input:focus{border-color:var(--accent)}
.coupon-input.error{border-color:var(--danger)}
.coupon-btn{padding:10px 16px;border-radius:8px;font-size:13px;font-weight:600;font-family:var(--sans);cursor:pointer;border:1.5px solid var(--border);background:var(--white);color:var(--text);transition:all 0.15s;white-space:nowrap}
.coupon-btn:hover{border-color:var(--accent);color:var(--accent)}
.coupon-btn:disabled{opacity:0.5;cursor:not-allowed}
.coupon-feedback{font-size:12px;margin-top:6px;display:flex;align-items:center;gap:5px}
.coupon-feedback.success{color:var(--accent)}
.coupon-feedback.error{color:var(--danger)}
.coupon-applied{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--accent-pale);border:1px solid rgba(10,158,127,0.25);border-radius:8px;margin-top:8px}
.coupon-applied-label{font-size:12px;font-weight:600;color:var(--accent-dark)}
.coupon-remove{background:none;border:none;font-size:11px;color:var(--mid);cursor:pointer;font-family:var(--sans);text-decoration:underline}

/* ── CUSTOMER DETAILS ── */
.customer-section{padding:16px 24px 0;border-top:1px solid var(--border)}
.customer-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--light);margin-bottom:12px}
.customer-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.customer-field{display:flex;flex-direction:column;gap:4px}
.customer-field label{font-size:11px;font-weight:600;color:var(--mid)}
.customer-field input{padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--sans);color:var(--text);background:var(--white);outline:none;transition:border-color 0.15s}
.customer-field input:focus{border-color:var(--accent)}
.customer-field input.err{border-color:var(--danger)}
.customer-full{grid-column:1/-1}
.consent-box{padding:14px 24px 4px;display:flex;flex-direction:column;gap:10px}
.consent-row{display:flex;align-items:flex-start;gap:10px;cursor:pointer}
.consent-row input[type=checkbox]{width:16px;height:16px;min-width:16px;margin-top:2px;accent-color:var(--accent);cursor:pointer}
.consent-row input[type=checkbox].err{outline:2px solid var(--danger);border-radius:3px}
.consent-text{font-size:12px;color:var(--mid);line-height:1.5;user-select:none}
.consent-text strong{color:var(--text)}
.consent-text.err-text{color:var(--danger)}

/* ── CHECKOUT BTN ── */
.checkout-section{padding:16px 24px 20px}
.btn-checkout{width:100%;padding:16px;background:var(--accent);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;font-family:var(--sans);cursor:pointer;transition:background 0.15s,transform 0.1s,box-shadow 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(10,158,127,0.3)}
.btn-checkout:hover:not(:disabled){background:var(--accent-dark);transform:translateY(-1px);box-shadow:0 8px 24px rgba(10,158,127,0.4)}
.btn-checkout:disabled{background:#ccc;cursor:not-allowed;box-shadow:none;transform:none}
.btn-checkout.loading{position:relative;overflow:hidden}
.btn-checkout.loading::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%);animation:shimmer-btn 1.2s infinite}
@keyframes shimmer-btn{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.secure-note{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:var(--light);margin-top:10px}

/* ── EMPTY / ERROR ── */
.page-center{min-height:80vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;text-align:center;padding:40px}
.page-center-icon{font-size:48px}
.page-center-title{font-family:var(--serif);font-size:28px;color:var(--text)}
.page-center-sub{font-size:14px;color:var(--mid)}

/* ── SKELETON ── */
.skel{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── SOLD OUT BANNER ── */
.soldout-banner{background:var(--danger-bg);border:1.5px solid #fecaca;border-radius:12px;padding:16px 20px;display:flex;gap:12px;align-items:flex-start;margin:16px 24px 0}
.soldout-banner-icon{font-size:20px;flex-shrink:0}
.soldout-banner-title{font-size:14px;font-weight:700;color:var(--danger);margin-bottom:3px}
.soldout-banner-sub{font-size:12px;color:#b91c1c}

/* ── TOAST ── */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--black);color:white;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:500;z-index:300;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,0.25);animation:toastIn 0.25s ease}
.toast.error{background:var(--danger)}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}

/* ── MOBILE ── */
@media(max-width:900px){
  .nav{padding:0 20px}
  .page-body{grid-template-columns:1fr;padding:24px 20px 60px;gap:0}
  .page-right{position:static;margin-top:32px}
  .event-hero{height:300px}
  .event-hero-content{padding:24px 20px}
  .info-grid{grid-template-columns:1fr}
}
`;

/* ── COMPONENT ────────────────────────────────────────────────────── */
export default function EventPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [event,       setEvent]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [quantities,  setQuantities]  = useState({}); // ticketId → qty
  const [couponCode,  setCouponCode]  = useState('');
  const [coupon,      setCoupon]      = useState(null); // validated coupon object
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [user,        setUser]        = useState(null);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [toast,       setToast]       = useState(null);

  // Customer details
  const [customer, setCustomer] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [customerErrors, setCustomerErrors] = useState({});

  // Consent
  const [consentData,      setConsentData]      = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [consentError,     setConsentError]     = useState(false);

  useEffect(() => {
    loadEvent();
    checkUser();
  }, [id]);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch {}
  }

  async function loadEvent() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, name, description, venue_name, start_time, end_time,
          thumbnail_url, poster_url, status, booking_fee_pct,
          organisers ( id, name ),
          tickets ( id, name, price, inventory, sold )
        `)
        .eq('id', id)
        .single();

      console.log('EVENT PAGE data:', data, 'error:', error);

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      // Sort tickets by price
      if (data.tickets) {
        data.tickets = data.tickets.sort((a, b) => (a.price || 0) - (b.price || 0));
      }

      setEvent(data);

      // Default first available ticket to 1
      const q = {};
      let defaulted = false;
      (data.tickets || []).forEach(t => {
        const inv  = t.inventory ?? t.quantity_available;
        const sold = t.sold ?? t.quantity_sold ?? 0;
        const available = inv == null || sold < inv;
        if (!defaulted && available) { q[t.id] = 1; defaulted = true; }
        else q[t.id] = 0;
      });
      setQuantities(q);
    } catch (err) {
      console.error('loadEvent error:', err);
      setNotFound(true);
    }
    setLoading(false);
  }

  function setQty(ticketId, delta) {
    const ticket = event.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const max = ticket.max_per_order || 10;
    const rem = ticketRemaining(ticket);
    const maxAllowed = rem !== null ? Math.min(max, rem) : max;
    setQuantities(prev => {
      const cur = prev[ticketId] || 0;
      const next = Math.max(0, Math.min(maxAllowed, cur + delta));
      return { ...prev, [ticketId]: next };
    });
  }

  // ── Totals ─────────────────────────────────────────────────────
  const selectedLines = (event?.tickets || [])
    .filter(t => (quantities[t.id] || 0) > 0)
    .map(t => ({
      ticket: t,
      qty: quantities[t.id],
      subtotal: (t.price || 0) * quantities[t.id],
    }));

  const subtotal = selectedLines.reduce((s, l) => s + l.subtotal, 0);

  // Booking fee: use event's settings or default 8%
  const feeRate  = event?.booking_fee_pct != null ? event.booking_fee_pct / 100 : 0.08;
  const feeFix   = event?.booking_fee_fixed || 0;
  const bookingFee = subtotal > 0 ? +(subtotal * feeRate + feeFix).toFixed(2) : 0;

  // Coupon discount
  let discount = 0;
  if (coupon && subtotal > 0) {
    if (coupon.discount_type === 'percent') {
      discount = +(subtotal * (coupon.discount_value / 100)).toFixed(2);
    } else {
      discount = Math.min(coupon.discount_value, subtotal);
    }
  }

  const total = Math.max(0, subtotal + bookingFee - discount);
  const totalTickets = selectedLines.reduce((s, l) => s + l.qty, 0);
  const allSoldOut = (event?.tickets || []).length > 0 &&
    (event?.tickets || []).every(t => !ticketAvailable(t));

  // ── Coupon validation ───────────────────────────────────────────
  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('status', 'active')
        .single();

      if (error || !data) {
        setCouponError('Invalid or expired coupon code.');
        setCouponLoading(false);
        return;
      }

      // Check expiry_date
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        setCouponError('This coupon has expired.');
        setCouponLoading(false);
        return;
      }

      // Check usage limit
      if (data.usage_limit && (data.usage_count || 0) >= data.usage_limit) {
        setCouponError('This coupon has reached its usage limit.');
        setCouponLoading(false);
        return;
      }

      setCoupon(data);
      showToast('Coupon applied! 🎉');
    } catch (err) {
      setCouponError('Could not validate coupon. Try again.');
    }
    setCouponLoading(false);
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponCode('');
    setCouponError('');
  }

  // ── Checkout ────────────────────────────────────────────────────
  async function handleCheckout() {
    if (totalTickets === 0) return;

    // Validate customer details
    const errors = {};
    if (!customer.first_name.trim()) errors.first_name = true;
    if (!customer.last_name.trim())  errors.last_name  = true;
    if (!customer.email.trim() || !/\S+@\S+\.\S+/.test(customer.email)) errors.email = true;
    if (!customer.phone.trim())      errors.phone      = true;
    if (Object.keys(errors).length) {
      setCustomerErrors(errors);
      showToast('Please fill in all your details.', 'error');
      return;
    }
    setCustomerErrors({});

    if (!consentData) {
      setConsentError(true);
      showToast('You must agree to the data storage terms to continue.', 'error');
      return;
    }
    setConsentError(false);

    setCheckoutLoading(true);
    try {
      const lineItems = selectedLines.map(l => ({
        ticket_id:   l.ticket.id,
        ticket_name: l.ticket.name,
        quantity:    l.qty,
        unit_price:  l.ticket.price || 0,
      }));

      const payload = {
        event_id:       event.id,
        event_name:     event.name,
        line_items:     lineItems,
        subtotal,
        booking_fee:    bookingFee,
        discount,
        total,
        coupon_code:    coupon?.code || null,
        coupon_id:      coupon?.id   || null,
        customer_email: customer.email,
        customer_name:  `${customer.first_name} ${customer.last_name}`,
        customer_first_name: customer.first_name,
        customer_last_name:  customer.last_name,
        customer_phone: customer.phone,
        marketing_consent: consentMarketing,
        success_url:    `${window.location.origin}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:     window.location.href,
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err) {
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    }
    setCheckoutLoading(false);
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Render states ───────────────────────────────────────────────
  if (loading) return (
    <div>
      <style>{CSS}</style>
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-mark">
            <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#0a9e7f" strokeWidth="2"/><circle cx="7" cy="7" r="2" fill="#0a9e7f"/></svg>
          </div>
          Trackage Scheme
        </Link>
        <Link href="/" className="nav-back">← Back to events</Link>
      </nav>
      <div style={{ marginTop: 64, height: 420 }}>
        <div className="skel" style={{ height: '100%', borderRadius: 0 }} />
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skel" style={{ height: 40, width: '60%' }} />
          <div className="skel" style={{ height: 16, width: '40%' }} />
          <div className="skel" style={{ height: 80 }} />
        </div>
        <div className="skel" style={{ height: 400, borderRadius: 16 }} />
      </div>
    </div>
  );

  if (notFound) return (
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
      <div className="page-center" style={{ marginTop: 64 }}>
        <div className="page-center-icon">🎫</div>
        <div className="page-center-title">Event not found</div>
        <div className="page-center-sub">This event may have ended or been removed.</div>
        <Link href="/" style={{ marginTop: 8, padding: '10px 24px', background: 'var(--accent)', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          Browse all events
        </Link>
      </div>
    </div>
  );

  const org = event.organisers;
  const orgInitial = org?.name?.[0]?.toUpperCase() || '?';

  return (
    <div>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-mark">
            <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#0a9e7f" strokeWidth="2"/><circle cx="7" cy="7" r="2" fill="#0a9e7f"/></svg>
          </div>
          Trackage Scheme
        </Link>
        <Link href="/" className="nav-back">← All events</Link>
        <div className="nav-right">
          {user ? (
            <span style={{ fontSize: 13, color: 'var(--mid)' }}>{user.email?.split('@')[0]}</span>
          ) : (
            <button className="nav-login-btn" onClick={() => setAuthOpen(true)}>Sign in</button>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="event-hero">
        {event.poster_url || event.thumbnail_url
          ? <div className="event-hero-bg" style={{ backgroundImage: `url(${event.poster_url || event.thumbnail_url})` }} />
          : <div className="event-hero-placeholder" />
        }
        <div className="event-hero-content">
          <div className="event-hero-tag">
            <span>🎵</span> {org?.name || 'Trackage Scheme'}
          </div>
          <h1 className="event-hero-title">{event.name}</h1>
          <div className="event-hero-meta">
            {event.start_time && (
              <span className="event-hero-meta-item">
                📅 {fmtFull(event.start_time)}
              </span>
            )}
            {event.start_time && (
              <>
                <div className="event-hero-dot" />
                <span className="event-hero-meta-item">🕐 {fmtTime(event.start_time)}</span>
              </>
            )}
            {event.venue_name && (
              <>
                <div className="event-hero-dot" />
                <span className="event-hero-meta-item">📍 {event.venue_name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="page-body">

        {/* ── LEFT: event info ── */}
        <div className="page-left">

          {/* Info cards */}
          <div className="section">
            <div className="info-grid">
              {event.start_time && (
                <div className="info-card">
                  <div className="info-icon">📅</div>
                  <div>
                    <div className="info-label">Date</div>
                    <div className="info-value">{fmtFull(event.start_time)}</div>
                    <div className="info-sub">{fmtTime(event.start_time)}{event.end_time ? ` – ${fmtTime(event.end_time)}` : ''}</div>
                  </div>
                </div>
              )}
              {event.venue_name && (
                <div className="info-card">
                  <div className="info-icon">📍</div>
                  <div>
                    <div className="info-label">Venue</div>
                    <div className="info-value">{event.venue_name}</div>
                    {event.address && <div className="info-sub">{event.address}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Description */}
          {event.description && (
            <>
              <div className="section">
                <div className="section-title">About this event</div>
                <div className="event-desc"
                  dangerouslySetInnerHTML={{ __html: event.description.replace(/\n/g, '<br/>') }}
                />
              </div>
              <div className="divider" />
            </>
          )}

          {/* Organiser */}
          {org && (
            <div className="section">
              <div className="section-title">Organiser</div>
              <div className="organiser-card">
                <div className="organiser-avatar">{orgInitial}</div>
                <div>
                  <div className="organiser-name">{org.name}</div>
                  <div className="organiser-label">Event organiser</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT: ticket panel ── */}
        <div className="page-right">
          <div className="ticket-panel">

            <div className="ticket-panel-header">
              <div className="ticket-panel-title">Get tickets</div>
              <div className="ticket-panel-sub">
                {allSoldOut
                  ? 'This event is sold out'
                  : event.start_time
                    ? `${fmtMonth(event.start_time)} ${fmtDay(event.start_time)} · ${fmtTime(event.start_time)}`
                    : 'Select your tickets below'
                }
              </div>
            </div>

            {/* Sold out banner */}
            {allSoldOut && (
              <div className="soldout-banner">
                <div className="soldout-banner-icon">😔</div>
                <div>
                  <div className="soldout-banner-title">Sold out</div>
                  <div className="soldout-banner-sub">All tickets for this event have been sold.</div>
                </div>
              </div>
            )}

            {/* Ticket list */}
            {!allSoldOut && (
              <div className="ticket-list">
                {(event.tickets || []).length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--light)', fontSize: 13 }}>
                    No tickets available yet.
                  </div>
                ) : (event.tickets || []).map(ticket => {
                  const qty       = quantities[ticket.id] || 0;
                  const available = ticketAvailable(ticket);
                  const remaining = ticketRemaining(ticket);
                  const max       = ticket.max_per_order || 10;
                  const maxQty    = remaining !== null ? Math.min(max, remaining) : max;

                  return (
                    <div
                      key={ticket.id}
                      className={`ticket-row ${qty > 0 ? 'selected' : ''} ${!available ? 'soldout' : ''}`}
                    >
                      <div className="ticket-row-top">
                        <div>
                          <div className="ticket-name">{ticket.name}</div>
                          {ticket.description && (
                            <div className="ticket-desc">{ticket.description}</div>
                          )}
                        </div>
                        <div className="ticket-price-wrap">
                          <div className={`ticket-price ${ticket.price === 0 ? 'free' : ''}`}>
                            {ticket.price === 0 ? 'Free' : fmt(ticket.price)}
                          </div>
                          {ticket.price > 0 && bookingFee > 0 && (
                            <div className="ticket-fee">+ booking fee</div>
                          )}
                        </div>
                      </div>

                      <div className="ticket-qty-row">
                        {!available ? (
                          <span className="soldout-tag">Sold out</span>
                        ) : remaining !== null && remaining <= 5 ? (
                          <span className="ticket-remaining">Only {remaining} left!</span>
                        ) : (
                          <div />
                        )}

                        {available && (
                          <div className="ticket-qty-control">
                            <button
                              className={`qty-btn ${qty > 0 ? 'has-qty' : ''}`}
                              onClick={() => setQty(ticket.id, -1)}
                              disabled={qty === 0}
                            >−</button>
                            <span className={`qty-num ${qty > 0 ? 'nonzero' : ''}`}>{qty}</span>
                            <button
                              className={`qty-btn ${qty > 0 ? 'has-qty' : ''}`}
                              onClick={() => setQty(ticket.id, 1)}
                              disabled={qty >= maxQty}
                            >+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Coupon */}
            {!allSoldOut && totalTickets > 0 && (
              <div className="coupon-section">
                {coupon ? (
                  <div className="coupon-applied">
                    <span className="coupon-applied-label">
                      🏷 {coupon.code} — {coupon.discount_type === 'percent'
                        ? `${coupon.discount_value}% off`
                        : `${fmt(coupon.discount_value)} off`}
                    </span>
                    <button className="coupon-remove" onClick={removeCoupon}>Remove</button>
                  </div>
                ) : (
                  <>
                    <div className="coupon-row">
                      <input
                        className={`coupon-input ${couponError ? 'error' : ''}`}
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      />
                      <button
                        className="coupon-btn"
                        onClick={applyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                      >{couponLoading ? '…' : 'Apply'}</button>
                    </div>
                    {couponError && (
                      <div className="coupon-feedback error">✗ {couponError}</div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Order summary */}
            {!allSoldOut && totalTickets > 0 && (
              <div className="order-summary">
                <div className="order-summary-title">Order summary</div>

                {selectedLines.map(l => (
                  <div key={l.ticket.id} className="order-line">
                    <span className="order-line-name">{l.qty}× {l.ticket.name}</span>
                    <span className="order-line-price">{fmt(l.subtotal)}</span>
                  </div>
                ))}

                <div className="order-subtotal">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {bookingFee > 0 && (
                  <div className="order-fee">
                    <span>Booking fee</span>
                    <span>{fmt(bookingFee)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="order-discount">
                    <span>Discount ({coupon?.code})</span>
                    <span>−{fmt(discount)}</span>
                  </div>
                )}

                <div className="order-total">
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>
            )}

            {/* Customer details */}
            {!allSoldOut && totalTickets > 0 && (
              <div className="customer-section">
                <div className="customer-title">Your details</div>
                <div className="customer-grid">
                  <div className="customer-field">
                    <label>First name *</label>
                    <input
                      type="text"
                      placeholder="John"
                      value={customer.first_name}
                      className={customerErrors.first_name ? 'err' : ''}
                      onChange={e => { setCustomer(p => ({...p, first_name: e.target.value})); setCustomerErrors(p => ({...p, first_name: false})); }}
                    />
                  </div>
                  <div className="customer-field">
                    <label>Last name *</label>
                    <input
                      type="text"
                      placeholder="Smith"
                      value={customer.last_name}
                      className={customerErrors.last_name ? 'err' : ''}
                      onChange={e => { setCustomer(p => ({...p, last_name: e.target.value})); setCustomerErrors(p => ({...p, last_name: false})); }}
                    />
                  </div>
                  <div className="customer-field customer-full">
                    <label>Email address *</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={customer.email}
                      className={customerErrors.email ? 'err' : ''}
                      onChange={e => { setCustomer(p => ({...p, email: e.target.value})); setCustomerErrors(p => ({...p, email: false})); }}
                    />
                  </div>
                  <div className="customer-field customer-full">
                    <label>Mobile number *</label>
                    <input
                      type="tel"
                      placeholder="+356 7900 0000"
                      value={customer.phone}
                      className={customerErrors.phone ? 'err' : ''}
                      onChange={e => { setCustomer(p => ({...p, phone: e.target.value})); setCustomerErrors(p => ({...p, phone: false})); }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Consent checkboxes */}
            {!allSoldOut && totalTickets > 0 && (
              <div className="consent-box">
                <label className="consent-row" onClick={() => { setConsentData(v => !v); setConsentError(false); }}>
                  <input
                    type="checkbox"
                    checked={consentData}
                    readOnly
                    className={consentError ? 'err' : ''}
                  />
                  <span className={`consent-text${consentError ? ' err-text' : ''}`}>
                    <strong>I agree to my details being stored</strong> so that my tickets can be issued and my order can be managed. This is required to complete your purchase.
                  </span>
                </label>
                <label className="consent-row" onClick={() => setConsentMarketing(v => !v)}>
                  <input
                    type="checkbox"
                    checked={consentMarketing}
                    readOnly
                  />
                  <span className="consent-text">
                    I agree to receive <strong>promotional communications</strong> about future events and offers from the organiser. You can unsubscribe at any time.
                  </span>
                </label>
              </div>
            )}

            {/* Checkout button */}
            {!allSoldOut && (
              <div className="checkout-section">
                <button
                  className={`btn-checkout ${checkoutLoading ? 'loading' : ''}`}
                  disabled={totalTickets === 0 || checkoutLoading}
                  onClick={handleCheckout}
                >
                  {checkoutLoading
                    ? 'Redirecting to payment…'
                    : totalTickets === 0
                      ? 'Select tickets to continue'
                      : `Pay ${fmt(total)} →`
                  }
                </button>
                <div className="secure-note">
                  🔒 Secure payment via Stripe
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── AUTH MODAL ── */}
      {authOpen && (
        <div
          style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
          onClick={() => setAuthOpen(false)}
        >
          <div
            style={{ background:'white',borderRadius:20,width:'100%',maxWidth:400,padding:'40px 36px',position:'relative',boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setAuthOpen(false)}
              style={{ position:'absolute',top:16,right:16,background:'#f5f5f3',border:'none',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:'#666' }}
            >✕</button>
            <div style={{ fontFamily:'var(--serif)',fontSize:26,color:'var(--black)',marginBottom:6,letterSpacing:'-0.02em' }}>Sign in to buy</div>
            <div style={{ fontSize:14,color:'var(--mid)',marginBottom:28,lineHeight:1.5 }}>You need an account to complete your purchase. It only takes a second.</div>

            <button
              onClick={async () => { await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.href } }); }}
              style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px 20px',borderRadius:10,fontSize:14,fontWeight:600,fontFamily:'var(--sans)',cursor:'pointer',background:'#f7f7f5',color:'var(--text)',border:'1.5px solid var(--border)',marginBottom:10 }}
            >
              <svg viewBox="0 0 18 18" fill="none" style={{width:18,height:18}}>
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ fontSize:11,color:'var(--light)',textAlign:'center',marginTop:16,lineHeight:1.5 }}>
              By signing in you agree to our <a href="/terms" style={{color:'var(--mid)'}}>Terms</a> and <a href="/privacy" style={{color:'var(--mid)'}}>Privacy Policy</a>.
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.msg}</div>}

    </div>
  );
}
