/* app/organiser/crm/page.jsx — CRM: Reports + Email Guests + Campaign History */
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { orgFetch } from '../../../lib/organiserFetch';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDay(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
function getPeriodDates(period, customFrom, customTo) {
  const now = new Date();
  if (period === 'month') {
    return {
      from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      to:   now.toISOString().slice(0, 10),
    };
  }
  if (period === 'last') {
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return {
      from: `${y}-${String(m).padStart(2, '0')}-01`,
      to:   new Date(y, m, 0).toISOString().slice(0, 10),
    };
  }
  return { from: customFrom, to: customTo };
}

/* ── SVG Area Chart ── */
function AreaChart({ data, valueKey, color, formatY }) {
  if (!data?.length) {
    return <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>No data for this period.</div>;
  }
  const W = 560, H = 160, PAD = { top: 12, right: 16, bottom: 36, left: 56 };
  const iW = W - PAD.left - PAD.right, iH = H - PAD.top - PAD.bottom;
  const vals = data.map(d => d[valueKey] || 0);
  const maxV = Math.max(...vals, 1);
  const xOf  = i => PAD.left + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW);
  const yOf  = v => PAD.top + iH - (v / maxV) * iH;
  const pts  = data.map((d, i) => `${xOf(i)},${yOf(d[valueKey] || 0)}`).join(' ');
  const area = [`M${xOf(0)},${PAD.top + iH}`, ...data.map((d, i) => `L${xOf(i)},${yOf(d[valueKey] || 0)}`), `L${xOf(data.length - 1)},${PAD.top + iH}`, 'Z'].join(' ');
  const gid  = `g${color.replace('#', '')}crm`;
  const yT   = [0, 0.5, 1].map(t => ({ v: t * maxV, y: yOf(t * maxV) }));
  const step = Math.max(1, Math.ceil(data.length / 7));
  const xI   = data.reduce((a, _, i) => { if (i % step === 0 || i === data.length - 1) a.push(i); return a; }, []);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', minWidth: 280 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {yT.map((t, i) => <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#EBEDF0" strokeWidth="1" />)}
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={xOf(i)} cy={yOf(d[valueKey] || 0)} r="3.5" fill={color} />)}
      {yT.map((t, i) => <text key={i} x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize="9" fill="#767C8C" fontFamily="Plus Jakarta Sans,sans-serif">{formatY(t.v)}</text>)}
      {xI.map(i => <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#767C8C" fontFamily="Plus Jakarta Sans,sans-serif">{fmtDay(data[i].date)}</text>)}
    </svg>
  );
}

const SEGMENTS = [
  { key: 'all',       icon: '👥', label: 'All Attendees',   desc: 'Everyone who has purchased a ticket for any of your events' },
  { key: 'per_event', icon: '🎫', label: 'Per Event',        desc: 'Attendees of a specific event only' },
  { key: 'loyal',     icon: '⭐', label: 'Loyal Fans',       desc: 'Attended more than 3 of your events' },
  { key: 'local',     icon: '🇲🇹', label: 'Local Attendees',  desc: 'Customers with a Maltese phone number (+356)' },
  { key: 'foreign',   icon: '✈️',  label: 'Foreign Visitors', desc: 'Customers with a non-Maltese phone number' },
];

const TEMPLATES = [
  { key: 'promotion',     icon: '🎪', label: 'Event Promotion',   desc: 'Promote an upcoming event with a strong call-to-action' },
  { key: 'thank_you',     icon: '🙏', label: 'Thank You',         desc: 'Post-event thank you message to attendees' },
  { key: 'last_chance',   icon: '⏰', label: 'Last Chance',        desc: 'Urgency-driven message for events about to sell out' },
  { key: 'announcement',  icon: '📢', label: 'New Event',          desc: 'Announce a brand new event to your audience' },
  { key: 're_engagement', icon: '👋', label: 'We Miss You',        desc: 'Win back attendees who haven\'t been to a recent event' },
  { key: 'plain',         icon: '📝', label: 'Plain Text',         desc: 'Simple text email without template styling' },
];

const TEMPLATE_DEFAULTS = {
  promotion:     { subject: 'Check out this amazing event!',     ctaText: 'Get Your Tickets', message: 'We have an exciting event coming up and we\'d love to see you there! Join us for a night of great entertainment, food, and friends.' },
  thank_you:     { subject: 'Thanks for attending!',             ctaText: 'View Photos',      message: 'We had an absolute blast having you at our event. Your presence made it truly special. We\'d love to hear what you thought!' },
  last_chance:   { subject: 'Last chance — tickets selling out!', ctaText: 'Book Now',          message: 'Only a few tickets left! Don\'t miss out on this incredible experience. Grab your tickets today before they\'re gone.' },
  announcement:  { subject: 'New event announcement!',           ctaText: 'Explore the Event', message: 'We\'re thrilled to announce an exciting new event. Be among the first to grab your tickets at our special early-bird price.' },
  re_engagement: { subject: 'We miss you!',                      ctaText: 'See What\'s New',   message: 'It\'s been a while since you\'ve been to one of our events. We\'ve got some amazing things happening this season and we\'d love to see you back.' },
  plain:         { subject: '',                                   ctaText: '',                  message: '' },
};

const CSS = `
.crm-tabs { display: flex; gap: 4px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 100px; padding: 4px; margin-bottom: 28px; width: fit-content; }
.crm-tab { padding: 7px 20px; border-radius: 100px; border: none; background: transparent; font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--muted); cursor: pointer; transition: all 0.15s; }
.crm-tab.active { background: var(--black); color: var(--white); }
.period-bar { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
.period-btn { padding: 7px 14px; border: 1.5px solid var(--border); border-radius: 100px; background: var(--surface); font-size: 12px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--muted); cursor: pointer; transition: all 0.15s; }
.period-btn.active { border-color: var(--black); color: var(--black); background: var(--surface); }
.period-btn:hover { border-color: var(--black); color: var(--black); }
.date-range { display: flex; gap: 8px; align-items: center; }
.date-input { padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; color: var(--black); background: var(--surface); outline: none; }
.date-input:focus { border-color: var(--black); }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
.tile { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 20px 22px; }
.tile-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
.tile-value { font-size: 28px; font-weight: 700; line-height: 1; color: var(--black); }
.tile-value.green  { color: var(--green); }
.tile-value.blue   { color: #3b82f6; }
.tile-value.purple { color: #8b5cf6; }
.chart-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; }
.chart-title { font-size: 15px; font-weight: 700; color: var(--black); letter-spacing: -0.01em; margin-bottom: 16px; }
.chart-wrap { width: 100%; overflow-x: auto; }
.ev-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ev-table th { text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 12px; border-bottom: 1.5px solid var(--border); background: var(--bg); }
.ev-table th:not(:first-child) { text-align: right; }
.ev-table td { padding: 11px 12px; border-top: 1px solid var(--border); color: var(--black); font-weight: 500; }
.ev-table td:not(:first-child) { text-align: right; color: var(--muted); }
.ev-table td:last-child { font-weight: 700; color: var(--green); }
.ev-table tr:last-child td { border-bottom: none; }
.section-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 20px; }
.section-title { font-size: 15px; font-weight: 700; color: var(--black); letter-spacing: -0.01em; margin-bottom: 4px; }
.section-sub { font-size: 13px; color: var(--muted); font-weight: 500; margin-bottom: 22px; line-height: 1.5; }
.seg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.seg-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; }
.seg-card:hover { border-color: var(--black); }
.seg-card.selected { border-color: var(--black); background: var(--bg); }
.seg-icon { font-size: 22px; flex-shrink: 0; line-height: 1; margin-top: 1px; }
.seg-info { flex: 1; min-width: 0; }
.seg-label { font-size: 13px; font-weight: 700; color: var(--black); }
.seg-desc { font-size: 11px; color: var(--muted); font-weight: 500; margin-top: 2px; line-height: 1.4; }
.seg-count { flex-shrink: 0; font-size: 12px; font-weight: 700; color: var(--green); background: var(--green-dim); border-radius: 100px; padding: 2px 10px; align-self: center; white-space: nowrap; }
.event-picker { margin-bottom: 20px; }
.field-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px; }
.select-field { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; color: var(--black); background: var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23767C8C' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 12px center; outline: none; cursor: pointer; appearance: none; padding-right: 32px; }
.select-field:focus { border-color: var(--black); }
.select-field:disabled { opacity: 0.5; cursor: not-allowed; }
.compose-input { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; color: var(--black); background: var(--surface); outline: none; box-sizing: border-box; margin-bottom: 16px; }
.compose-input:focus { border-color: var(--black); }
.compose-textarea { width: 100%; padding: 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; color: var(--black); background: var(--surface); outline: none; box-sizing: border-box; resize: vertical; min-height: 150px; line-height: 1.6; margin-bottom: 16px; }
.compose-textarea:focus { border-color: var(--black); }
.email-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 16px; border-top: 1.5px solid var(--border); }
.recipient-hint { font-size: 13px; color: var(--muted); font-weight: 500; }
.recipient-count { font-weight: 700; color: var(--green); }
.btn-send { display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; background: var(--black); color: var(--white); border: none; border-radius: 8px; font-size: 14px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: opacity 0.15s; }
.btn-send:hover { opacity: 0.8; }
.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel { padding: 11px 16px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--muted); transition: all 0.15s; }
.btn-cancel:hover { border-color: var(--black); color: var(--black); }
.btn-preview { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); transition: all 0.15s; }
.btn-preview:hover { border-color: var(--black); }
.btn-preview:disabled { opacity: 0.5; cursor: not-allowed; }
.confirm-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.confirm-warn { font-size: 13px; color: #b45309; font-weight: 700; }
.result-banner { border-radius: 12px; padding: 14px 18px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
.result-banner.success { background: var(--green-dim); border: 1.5px solid var(--green); color: var(--green); }
.result-banner.error   { background: rgba(239,68,68,0.1); border: 1.5px solid #ef4444; color: #ef4444; }
.skel { border-radius: 8px; background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.tpl-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.tpl-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 12px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; text-align: center; }
.tpl-card:hover { border-color: var(--black); }
.tpl-card.selected { border-color: var(--black); background: var(--bg); }
.tpl-icon { font-size: 28px; line-height: 1; }
.tpl-label { font-size: 12px; font-weight: 700; color: var(--black); }
.tpl-desc { font-size: 10px; color: var(--muted); font-weight: 500; line-height: 1.3; }
.color-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.color-picker { width: 40px; height: 36px; border: 1.5px solid var(--border); border-radius: 8px; cursor: pointer; padding: 2px; background: var(--surface); }
.color-hex { font-size: 13px; font-weight: 600; color: var(--muted); font-family: monospace; }
.preview-frame { width: 100%; border: 1.5px solid var(--border); border-radius: 8px; background: #f5f5f3; min-height: 400px; }
.campaign-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.campaign-table th { text-align: left; font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 10px; border-bottom: 1.5px solid var(--border); background: var(--bg); }
.campaign-table td { padding: 10px 10px; border-top: 1px solid var(--border); color: var(--black); font-weight: 500; }
.campaign-table tr:last-child td { border-bottom: none; }
.stat-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 100px; margin-right: 4px; }
.stat-sent    { background: #e8f4fd; color: #2563eb; }
.stat-opened  { background: #f0fdf4; color: #16a34a; }
.stat-clicked { background: #fef3c7; color: #b45309; }
.stat-conv    { background: #ede9fe; color: #7c3aed; }
@media(max-width:768px) { .tpl-grid { grid-template-columns: 1fr 1fr; } }
@media(max-width:640px) { .tiles { grid-template-columns: 1fr 1fr; } .seg-grid { grid-template-columns: 1fr; } .tpl-grid { grid-template-columns: 1fr 1fr; } .date-range { flex-wrap: wrap; } }
@media(max-width:480px) { .tiles { grid-template-columns: 1fr; } .tpl-grid { grid-template-columns: 1fr; } }
`;

export default function CRMPage() {
  const router = useRouter();
  const [tab, setTab] = useState('reports');

  // Reports
  const [period,     setPeriod]    = useState('month');
  const [customFrom, setFrom]      = useState('');
  const [customTo,   setTo]        = useState('');
  const [reports,    setReports]   = useState(null);
  const [rLoading,   setRLoading]  = useState(true);

  // Email
  const [segment,      setSegment]     = useState('all');
  const [selEvent,     setSelEvent]    = useState('');
  const [template,     setTemplate]    = useState('promotion');
  const [subject,      setSubject]     = useState(TEMPLATE_DEFAULTS.promotion.subject);
  const [message,      setMessage]     = useState(TEMPLATE_DEFAULTS.promotion.message);
  const [ctaText,      setCtaText]     = useState(TEMPLATE_DEFAULTS.promotion.ctaText);
  const [ctaUrl,       setCtaUrl]      = useState('');
  const [logoUrl,      setLogoUrl]     = useState('');
  const [primaryColor, setColor]       = useState('#0a9e7f');
  const [footerText,   setFooterText]  = useState('');
  const [segData,      setSegData]     = useState(null);
  const [segLoading,   setSegLoad]     = useState(false);
  const [sending,      setSending]     = useState(false);
  const [sendResult,   setResult]      = useState(null);
  const [confirm,      setConfirm]     = useState(false);
  const [previewHtml,  setPreviewHtml] = useState('');
  const [previewing,   setPreviewing]  = useState(false);
  const previewRef = useRef(null);

  // Campaigns
  const [campaigns,    setCampaigns]   = useState(null);
  const [campLoading,  setCampLoad]    = useState(false);

  const loadReports = useCallback(async (p, cf, ct) => {
    if (!(localStorage.getItem('organiser_id') || sessionStorage.getItem('organiser_id'))) { router.push('/organiser/login'); return; }
    setRLoading(true);
    const { from, to } = getPeriodDates(p ?? 'month', cf ?? '', ct ?? '');
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    const res  = await orgFetch(`/api/organiser/crm/reports?${params}`).catch(() => null);
    const json = res ? await res.json() : {};
    setReports(json);
    setRLoading(false);
  }, [router]);

  const loadSegments = useCallback(async () => {
    if (!(localStorage.getItem('organiser_id') || sessionStorage.getItem('organiser_id'))) return;
    setSegLoad(true);
    const res  = await orgFetch('/api/organiser/crm/segments').catch(() => null);
    const json = res ? await res.json() : {};
    setSegData(json);
    setSelEvent('');
    setSegLoad(false);
  }, []);

  const loadCampaigns = useCallback(async () => {
    if (!(localStorage.getItem('organiser_id') || sessionStorage.getItem('organiser_id'))) return;
    setCampLoad(true);
    const res  = await orgFetch('/api/organiser/crm/campaigns').catch(() => null);
    const json = res ? await res.json() : {};
    setCampaigns(json.campaigns || []);
    setCampLoad(false);
  }, []);

  useEffect(() => {
    const orgId = (localStorage.getItem('organiser_id') || sessionStorage.getItem('organiser_id'));
    if (!orgId) { router.push('/organiser/login'); return; }
    loadReports(period, customFrom, customTo);
  }, []);

  useEffect(() => {
    if (tab === 'email' && !segData) loadSegments();
    if (tab === 'campaigns' && !campaigns) loadCampaigns();
  }, [tab]);

  function handlePeriod(p) {
    setPeriod(p);
    if (p !== 'custom') loadReports(p, customFrom, customTo);
  }

  function handleCustomApply() {
    if (customFrom && customTo) loadReports('custom', customFrom, customTo);
  }

  function handleTemplateChange(key) {
    setTemplate(key);
    const defaults = TEMPLATE_DEFAULTS[key] || {};
    setSubject(defaults.subject || '');
    setMessage(defaults.message || '');
    setCtaText(defaults.ctaText || '');
    setResult(null);
    setConfirm(false);
    setPreviewHtml('');
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const eventName = segment === 'per_event' && selEvent
        ? segData?.events?.find(e => e.id === selEvent)?.name
        : null;

      const res = await orgFetch('/api/organiser/crm/preview-email', {
        method: 'POST',
        body: JSON.stringify({
          template: template !== 'plain' ? template : 'promotion',
          logo_url: logoUrl,
          primary_color: primaryColor,
          subject,
          message,
          cta_text: ctaText,
          cta_url: ctaUrl,
          footer_text: footerText,
          event_name: eventName,
        }),
      });
      const data = await res.json();
      setPreviewHtml(data.html || '');
    } catch {
      setPreviewHtml('<p>Preview failed to load.</p>');
    }
    setPreviewing(false);
  }

  async function handleSend() {
    if (!confirm) { setConfirm(true); return; }
    setSending(true);
    setResult(null);
    setConfirm(false);
    try {
      const res = await orgFetch('/api/organiser/crm/send-email', {
        method:  'POST',
        body:    JSON.stringify({
          segment,
          event_id: segment === 'per_event' ? selEvent : undefined,
          subject,
          message,
          template,
          logo_url: logoUrl || undefined,
          primary_color: primaryColor !== '#0a9e7f' ? primaryColor : undefined,
          cta_text: ctaText || undefined,
          cta_url:  ctaUrl || undefined,
          footer_text: footerText || undefined,
        }),
      });
      setResult(await res.json());
      // Refresh campaigns if on that tab
      if (campaigns) loadCampaigns();
    } catch (err) {
      setResult({ error: err.message });
    }
    setSending(false);
  }

  function getCount() {
    if (!segData) return null;
    if (segment === 'per_event') return segData.events?.find(e => e.id === selEvent)?.count ?? 0;
    return segData.counts?.[segment] ?? 0;
  }

  const count   = getCount();
  const canSend = !sending && subject.trim() && message.trim() &&
    (segment !== 'per_event' || selEvent) && count > 0;
  const summary = reports?.summary || {};
  const daily   = reports?.daily_sales || [];
  const byEvent = reports?.by_event || [];

  return (
    <>
      <style>{CSS}</style>

      {/* Tab nav */}
      <div className="crm-tabs">
        <button className={`crm-tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          Reports
        </button>
        <button className={`crm-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>
          Email Guests
        </button>
        <button className={`crm-tab ${tab === 'campaigns' ? 'active' : ''}`} onClick={() => setTab('campaigns')}>
          Campaigns
        </button>
      </div>

      {/* ─── REPORTS TAB ─── */}
      {tab === 'reports' && (
        <>
          {/* Period selector */}
          <div className="period-bar">
            {[['month', 'This Month'], ['last', 'Last Month'], ['custom', 'Custom']].map(([k, l]) => (
              <button key={k} className={`period-btn ${period === k ? 'active' : ''}`} onClick={() => handlePeriod(k)}>{l}</button>
            ))}
            {period === 'custom' && (
              <div className="date-range">
                <input type="date" className="date-input" value={customFrom} onChange={e => setFrom(e.target.value)} />
                <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 500 }}>to</span>
                <input type="date" className="date-input" value={customTo} onChange={e => setTo(e.target.value)} />
                <button className="period-btn active" onClick={handleCustomApply}>Apply</button>
              </div>
            )}
          </div>

          {/* Stat tiles */}
          <div className="tiles">
            <div className="tile">
              <div className="tile-label">Total Revenue</div>
              {rLoading ? <div className="skel" style={{ height: 32, width: 100 }} /> : <div className="tile-value green">{fmt(summary.total_revenue)}</div>}
            </div>
            <div className="tile">
              <div className="tile-label">Tickets Sold</div>
              {rLoading ? <div className="skel" style={{ height: 32, width: 60 }} /> : <div className="tile-value blue">{summary.total_tickets ?? 0}</div>}
            </div>
            <div className="tile">
              <div className="tile-label">Completed Orders</div>
              {rLoading ? <div className="skel" style={{ height: 32, width: 50 }} /> : <div className="tile-value purple">{summary.total_orders ?? 0}</div>}
            </div>
          </div>

          {/* Daily Revenue */}
          <div className="chart-card">
            <div className="chart-title">Daily Revenue</div>
            <div className="chart-wrap">
              {rLoading ? <div className="skel" style={{ height: 160 }} /> : <AreaChart data={daily} valueKey="revenue" color="#48C16E" formatY={v => `€${Math.round(v)}`} />}
            </div>
          </div>

          {/* Daily Tickets */}
          <div className="chart-card">
            <div className="chart-title">Daily Ticket Sales</div>
            <div className="chart-wrap">
              {rLoading ? <div className="skel" style={{ height: 160 }} /> : <AreaChart data={daily} valueKey="tickets" color="#3b82f6" formatY={v => Math.round(v)} />}
            </div>
          </div>

          {/* Per-event table */}
          <div className="chart-card">
            <div className="chart-title">Revenue by Event</div>
            {rLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <div key={i} className="skel" style={{ height: 40 }} />)}
              </div>
            ) : byEvent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>No paid orders in this period.</div>
            ) : (
              <table className="ev-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Orders</th>
                    <th>Tickets</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {byEvent.map(ev => (
                    <tr key={ev.event_id}>
                      <td>{ev.event_name}</td>
                      <td>{ev.orders}</td>
                      <td>{ev.tickets}</td>
                      <td>{fmt(ev.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ─── EMAIL GUESTS TAB ─── */}
      {tab === 'email' && (
        <>
          {sendResult && (
            <div className={`result-banner ${sendResult.error ? 'error' : 'success'}`}>
              {sendResult.error
                ? `Error: ${sendResult.error}`
                : `Sent to ${sendResult.sent} of ${sendResult.total} recipients${sendResult.failed ? ` (${sendResult.failed} failed)` : ''}.`
              }
            </div>
          )}

          {/* Step 1: Segment selection */}
          <div className="section-card">
            <div className="section-title">1. Select Audience</div>
            <div className="section-sub">Choose which segment of your attendees to email.</div>

            <div className="seg-grid">
              {SEGMENTS.map(s => {
                const c = s.key === 'per_event'
                  ? (selEvent ? segData?.events?.find(e => e.id === selEvent)?.count : undefined)
                  : segData?.counts?.[s.key];
                return (
                  <div
                    key={s.key}
                    className={`seg-card ${segment === s.key ? 'selected' : ''}`}
                    onClick={() => { setSegment(s.key); setResult(null); setConfirm(false); }}
                  >
                    <span className="seg-icon">{s.icon}</span>
                    <div className="seg-info">
                      <div className="seg-label">{s.label}</div>
                      <div className="seg-desc">{s.desc}</div>
                    </div>
                    <span className="seg-count">
                      {segLoading ? '...' : c !== undefined ? c : '--'}
                    </span>
                  </div>
                );
              })}
            </div>

            {segment === 'per_event' && (
              <div className="event-picker">
                <label className="field-label">Select Event</label>
                {segLoading ? (
                  <div className="skel" style={{ height: 44, borderRadius: 8 }} />
                ) : !segData?.events?.length ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, margin: 0 }}>No events found.</p>
                ) : (
                  <select
                    className="select-field"
                    value={selEvent}
                    onChange={e => { setSelEvent(e.target.value); setResult(null); setConfirm(false); }}
                  >
                    <option value="" disabled>-- Choose an event --</option>
                    {segData.events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name} ({ev.count} attendee{ev.count !== 1 ? 's' : ''})</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Choose Template */}
          <div className="section-card">
            <div className="section-title">2. Choose Template</div>
            <div className="section-sub">Pick a template style for your email.</div>

            <div className="tpl-grid">
              {TEMPLATES.map(t => (
                <div
                  key={t.key}
                  className={`tpl-card ${template === t.key ? 'selected' : ''}`}
                  onClick={() => handleTemplateChange(t.key)}
                >
                  <span className="tpl-icon">{t.icon}</span>
                  <div className="tpl-label">{t.label}</div>
                  <div className="tpl-desc">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Customize */}
          <div className="section-card">
            <div className="section-title">3. Customize &amp; Compose</div>
            <div className="section-sub">Personalize your email. All fields below are included in the template.</div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--green-dim)', border: '1.5px solid var(--green)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'var(--green)', lineHeight: 1.5, fontWeight: 500 }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>i</span>
              <span><strong>Marketing consent is enforced automatically.</strong> Only attendees who opted in to promotional communications at checkout will receive this email. Unsubscribed recipients are also excluded.</span>
            </div>

            {template !== 'plain' && (
              <>
                {/* Logo URL */}
                <label className="field-label">Logo URL (optional)</label>
                <input
                  type="url"
                  className="compose-input"
                  placeholder="https://example.com/your-logo.png"
                  value={logoUrl}
                  onChange={e => { setLogoUrl(e.target.value); setPreviewHtml(''); }}
                  disabled={sending}
                />

                {/* Primary Color */}
                <label className="field-label">Accent Color</label>
                <div className="color-row">
                  <input
                    type="color"
                    className="color-picker"
                    value={primaryColor}
                    onChange={e => { setColor(e.target.value); setPreviewHtml(''); }}
                    disabled={sending}
                  />
                  <span className="color-hex">{primaryColor}</span>
                </div>
              </>
            )}

            <label className="field-label">Subject Line</label>
            <input
              type="text"
              className="compose-input"
              placeholder="e.g. Exciting news from Trackage Scheme!"
              value={subject}
              onChange={e => { setSubject(e.target.value); setResult(null); setConfirm(false); setPreviewHtml(''); }}
              disabled={sending}
            />

            <label className="field-label">Message</label>
            <textarea
              className="compose-textarea"
              placeholder="Write your message here..."
              value={message}
              onChange={e => { setMessage(e.target.value); setResult(null); setConfirm(false); setPreviewHtml(''); }}
              disabled={sending}
            />

            {template !== 'plain' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="field-label">Button Text (optional)</label>
                    <input
                      type="text"
                      className="compose-input"
                      placeholder="e.g. Get Tickets"
                      value={ctaText}
                      onChange={e => { setCtaText(e.target.value); setPreviewHtml(''); }}
                      disabled={sending}
                    />
                  </div>
                  <div>
                    <label className="field-label">Button URL</label>
                    <input
                      type="url"
                      className="compose-input"
                      placeholder="https://shop.trackagescheme.com/events/..."
                      value={ctaUrl}
                      onChange={e => { setCtaUrl(e.target.value); setPreviewHtml(''); }}
                      disabled={sending}
                    />
                  </div>
                </div>

                <label className="field-label">Footer Text (optional)</label>
                <input
                  type="text"
                  className="compose-input"
                  placeholder="e.g. See you there!"
                  value={footerText}
                  onChange={e => { setFooterText(e.target.value); setPreviewHtml(''); }}
                  disabled={sending}
                />
              </>
            )}

            {/* Preview */}
            {template !== 'plain' && (
              <div style={{ marginBottom: 16 }}>
                <button className="btn-preview" onClick={handlePreview} disabled={previewing || !subject.trim()}>
                  {previewing ? 'Loading preview...' : 'Preview Email'}
                </button>
              </div>
            )}

            {previewHtml && (
              <div style={{ marginBottom: 20 }}>
                <label className="field-label" style={{ marginBottom: 10 }}>Email Preview</label>
                <iframe
                  ref={previewRef}
                  srcDoc={previewHtml}
                  className="preview-frame"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  onLoad={() => {
                    if (previewRef.current) {
                      const doc = previewRef.current.contentDocument;
                      if (doc?.body) previewRef.current.style.height = (doc.body.scrollHeight + 40) + 'px';
                    }
                  }}
                />
              </div>
            )}

            <div className="email-footer">
              <div className="recipient-hint">
                {count === null
                  ? 'Loading recipients...'
                  : count === 0
                  ? 'No recipients in this segment'
                  : <><span className="recipient-count">{count}</span> recipient{count !== 1 ? 's' : ''} will receive this email</>
                }
              </div>

              {confirm && !sending ? (
                <div className="confirm-row">
                  <span className="confirm-warn">Send to {count} people?</span>
                  <button className="btn-send" onClick={handleSend}>Confirm Send</button>
                  <button className="btn-cancel" onClick={() => setConfirm(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn-send" onClick={handleSend} disabled={!canSend}>
                  {sending ? 'Sending...' : `Send to ${count ?? 0} Recipient${count !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── CAMPAIGNS TAB ─── */}
      {tab === 'campaigns' && (
        <>
          <div className="section-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="section-title">Campaign History</div>
                <div className="section-sub" style={{ marginBottom: 0 }}>Track opens, clicks, and conversions from your email campaigns.</div>
              </div>
              <button className="btn-preview" onClick={loadCampaigns} disabled={campLoading}>
                {campLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {campLoading && !campaigns ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3].map(i => <div key={i} className="skel" style={{ height: 48 }} />)}
              </div>
            ) : !campaigns?.length ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
                No campaigns sent yet. Go to "Email Guests" to send your first campaign.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="campaign-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Segment</th>
                      <th>Date</th>
                      <th>Sent</th>
                      <th>Opened</th>
                      <th>Clicked</th>
                      <th>Converted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.subject}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {TEMPLATES.find(t => t.key === c.template)?.label || c.template}
                            {c.event_name ? ` · ${c.event_name}` : ''}
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{c.segment?.replace('_', ' ')}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString('en-MT', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td><span className="stat-pill stat-sent">{c.sent_count}</span></td>
                        <td><span className="stat-pill stat-opened">{c.opened_count} ({c.open_rate}%)</span></td>
                        <td><span className="stat-pill stat-clicked">{c.clicked_count} ({c.click_rate}%)</span></td>
                        <td><span className="stat-pill stat-conv">{c.converted_count} ({c.conv_rate}%)</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
