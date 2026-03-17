/* app/(public)/events/page.jsx — All Events listing page */
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

/* ── helpers ── */
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
const MT = { timeZone: 'Europe/Malta' };
function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...MT });
}
function fmtMonth(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { month: 'short', ...MT }).toUpperCase();
}
function fmtDay(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', ...MT });
}
function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit', ...MT });
}
function lowestPrice(tickets) {
  if (!tickets?.length) return null;
  const prices = tickets.map(t => t.price).filter(p => p != null && p > 0);
  if (!prices.length) return null;
  return Math.min(...prices);
}
function isSoldOut(tickets) {
  if (!tickets?.length) return false;
  return tickets.every(t => {
    const inv = t.inventory ?? t.quantity_available;
    const sold = t.sold ?? t.quantity_sold ?? 0;
    return inv != null && sold >= inv;
  });
}

/* ── CSS ── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --accent:      #0a9e7f;
  --accent-dark: #087d65;
  --accent-pale: #e6f7f4;
  --black:       #0a0a0a;
  --white:       #ffffff;
  --off-white:   #fafaf9;
  --text:        #1a1a1a;
  --text-mid:    #555;
  --text-light:  #999;
  --border:      #e8e8e6;
  --serif:       'DM Serif Display', Georgia, serif;
  --sans:        'DM Sans', system-ui, sans-serif;
}

body { font-family: var(--sans); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; }

/* ── NAVBAR ── */
.ev-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 64px;
  background: #fff;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.ev-nav.scrolled { border-color: var(--border); box-shadow: 0 1px 20px rgba(0,0,0,0.06); }
.ev-nav-logo {
  display: flex; align-items: center; gap: 10px;
  text-decoration: none;
}
.ev-nav-logo img { height: 22px; filter: invert(1); }

/* ── PAGE HEADER ── */
.ev-page-header {
  margin-top: 64px;
  background: var(--black);
  padding: 48px 40px 44px;
  color: white;
}
.ev-page-header-inner { max-width: 1200px; margin: 0 auto; }
.ev-page-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 12px;
}
.ev-page-title {
  font-family: var(--serif);
  font-size: clamp(36px, 5vw, 56px);
  color: white; line-height: 1.05;
  letter-spacing: -0.02em; margin-bottom: 8px;
}
.ev-page-subtitle {
  font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.5;
}

/* ── MAIN CONTENT ── */
.ev-main {
  max-width: 1200px; margin: 0 auto;
  padding: 48px 40px 80px;
}

/* ── FILTER ROW ── */
.ev-filter-row {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 36px; flex-wrap: wrap;
}
.ev-search-bar {
  flex: 1; min-width: 200px; max-width: 360px;
  position: relative;
}
.ev-search-bar input {
  width: 100%; padding: 9px 16px 9px 38px;
  border: 1.5px solid var(--border); border-radius: 100px;
  font-size: 13px; font-family: var(--sans); color: var(--text);
  background: var(--white); outline: none; transition: border-color 0.15s;
}
.ev-search-bar input:focus { border-color: var(--accent); }
.ev-search-icon {
  position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
  color: var(--text-light); font-size: 14px; pointer-events: none;
}
.ev-chip {
  padding: 7px 16px; border-radius: 100px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
  border: 1.5px solid var(--border); background: var(--white);
  color: var(--text-mid); cursor: pointer; font-family: var(--sans);
  transition: all 0.15s; white-space: nowrap;
}
.ev-chip:hover { border-color: var(--accent); color: var(--accent); }
.ev-chip.active { background: var(--black); border-color: var(--black); color: var(--white); }

/* ── RESULTS COUNT ── */
.ev-results-count {
  font-size: 13px; color: var(--text-light); margin-bottom: 24px;
}

/* ── EVENT GRID ── */
.ev-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

/* ── EVENT CARD ── */
.ev-card {
  background: var(--white); border-radius: 14px;
  border: 1px solid var(--border);
  overflow: hidden; cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  text-decoration: none; display: block;
  animation: evCardIn 0.4s ease both;
}
.ev-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); border-color: rgba(10,158,127,0.2); }
@keyframes evCardIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ev-img-wrap {
  position: relative; aspect-ratio: 16/9; overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e, #0a0a0a);
}
.ev-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.ev-card:hover .ev-img-wrap img { transform: scale(1.04); }
.ev-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #111 0%, #1c1c2e 50%, #0a9e7f18 100%);
  font-size: 36px;
}
.ev-img-date {
  position: absolute; top: 12px; left: 12px;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
  border-radius: 8px; padding: 6px 10px; text-align: center; min-width: 42px;
}
.ev-img-date-month { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
.ev-img-date-day   { font-size: 20px; font-weight: 700; color: white; line-height: 1; }
.ev-img-badge {
  position: absolute; top: 12px; right: 12px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 4px;
}
.badge-soldout { background: #ef4444; color: white; }
.badge-free    { background: var(--accent); color: white; }

.ev-body { padding: 18px 20px 20px; }
.ev-organiser { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
.ev-name { font-family: var(--serif); font-size: 20px; color: var(--black); line-height: 1.2; letter-spacing: -0.01em; margin-bottom: 10px; }
.ev-details { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.ev-detail-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-mid); }
.ev-detail-icon { font-size: 11px; width: 14px; text-align: center; flex-shrink: 0; }
.ev-footer-row { display: flex; align-items: center; justify-content: space-between; }
.ev-price { font-size: 15px; font-weight: 700; color: var(--black); }
.ev-price-from { font-size: 10px; font-weight: 500; color: var(--text-light); display: block; margin-bottom: 1px; }
.ev-price.free { color: var(--accent); }
.btn-ev-tickets {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--black); color: white;
  padding: 8px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700; font-family: var(--sans);
  border: none; cursor: pointer; transition: background 0.15s, transform 0.1s;
  text-decoration: none; white-space: nowrap;
}
.btn-ev-tickets:hover { background: var(--accent); transform: translateY(-1px); }
.btn-ev-tickets.sold-out { background: #e5e7eb; color: var(--text-light); cursor: not-allowed; pointer-events: none; }

/* ── SKELETON ── */
.ev-skel {
  background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
  background-size: 200% 100%;
  animation: evShimmer 1.4s infinite;
  border-radius: 6px;
}
@keyframes evShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.ev-skel-card { border-radius: 14px; overflow: hidden; border: 1px solid var(--border); }
.ev-skel-img  { aspect-ratio: 16/9; background: #eee; }
.ev-skel-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }

/* ── EMPTY STATE ── */
.ev-empty {
  grid-column: 1/-1; text-align: center;
  padding: 80px 20px; color: var(--text-light);
}
.ev-empty-icon  { font-size: 48px; margin-bottom: 16px; }
.ev-empty-title { font-family: var(--serif); font-size: 24px; color: var(--text-mid); margin-bottom: 8px; }
.ev-empty-sub   { font-size: 14px; }

/* ── FOOTER ── */
.ev-footer {
  background: var(--black); color: rgba(255,255,255,0.6);
  padding: 32px 40px;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.ev-footer-copy { font-size: 12px; color: rgba(255,255,255,0.3); }
.ev-footer-back { font-size: 13px; color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.15s; }
.ev-footer-back:hover { color: white; }

/* ── MOBILE ── */
@media (max-width: 900px) {
  .ev-nav { padding: 0 20px; }
  .ev-page-header { padding: 36px 20px 32px; }
  .ev-main { padding: 36px 20px 60px; }
  .ev-footer { padding: 24px 20px; }
}
@media (max-width: 600px) {
  .ev-grid { grid-template-columns: 1fr; }
  .ev-search-bar { min-width: 100%; max-width: 100%; order: -1; }
  .ev-filter-row { flex-wrap: wrap; }
}
`;

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all',      label: 'All Events' },
];

export default function EventsPage() {
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('upcoming');
  const [search,   setSearch]   = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    loadEvents();
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function loadEvents() {
    setLoading(true);
    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id, name, slug, description, venue_name, start_time, end_time,
          thumbnail_url, poster_url, status, organiser_id,
          tickets ( id, name, price, inventory, sold )
        `)
        .eq('status', 'published')
        .order('start_time', { ascending: true, nullsFirst: false });

      if (error) throw error;

      if (eventsData && eventsData.length > 0) {
        const orgIds = [...new Set(eventsData.map(e => e.organiser_id).filter(Boolean))];
        let orgMap = {};
        if (orgIds.length > 0) {
          const { data: orgs } = await supabase
            .from('organisers').select('id, name').in('id', orgIds);
          orgMap = Object.fromEntries((orgs || []).map(o => [o.id, o.name]));
        }
        const enriched = eventsData.map(e => ({
          ...e,
          organisers: { name: orgMap[e.organiser_id] || '' }
        }));
        setEvents(enriched);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('loadEvents error:', err);
      setEvents([]);
    }
    setLoading(false);
  }

  function applyFilters(evts) {
    const now = new Date();
    return evts
      .filter(e => {
        if (filter === 'upcoming') {
          if (!e.start_time) return true; // no date set — always show
          // If event has an end_time, hide only after it ends
          if (e.end_time) return new Date(e.end_time) >= now;
          return new Date(e.start_time) >= now;
        }
        return true;
      })
      .filter(e => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          (e.name || '').toLowerCase().includes(s) ||
          (e.organisers?.name || '').toLowerCase().includes(s) ||
          (e.venue_name || '').toLowerCase().includes(s)
        );
      });
  }

  const filtered = applyFilters(events);

  function SkeletonCard() {
    return (
      <div className="ev-skel-card">
        <div className="ev-skel ev-skel-img" />
        <div className="ev-skel-body">
          <div className="ev-skel" style={{ height: 12, width: '40%' }} />
          <div className="ev-skel" style={{ height: 20, width: '80%' }} />
          <div className="ev-skel" style={{ height: 12, width: '60%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div className="ev-skel" style={{ height: 20, width: '25%' }} />
            <div className="ev-skel" style={{ height: 34, width: '30%', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  function EventCard({ event }) {
    const price   = lowestPrice(event.tickets) ?? event.price;
    const soldOut = isSoldOut(event.tickets || []);
    const org     = event.organisers?.name || '';
    const dateStr = event.start_time;
    const venue   = event.venue_name || '';
    const image   = event.thumbnail_url || event.poster_url;

    return (
      <Link href={`/events/${event.slug || event.id}`} className="ev-card">
        <div className="ev-img-wrap">
          {image
            ? <img src={image} alt={event.name} />
            : <div className="ev-img-placeholder">🎵</div>
          }
          <div className="ev-img-date">
            <div className="ev-img-date-month">{fmtMonth(dateStr)}</div>
            <div className="ev-img-date-day">{fmtDay(dateStr)}</div>
          </div>
          {soldOut && <span className="ev-img-badge badge-soldout">Sold out</span>}
          {!soldOut && price === 0 && <span className="ev-img-badge badge-free">Free</span>}
        </div>
        <div className="ev-body">
          {org && <div className="ev-organiser">{org}</div>}
          <div className="ev-name">{event.name}</div>
          <div className="ev-details">
            <div className="ev-detail-row">
              <span className="ev-detail-icon">📅</span>
              <span>{fmtDate(dateStr)}</span>
            </div>
            {venue && (
              <div className="ev-detail-row">
                <span className="ev-detail-icon">📍</span>
                <span>{venue}</span>
              </div>
            )}
            {event.start_time && (
              <div className="ev-detail-row">
                <span className="ev-detail-icon">🕐</span>
                <span>{fmtTime(event.start_time)}</span>
              </div>
            )}
          </div>
          <div className="ev-footer-row">
            <div className={`ev-price${price === 0 ? ' free' : ''}`}>
              {soldOut ? (
                <span style={{ color: '#999', fontSize: 13 }}>Sold out</span>
              ) : price === 0 || price === null ? (
                'Free'
              ) : (
                <>
                  <span className="ev-price-from">From</span>
                  {fmt(price)}
                </>
              )}
            </div>
            <Link
              href={`/events/${event.slug || event.id}`}
              className={`btn-ev-tickets${soldOut ? ' sold-out' : ''}`}
              onClick={e => e.stopPropagation()}
            >
              {soldOut ? 'Sold out' : 'Get tickets →'}
            </Link>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAVBAR */}
      <nav className={`ev-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/" className="ev-nav-logo">
          <img
            src="https://tdqylvqcoxnyzqkesibj.supabase.co/storage/v1/object/public/emails/brand/logo-white.png"
            alt="Trackage Scheme"
          />
        </Link>
      </nav>

      {/* PAGE HEADER */}
      <div className="ev-page-header">
        <div className="ev-page-header-inner">
          <div className="ev-page-eyebrow">Malta's Music Ticketing Platform</div>
          <h1 className="ev-page-title">All Events</h1>
          <p className="ev-page-subtitle">Discover live music, club nights, and cultural events across Malta and Gozo.</p>
        </div>
      </div>

      {/* MAIN */}
      <main className="ev-main">
        {/* Filters */}
        <div className="ev-filter-row">
          <div className="ev-search-bar">
            <span className="ev-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search events, artists, venues…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`ev-chip${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <div className="ev-results-count">
            {filtered.length === 0
              ? 'No events found'
              : `${filtered.length} event${filtered.length !== 1 ? 's' : ''} found`
            }
          </div>
        )}

        {/* Grid */}
        <div className="ev-grid">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <div className="ev-empty">
              <div className="ev-empty-icon">🎵</div>
              <div className="ev-empty-title">No events found</div>
              <div className="ev-empty-sub">
                {search
                  ? 'Try a different search term or clear the filter.'
                  : 'Check back soon — new events are added regularly.'}
              </div>
            </div>
          ) : (
            filtered.map(event => <EventCard key={event.id} event={event} />)
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="ev-footer">
        <span className="ev-footer-copy">© {new Date().getFullYear()} Trackage Scheme. All rights reserved. Malta.</span>
        <Link href="/" className="ev-footer-back">← Back to home</Link>
      </footer>
    </>
  );
}
