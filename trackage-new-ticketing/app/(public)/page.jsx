/* app/(public)/page.jsx — Trackage Scheme Homepage */
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

/* ── helpers ──────────────────────────────────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('en-MT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtMonth(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { month: 'short' }).toUpperCase();
}
function fmtDay(dt) {
  if (!dt) return '';
  return new Date(dt).getDate();
}
function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' });
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

/* ── CSS ──────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

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

html { scroll-behavior: smooth; }
body { font-family: var(--sans); background: var(--white); color: var(--text); -webkit-font-smoothing: antialiased; }

/* ── NAVBAR ── */
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 64px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.nav.scrolled { border-color: var(--border); box-shadow: 0 1px 20px rgba(0,0,0,0.06); }
.nav-logo {
  font-family: var(--sans); font-size: 17px; font-weight: 700;
  color: var(--black); text-decoration: none; letter-spacing: -0.02em;
  text-transform: uppercase; display: flex; align-items: center; gap: 10px;
}
.nav-logo-mark {
  width: 28px; height: 28px; background: var(--black); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.nav-logo-mark svg { width: 14px; height: 14px; }
.nav-links { display: flex; align-items: center; gap: 32px; }
.nav-link { font-size: 13px; font-weight: 500; color: var(--text-mid); text-decoration: none; letter-spacing: 0.01em; transition: color 0.15s; }
.nav-link:hover { color: var(--text); }
.nav-right { display: flex; align-items: center; gap: 12px; }
.nav-login-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
  background: var(--black); color: var(--white); border: none;
  cursor: pointer; font-family: var(--sans); text-decoration: none;
  transition: background 0.15s, transform 0.1s;
}
.nav-login-btn:hover { background: #222; transform: translateY(-1px); }
.nav-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: white; cursor: pointer;
  text-decoration: none;
}
.nav-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; }

/* ── HERO ── */
.hero {
  margin-top: 64px;
  position: relative; overflow: hidden;
  min-height: 88vh; display: flex; align-items: flex-end;
  background: var(--black);
}
.hero-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  transition: opacity 0.8s;
}
.hero-bg::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0.1) 0%,
    rgba(0,0,0,0.15) 40%,
    rgba(0,0,0,0.75) 80%,
    rgba(0,0,0,0.92) 100%
  );
}
.hero-placeholder-bg {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #0a9e7f22 100%);
}
.hero-placeholder-bg::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    radial-gradient(circle at 20% 50%, rgba(10,158,127,0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(10,158,127,0.08) 0%, transparent 40%);
}
.hero-noise {
  position: absolute; inset: 0; opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}
.hero-content {
  position: relative; z-index: 2;
  padding: 60px 40px 56px;
  width: 100%; max-width: 900px;
  animation: fadeUp 0.8s ease both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.hero-tag {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent); color: white;
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 5px 12px; border-radius: 4px; margin-bottom: 20px;
}
.hero-pulse {
  width: 6px; height: 6px; border-radius: 50%; background: white;
  animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
.hero-title {
  font-family: var(--serif);
  font-size: clamp(42px, 7vw, 76px);
  color: white; line-height: 1.05;
  letter-spacing: -0.02em; margin-bottom: 16px;
}
.hero-meta {
  display: flex; align-items: center; gap: 20px;
  flex-wrap: wrap; margin-bottom: 32px;
}
.hero-meta-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: rgba(255,255,255,0.75); font-weight: 400;
}
.hero-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.3); }
.hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.btn-hero-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--accent); color: white;
  padding: 14px 28px; border-radius: 10px;
  font-size: 15px; font-weight: 600; font-family: var(--sans);
  border: none; cursor: pointer; text-decoration: none;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 4px 20px rgba(10,158,127,0.4);
}
.btn-hero-primary:hover { background: var(--accent-dark); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(10,158,127,0.5); }
.btn-hero-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.12); color: white;
  padding: 14px 24px; border-radius: 10px;
  font-size: 15px; font-weight: 500; font-family: var(--sans);
  border: 1px solid rgba(255,255,255,0.25); cursor: pointer; text-decoration: none;
  transition: background 0.15s;
  backdrop-filter: blur(8px);
}
.btn-hero-ghost:hover { background: rgba(255,255,255,0.2); }
.hero-price-tag {
  position: absolute; top: 40px; right: 40px; z-index: 2;
  background: rgba(255,255,255,0.95); border-radius: 12px;
  padding: 14px 20px; text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  animation: fadeUp 0.8s 0.2s ease both;
}
.hero-price-from { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-light); }
.hero-price-val { font-size: 26px; font-weight: 700; color: var(--accent); line-height: 1.1; margin: 2px 0; font-family: var(--serif); }
.hero-price-note { font-size: 11px; color: var(--text-light); }

/* ── SECTION ── */
.section { padding: 72px 40px; }
.section-alt { background: var(--off-white); }
.section-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 40px; gap: 16px; flex-wrap: wrap;
}
.section-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 8px;
}
.section-title {
  font-family: var(--serif);
  font-size: clamp(28px, 4vw, 40px);
  color: var(--black); letter-spacing: -0.02em; line-height: 1.1;
}
.section-view-all {
  font-size: 13px; font-weight: 600; color: var(--text-mid);
  text-decoration: none; display: flex; align-items: center; gap: 4px;
  transition: color 0.15s; white-space: nowrap;
}
.section-view-all:hover { color: var(--accent); }

/* ── FILTERS ── */
.filter-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 36px;
  flex-wrap: wrap;
}
.filter-chip {
  padding: 7px 16px; border-radius: 100px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
  border: 1.5px solid var(--border); background: var(--white);
  color: var(--text-mid); cursor: pointer; font-family: var(--sans);
  transition: all 0.15s; white-space: nowrap;
}
.filter-chip:hover { border-color: var(--accent); color: var(--accent); }
.filter-chip.active { background: var(--black); border-color: var(--black); color: var(--white); }
.search-bar {
  flex: 1; min-width: 200px; max-width: 340px;
  position: relative;
}
.search-bar input {
  width: 100%; padding: 9px 16px 9px 38px;
  border: 1.5px solid var(--border); border-radius: 100px;
  font-size: 13px; font-family: var(--sans); color: var(--text);
  background: var(--white); outline: none; transition: border-color 0.15s;
}
.search-bar input:focus { border-color: var(--accent); }
.search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 14px; pointer-events: none; }

/* ── EVENT GRID ── */
.events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.event-card {
  background: var(--white); border-radius: 14px;
  border: 1px solid var(--border);
  overflow: hidden; cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  text-decoration: none; display: block;
  animation: cardIn 0.5s ease both;
}
.event-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); border-color: rgba(10,158,127,0.2); }
@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.event-card:nth-child(1) { animation-delay: 0ms; }
.event-card:nth-child(2) { animation-delay: 60ms; }
.event-card:nth-child(3) { animation-delay: 120ms; }
.event-card:nth-child(4) { animation-delay: 180ms; }
.event-card:nth-child(5) { animation-delay: 240ms; }
.event-card:nth-child(6) { animation-delay: 300ms; }

.event-img-wrap {
  position: relative; aspect-ratio: 16/9; overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e, #0a0a0a);
}
.event-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
.event-card:hover .event-img-wrap img { transform: scale(1.04); }
.event-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #111 0%, #1c1c2e 50%, #0a9e7f18 100%);
  font-size: 36px;
}
.event-img-date {
  position: absolute; top: 12px; left: 12px;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
  border-radius: 8px; padding: 6px 10px; text-align: center;
  min-width: 42px;
}
.event-img-date-month { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
.event-img-date-day   { font-size: 20px; font-weight: 700; color: white; line-height: 1; }
.event-img-badge {
  position: absolute; top: 12px; right: 12px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 4px;
}
.badge-soldout { background: #ef4444; color: white; }
.badge-free    { background: var(--accent); color: white; }
.badge-few     { background: #f59e0b; color: white; }

.event-body { padding: 18px 20px 20px; }
.event-organiser { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
.event-name { font-family: var(--serif); font-size: 20px; color: var(--black); line-height: 1.2; letter-spacing: -0.01em; margin-bottom: 10px; }
.event-details { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.event-detail-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-mid); }
.event-detail-icon { font-size: 11px; width: 14px; text-align: center; flex-shrink: 0; }
.event-footer { display: flex; align-items: center; justify-content: space-between; }
.event-price { font-size: 15px; font-weight: 700; color: var(--black); }
.event-price-from { font-size: 10px; font-weight: 500; color: var(--text-light); display: block; margin-bottom: 1px; }
.event-price.free { color: var(--accent); }
.btn-tickets {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--black); color: white;
  padding: 8px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700; font-family: var(--sans);
  border: none; cursor: pointer; transition: background 0.15s, transform 0.1s;
  text-decoration: none; white-space: nowrap;
}
.btn-tickets:hover { background: var(--accent); transform: translateY(-1px); }
.btn-tickets.sold-out { background: #e5e7eb; color: var(--text-light); cursor: not-allowed; pointer-events: none; }

/* ── EMPTY STATE ── */
.empty-state {
  grid-column: 1/-1; text-align: center;
  padding: 80px 20px; color: var(--text-light);
}
.empty-state-icon { font-size: 48px; margin-bottom: 16px; }
.empty-state-title { font-family: var(--serif); font-size: 24px; color: var(--text-mid); margin-bottom: 8px; }
.empty-state-sub { font-size: 14px; }

/* ── SKELETON ── */
.skel {
  background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.skel-card { border-radius: 14px; overflow: hidden; border: 1px solid var(--border); }
.skel-img   { aspect-ratio: 16/9; background: #eee; }
.skel-body  { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }

/* ── STATS BAR ── */
.stats-bar {
  background: var(--black); color: white;
  padding: 40px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0;
}
.stat-item { text-align: center; padding: 20px; position: relative; }
.stat-item + .stat-item::before {
  content: ''; position: absolute; left: 0; top: 25%; height: 50%;
  width: 1px; background: rgba(255,255,255,0.1);
}
.stat-num { font-family: var(--serif); font-size: 42px; color: var(--accent); line-height: 1; margin-bottom: 6px; }
.stat-label { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }

/* ── NEWSLETTER ── */
.newsletter {
  background: var(--accent-pale);
  padding: 64px 40px;
  display: flex; align-items: center; justify-content: center;
  text-align: center;
}
.newsletter-inner { max-width: 540px; }
.newsletter-title { font-family: var(--serif); font-size: 32px; color: var(--black); margin-bottom: 10px; letter-spacing: -0.02em; }
.newsletter-sub { font-size: 15px; color: var(--text-mid); margin-bottom: 28px; line-height: 1.6; }
.newsletter-form { display: flex; gap: 8px; max-width: 440px; margin: 0 auto; }
.newsletter-input {
  flex: 1; padding: 12px 18px; border: 1.5px solid var(--border); border-radius: 10px;
  font-size: 14px; font-family: var(--sans); color: var(--text);
  background: white; outline: none;
}
.newsletter-input:focus { border-color: var(--accent); }
.newsletter-btn {
  padding: 12px 22px; background: var(--accent); color: white; border: none;
  border-radius: 10px; font-size: 14px; font-weight: 600; font-family: var(--sans);
  cursor: pointer; transition: background 0.15s; white-space: nowrap;
}
.newsletter-btn:hover { background: var(--accent-dark); }

/* ── FOOTER ── */
.footer {
  background: var(--black); color: rgba(255,255,255,0.6);
  padding: 48px 40px 32px;
}
.footer-top {
  display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 40px;
  margin-bottom: 40px;
}
.footer-brand { }
.footer-logo { font-family: var(--sans); font-size: 16px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: -0.01em; margin-bottom: 12px; }
.footer-tagline { font-size: 13px; line-height: 1.6; color: rgba(255,255,255,0.45); max-width: 260px; }
.footer-col-title { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 16px; }
.footer-links { display: flex; flex-direction: column; gap: 10px; }
.footer-link { font-size: 13px; color: rgba(255,255,255,0.55); text-decoration: none; transition: color 0.15s; }
.footer-link:hover { color: white; }
.footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.footer-copy { font-size: 12px; color: rgba(255,255,255,0.3); }
.footer-legal { display: flex; gap: 20px; }
.footer-legal a { font-size: 12px; color: rgba(255,255,255,0.3); text-decoration: none; transition: color 0.15s; }
.footer-legal a:hover { color: rgba(255,255,255,0.6); }

/* ── AUTH MODAL ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.auth-modal {
  background: white; border-radius: 20px; width: 100%; max-width: 420px;
  padding: 40px 36px; position: relative;
  box-shadow: 0 24px 80px rgba(0,0,0,0.25);
  animation: slideUp 0.25s ease;
}
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.modal-close {
  position: absolute; top: 16px; right: 16px;
  background: var(--off-white); border: none; border-radius: 50%;
  width: 32px; height: 32px; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-mid); transition: background 0.15s;
}
.modal-close:hover { background: #eee; }
.auth-title { font-family: var(--serif); font-size: 28px; color: var(--black); margin-bottom: 6px; letter-spacing: -0.02em; }
.auth-sub { font-size: 14px; color: var(--text-mid); margin-bottom: 32px; line-height: 1.5; }
.auth-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
.auth-divider-line { flex: 1; height: 1px; background: var(--border); }
.auth-divider-text { font-size: 12px; color: var(--text-light); font-weight: 500; }
.social-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 13px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
  font-family: var(--sans); cursor: pointer; transition: all 0.15s; border: none;
  margin-bottom: 10px;
}
.social-btn:last-child { margin-bottom: 0; }
.btn-google { background: var(--off-white); color: var(--text); border: 1.5px solid var(--border); }
.btn-google:hover { background: #f0f0f0; border-color: #ccc; }
.btn-facebook { background: #1877F2; color: white; }
.btn-facebook:hover { background: #1565d8; }
.social-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
.auth-terms { font-size: 11px; color: var(--text-light); text-align: center; margin-top: 20px; line-height: 1.5; }
.auth-terms a { color: var(--text-mid); text-decoration: underline; }

/* ── MOBILE ── */
@media (max-width: 900px) {
  .nav { padding: 0 20px; }
  .nav-links { display: none; }
  .nav-hamburger { display: block; }
  .hero-content { padding: 40px 20px 44px; }
  .hero-price-tag { display: none; }
  .section { padding: 48px 20px; }
  .stats-bar { padding: 32px 20px; }
  .footer-top { grid-template-columns: 1fr; gap: 32px; }
  .newsletter { padding: 48px 20px; }
  .newsletter-form { flex-direction: column; }
  .footer { padding: 40px 20px 28px; }
}
@media (max-width: 600px) {
  .events-grid { grid-template-columns: 1fr; }
  .filter-row { gap: 6px; }
}
`;

/* ── SAMPLE FALLBACK EVENTS (shown when DB is empty) ─────────────── */
const FALLBACK_EVENTS = [
  { id: 'f1', name: 'Bass Culture Vol. 14', organiser: 'Wicked Events Malta', venue: 'Uno Kitchen & Bar, Paceville', date: new Date(Date.now() + 14*86400000).toISOString(), price: 15, image: null },
  { id: 'f2', name: 'Nocturnal Sessions IV', organiser: 'Underground Collective', venue: 'Club Numero Uno', date: new Date(Date.now() + 21*86400000).toISOString(), price: 12, image: null },
  { id: 'f3', name: 'Maltese Rave V', organiser: 'Sonic Boom Promotions', venue: 'TBA, Malta', date: new Date(Date.now() + 35*86400000).toISOString(), price: 10, image: null },
  { id: 'f4', name: 'Echo Chamber Festival', organiser: 'Freeform Republic', venue: 'Open Air Venue, Gozo', date: new Date(Date.now() + 50*86400000).toISOString(), price: 25, image: null },
  { id: 'f5', name: 'Hypercolour Malta', organiser: 'Dark Matter Events', venue: 'Venue TBA', date: new Date(Date.now() + 60*86400000).toISOString(), price: 20, image: null },
  { id: 'f6', name: 'Void Frequency', organiser: 'Sonic Boom Promotions', venue: 'Gianpula, Malta', date: new Date(Date.now() + 7*86400000).toISOString(), price: 8, image: null },
];

const FILTERS = [
  { key: 'all',          label: 'All Events' },
  { key: 'this_week',    label: 'This Week' },
  { key: 'this_month',   label: 'This Month' },
  { key: 'free',         label: 'Free' },
];

/* ── COMPONENT ────────────────────────────────────────────────────── */
export default function HomePage() {
  const [events,      setEvents]      = useState([]);
  const [heroEvent,   setHeroEvent]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [search,      setSearch]      = useState('');
  const [scrolled,    setScrolled]    = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [user,        setUser]        = useState(null);
  const [email,       setEmail]       = useState('');
  const [subDone,     setSubDone]     = useState(false);

  useEffect(() => {
    loadEvents();
    checkUser();
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch {}
  }

  async function loadEvents() {
    setLoading(true);
    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id, name, description, venue_name, start_time, end_time,
          thumbnail_url, poster_url, status, organiser_id,
          tickets ( id, name, price, inventory, sold )
        `)
        .eq('status', 'published')
        .order('start_time', { ascending: true, nullsFirst: false })
        .limit(30);

      if (error) throw error;

      const evts = (eventsData && eventsData.length > 0) ? eventsData : null;

      if (evts) {
        // Fetch organiser names separately (avoids relying on FK join being set up)
        const orgIds = [...new Set(evts.map(e => e.organiser_id).filter(Boolean))];
        let orgMap = {};
        if (orgIds.length > 0) {
          const { data: orgs } = await supabase
            .from('organisers').select('id, name').in('id', orgIds);
          orgMap = Object.fromEntries((orgs || []).map(o => [o.id, o.name]));
        }
        const enriched = evts.map(e => ({ ...e, organisers: { name: orgMap[e.organiser_id] || '' } }));
        setHeroEvent(enriched[0]);
        setEvents(enriched);
      } else {
        setHeroEvent({ ...FALLBACK_EVENTS[0], _fallback: true });
        setEvents(FALLBACK_EVENTS.map(e => ({ ...e, _fallback: true })));
      }
    } catch (err) {
      console.error('loadEvents error:', err);
      setHeroEvent({ ...FALLBACK_EVENTS[0], _fallback: true });
      setEvents(FALLBACK_EVENTS.slice(1).map(e => ({ ...e, _fallback: true })));
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
    } catch (err) { console.error(err); }
  }

  async function handleFacebookLogin() {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: window.location.origin }
      });
    } catch (err) { console.error(err); }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function filterEvents(evts) {
    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(now); monthEnd.setMonth(monthEnd.getMonth() + 1);
    return evts.filter(e => {
      const d = new Date(e.start_time || e.date);
      if (filter === 'this_week')  return d <= weekEnd;
      if (filter === 'this_month') return d <= monthEnd;
      if (filter === 'free') {
        const p = lowestPrice(e.tickets);
        return p === 0 || p === null || e.price === 0;
      }
      return true;
    }).filter(e => {
      if (!search) return true;
      const s = search.toLowerCase();
      const name = (e.name || '').toLowerCase();
      const org  = (e.organisers?.name || e.organiser || '').toLowerCase();
      const venue = (e.venue_name || e.venue || '').toLowerCase();
      return name.includes(s) || org.includes(s) || venue.includes(s);
    });
  }

  const filtered = filterEvents(events);
  const heroPrice   = heroEvent ? (lowestPrice(heroEvent.tickets) ?? heroEvent.price) : null;
  const heroOrg     = heroEvent?.organisers?.name || heroEvent?.organiser || '';
  const heroVenue   = heroEvent?.venue_name || heroEvent?.venue || '';
  const heroImage   = heroEvent?.poster_url || heroEvent?.thumbnail_url || heroEvent?.image_url;
  const heroSoldOut = heroEvent ? isSoldOut(heroEvent.tickets || []) : false;

  function EventCardSkeleton() {
    return (
      <div className="skel-card">
        <div className="skel skel-img" />
        <div className="skel-body">
          <div className="skel" style={{ height: 12, width: '40%' }} />
          <div className="skel" style={{ height: 20, width: '80%' }} />
          <div className="skel" style={{ height: 12, width: '60%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div className="skel" style={{ height: 20, width: '25%' }} />
            <div className="skel" style={{ height: 34, width: '30%', borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  function EventCard({ event }) {
    const price     = lowestPrice(event.tickets) ?? event.price;
    const soldOut   = isSoldOut(event.tickets || []);
    const org       = event.organisers?.name || event.organiser || '';
    const dateStr   = event.start_time || event.date;
    const venue     = event.venue_name || event.venue || '';
    const image     = event.thumbnail_url || event.poster_url || event.image_url || event.image;
    const href      = event._fallback ? '#' : `/events/${event.id}`;

    return (
      <Link href={href} className="event-card">
        <div className="event-img-wrap">
          {image
            ? <img src={image} alt={event.name} />
            : <div className="event-img-placeholder">🎵</div>
          }
          <div className="event-img-date">
            <div className="event-img-date-month">{fmtMonth(dateStr)}</div>
            <div className="event-img-date-day">{fmtDay(dateStr)}</div>
          </div>
          {soldOut && <span className="event-img-badge badge-soldout">Sold out</span>}
          {!soldOut && price === 0 && <span className="event-img-badge badge-free">Free</span>}
        </div>
        <div className="event-body">
          {org && <div className="event-organiser">{org}</div>}
          <div className="event-name">{event.name}</div>
          <div className="event-details">
            <div className="event-detail-row">
              <span className="event-detail-icon">📅</span>
              <span>{fmtDate(dateStr)}</span>
            </div>
            {venue && (
              <div className="event-detail-row">
                <span className="event-detail-icon">📍</span>
                <span>{venue}</span>
              </div>
            )}
            {event.start_time && (
              <div className="event-detail-row">
                <span className="event-detail-icon">🕐</span>
                <span>{fmtTime(event.start_time)}</span>
              </div>
            )}
          </div>
          <div className="event-footer">
            <div className="event-price">
              {soldOut ? (
                <span style={{ color: '#999', fontSize: 13 }}>Sold out</span>
              ) : price === 0 || price === null ? (
                <span className="free">Free</span>
              ) : (
                <>
                  <span className="event-price-from">from</span>
                  {fmt(price)}
                </>
              )}
            </div>
            <Link
              href={href}
              className={`btn-tickets ${soldOut ? 'sold-out' : ''}`}
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
    <div>
      <style>{CSS}</style>

      {/* ── NAVBAR ── */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/" className="nav-logo">
          <img src="https://bflmjuzmmuhytkxpdrbw.supabase.co/storage/v1/object/public/emails/brand/logo-white.png" alt="Trackage Scheme" style={{ height: '32px', width: 'auto', display: 'block', filter: 'invert(1)' }} />
        </Link>

        <div className="nav-links">
          <Link href="/" className="nav-link">Events</Link>
          <Link href="/about" className="nav-link">About</Link>
          <Link href="https://trackagescheme.com" target="_blank" className="nav-link">Main site ↗</Link>
        </div>

        <div className="nav-right">
          {user ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--text-mid)' }}>
                {user.email?.split('@')[0]}
              </span>
              <button
                onClick={handleLogout}
                style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--text-mid)' }}
              >Log out</button>
            </>
          ) : (
            <button className="nav-login-btn" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          )}
        </div>

        <button className="nav-hamburger" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </nav>

      {/* ── HERO ── */}
      {!loading && heroEvent && (
        <section className="hero">
          {heroImage
            ? <div className="hero-bg" style={{ backgroundImage: `url(${heroImage})` }} />
            : <><div className="hero-placeholder-bg" /><div className="hero-noise" /></>
          }

          <div className="hero-content">
            <div className="hero-tag">
              <div className="hero-pulse" />
              Next event
            </div>
            <h1 className="hero-title">{heroEvent.name}</h1>
            <div className="hero-meta">
              {heroOrg && <span className="hero-meta-item">🎵 {heroOrg}</span>}
              {(heroEvent.start_time || heroEvent.date) && (
                <>
                  <div className="hero-meta-dot" />
                  <span className="hero-meta-item">📅 {fmtDate(heroEvent.start_time || heroEvent.date)}</span>
                </>
              )}
              {heroVenue && (
                <>
                  <div className="hero-meta-dot" />
                  <span className="hero-meta-item">📍 {heroVenue}</span>
                </>
              )}
            </div>
            <div className="hero-actions">
              {heroSoldOut ? (
                <span style={{ background: '#ef4444', color: 'white', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600 }}>Sold out</span>
              ) : (
                <Link href={heroEvent._fallback ? '#' : `/events/${heroEvent.id}`} className="btn-hero-primary">
                  Get tickets →
                </Link>
              )}
              <Link href="#events" className="btn-hero-ghost">See all events</Link>
            </div>
          </div>

          {heroPrice !== null && !heroSoldOut && (
            <div className="hero-price-tag">
              <div className="hero-price-from">Tickets from</div>
              <div className="hero-price-val">{heroPrice === 0 ? 'Free' : fmt(heroPrice)}</div>
              <div className="hero-price-note">booking fees may apply</div>
            </div>
          )}
        </section>
      )}

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        {[
          { num: '1,000+',   label: 'Events hosted' },
          { num: '500,000+', label: 'Tickets sold' },
          { num: '250+',     label: 'Trusted by organisers' },
          { num: '12',       label: 'Years running' },
        ].map(s => (
          <div key={s.label} className="stat-item">
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── EVENTS GRID ── */}
      <section id="events" className="section">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">Upcoming</div>
            <h2 className="section-title">Events in Malta</h2>
          </div>
          {filtered.length > 0 && (
            <Link href="/events" className="section-view-all">View all →</Link>
          )}
        </div>

        {/* Filters */}
        <div className="filter-row">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >{f.label}</button>
          ))}
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search events, artists, venues…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="events-grid">
          {loading ? (
            [...Array(6)].map((_, i) => <EventCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎵</div>
              <div className="empty-state-title">No events found</div>
              <div className="empty-state-sub">Try a different filter or check back soon.</div>
            </div>
          ) : (
            filtered.map(event => <EventCard key={event.id} event={event} />)
          )}
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <div className="newsletter">
        <div className="newsletter-inner">
          <h2 className="newsletter-title">Never miss a show</h2>
          <p className="newsletter-sub">Get early access to tickets and be first to know about new events in Malta's underground music scene.</p>
          {subDone ? (
            <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }}>✓ You're on the list!</p>
          ) : (
            <div className="newsletter-form">
              <input
                type="email"
                className="newsletter-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button className="newsletter-btn" onClick={() => email && setSubDone(true)}>
                Notify me
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">Trackage Scheme</div>
            <div className="footer-tagline">Malta's only online ticketing platform 100% dedicated to music. Supporting local artists and promoters since 2016.</div>
          </div>
          <div>
            <div className="footer-col-title">Navigate</div>
            <div className="footer-links">
              <Link href="/" className="footer-link">Events</Link>
              <Link href="https://trackagescheme.com/about-us" target="_blank" className="footer-link">About</Link>
              <Link href="https://trackagescheme.com/services" target="_blank" className="footer-link">Services</Link>
              <Link href="https://trackagescheme.com/contact" target="_blank" className="footer-link">Contact</Link>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Legal</div>
            <div className="footer-links">
              <Link href="/terms" className="footer-link">Terms & Conditions</Link>
              <Link href="/privacy" className="footer-link">Privacy Policy</Link>
              <Link href="/refunds" className="footer-link">Refund Policy</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© {new Date().getFullYear()} Trackage Scheme. All rights reserved. Malta.</div>
          <div className="footer-legal">
            <a href="https://trackagescheme.com" target="_blank">trackagescheme.com ↗</a>
          </div>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      {authOpen && (
        <div className="modal-overlay" onClick={() => setAuthOpen(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAuthOpen(false)}>✕</button>
            <div className="auth-title">Welcome back</div>
            <div className="auth-sub">Sign in to access your tickets and order history.</div>

            <button className="social-btn btn-google" onClick={handleGoogleLogin}>
              <svg viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button className="social-btn btn-facebook" onClick={handleFacebookLogin}>
              <svg viewBox="0 0 18 18" fill="none">
                <path d="M18 9a9 9 0 10-10.406 8.892V11.25H5.344V9h2.25V7.012c0-2.218 1.32-3.441 3.344-3.441.969 0 1.981.173 1.981.173V5.91h-1.116c-1.099 0-1.441.682-1.441 1.382V9h2.453l-.392 2.25H10.36v6.642A9.003 9.003 0 0018 9z" fill="white"/>
              </svg>
              Continue with Facebook
            </button>

            <div className="auth-terms">
              By signing in you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
