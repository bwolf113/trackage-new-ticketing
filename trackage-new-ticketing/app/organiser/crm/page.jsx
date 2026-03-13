/* app/organiser/crm/page.jsx — CRM: Reports + Email Guests */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
    return <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af', fontSize: 14 }}>No data for this period.</div>;
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
      {yT.map((t, i) => <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#f3f4f6" strokeWidth="1" />)}
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={xOf(i)} cy={yOf(d[valueKey] || 0)} r="3.5" fill={color} />)}
      {yT.map((t, i) => <text key={i} x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Inter,sans-serif">{formatY(t.v)}</text>)}
      {xI.map(i => <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="Inter,sans-serif">{fmtDay(data[i].date)}</text>)}
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

const CSS = `
.crm-tabs { display: flex; gap: 4px; background: #f3f4f6; border-radius: 10px; padding: 4px; margin-bottom: 28px; width: fit-content; }
.crm-tab { padding: 8px 20px; border-radius: 8px; border: none; background: transparent; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; color: var(--text-mid); cursor: pointer; transition: all 0.15s; }
.crm-tab.active { background: #fff; color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.period-bar { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
.period-btn { padding: 7px 14px; border: 1.5px solid var(--border); border-radius: 8px; background: #fff; font-size: 12px; font-weight: 600; font-family: 'Inter', sans-serif; color: var(--text-mid); cursor: pointer; transition: all 0.15s; }
.period-btn.active { border-color: var(--accent); color: var(--accent); background: #f0fdf9; }
.date-range { display: flex; gap: 8px; align-items: center; }
.date-input { padding: 7px 10px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 12px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff; outline: none; }
.date-input:focus { border-color: var(--accent); }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
.tile { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; }
.tile-label { font-size: 11px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.tile-value { font-size: 28px; font-weight: 700; line-height: 1; color: var(--text); }
.tile-value.green  { color: #0a9e7f; }
.tile-value.blue   { color: #3b82f6; }
.tile-value.purple { color: #8b5cf6; }
.chart-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
.chart-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 16px; }
.chart-wrap { width: 100%; overflow-x: auto; }
.ev-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ev-table th { text-align: left; font-size: 11px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px; border-bottom: 1px solid var(--border); }
.ev-table th:not(:first-child) { text-align: right; }
.ev-table td { padding: 11px 12px; border-bottom: 1px solid #f3f4f6; color: var(--text); }
.ev-table td:not(:first-child) { text-align: right; color: var(--text-mid); }
.ev-table td:last-child { font-weight: 600; color: var(--text); }
.ev-table tr:last-child td { border-bottom: none; }
.section-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 20px; }
.section-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.section-sub { font-size: 13px; color: var(--text-mid); margin-bottom: 22px; line-height: 1.5; }
.seg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.seg-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: #fff; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.seg-card:hover { border-color: #a7f3d0; }
.seg-card.selected { border-color: var(--accent); background: #f0fdf9; }
.seg-icon { font-size: 22px; flex-shrink: 0; line-height: 1; margin-top: 1px; }
.seg-info { flex: 1; min-width: 0; }
.seg-label { font-size: 13px; font-weight: 600; color: var(--text); }
.seg-desc { font-size: 11px; color: var(--text-mid); margin-top: 2px; line-height: 1.4; }
.seg-count { flex-shrink: 0; font-size: 12px; font-weight: 700; color: var(--accent); background: #e6faf5; border-radius: 20px; padding: 2px 10px; align-self: center; white-space: nowrap; }
.event-picker { margin-bottom: 20px; }
.field-label { font-size: 11px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px; }
.select-field { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 12px center; outline: none; cursor: pointer; appearance: none; padding-right: 32px; }
.select-field:focus { border-color: var(--accent); }
.select-field:disabled { opacity: 0.5; cursor: not-allowed; }
.compose-input { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff; outline: none; box-sizing: border-box; margin-bottom: 16px; }
.compose-input:focus { border-color: var(--accent); }
.compose-textarea { width: 100%; padding: 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff; outline: none; box-sizing: border-box; resize: vertical; min-height: 150px; line-height: 1.6; margin-bottom: 16px; }
.compose-textarea:focus { border-color: var(--accent); }
.email-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); }
.recipient-hint { font-size: 13px; color: var(--text-mid); }
.recipient-count { font-weight: 700; color: var(--accent); }
.btn-send { display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; background: var(--accent); color: #fff; border: none; border-radius: 9px; font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; transition: background 0.15s; }
.btn-send:hover { background: var(--accent-dark); }
.btn-send:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel { padding: 11px 16px; background: none; border: 1.5px solid var(--border); border-radius: 9px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; color: var(--text-mid); transition: all 0.15s; }
.btn-cancel:hover { border-color: #9ca3af; color: var(--text); }
.confirm-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.confirm-warn { font-size: 13px; color: #b45309; font-weight: 600; }
.result-banner { border-radius: 10px; padding: 14px 18px; font-size: 14px; font-weight: 500; margin-bottom: 20px; }
.result-banner.success { background: #f0fdf9; border: 1px solid #a7f3d0; color: #065f46; }
.result-banner.error   { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.skel { border-radius: 6px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media(max-width:640px) { .tiles { grid-template-columns: 1fr 1fr; } .seg-grid { grid-template-columns: 1fr; } .date-range { flex-wrap: wrap; } }
@media(max-width:480px) { .tiles { grid-template-columns: 1fr; } }
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
  const [segment,    setSegment]   = useState('all');
  const [selEvent,   setSelEvent]  = useState('');
  const [subject,    setSubject]   = useState('');
  const [message,    setMessage]   = useState('');
  const [segData,    setSegData]   = useState(null);
  const [segLoading, setSegLoad]   = useState(false);
  const [sending,    setSending]   = useState(false);
  const [sendResult, setResult]    = useState(null);
  const [confirm,    setConfirm]   = useState(false);

  const loadReports = useCallback(async (p, cf, ct) => {
    const orgId = localStorage.getItem('organiser_id');
    if (!orgId) { router.push('/organiser/login'); return; }
    setRLoading(true);
    const { from, to } = getPeriodDates(p ?? 'month', cf ?? '', ct ?? '');
    const params = new URLSearchParams({ organiser_id: orgId });
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    const res  = await fetch(`/api/organiser/crm/reports?${params}`).catch(() => null);
    const json = res ? await res.json() : {};
    setReports(json);
    setRLoading(false);
  }, [router]);

  const loadSegments = useCallback(async () => {
    const orgId = localStorage.getItem('organiser_id');
    if (!orgId) return;
    setSegLoad(true);
    const res  = await fetch(`/api/organiser/crm/segments?organiser_id=${orgId}`).catch(() => null);
    const json = res ? await res.json() : {};
    setSegData(json);
    setSelEvent('');
    setSegLoad(false);
  }, []);

  useEffect(() => {
    const orgId = localStorage.getItem('organiser_id');
    if (!orgId) { router.push('/organiser/login'); return; }
    loadReports(period, customFrom, customTo);
  }, []);

  useEffect(() => {
    if (tab === 'email' && !segData) loadSegments();
  }, [tab]);

  function handlePeriod(p) {
    setPeriod(p);
    if (p !== 'custom') loadReports(p, customFrom, customTo);
  }

  function handleCustomApply() {
    if (customFrom && customTo) loadReports('custom', customFrom, customTo);
  }

  async function handleSend() {
    if (!confirm) { setConfirm(true); return; }
    const orgId = localStorage.getItem('organiser_id');
    setSending(true);
    setResult(null);
    setConfirm(false);
    try {
      const res  = await fetch('/api/organiser/crm/send-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          organiser_id: orgId,
          segment,
          event_id: segment === 'per_event' ? selEvent : undefined,
          subject,
          message,
        }),
      });
      setResult(await res.json());
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
                <span style={{ color: 'var(--text-mid)', fontSize: 12 }}>to</span>
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
              {rLoading ? <div className="skel" style={{ height: 160 }} /> : <AreaChart data={daily} valueKey="revenue" color="#0a9e7f" formatY={v => `€${Math.round(v)}`} />}
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
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af', fontSize: 14 }}>No paid orders in this period.</div>
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
                : `✓ Sent to ${sendResult.sent} of ${sendResult.total} recipients${sendResult.failed ? ` (${sendResult.failed} failed)` : ''}.`
              }
            </div>
          )}

          {/* Segment selection */}
          <div className="section-card">
            <div className="section-title">Select Audience</div>
            <div className="section-sub">Choose which segment of your attendees to email. Recipient counts are shown on each card.</div>

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
                      {segLoading ? '…' : c !== undefined ? c : '—'}
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
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>No events found.</p>
                ) : (
                  <select
                    className="select-field"
                    value={selEvent}
                    onChange={e => { setSelEvent(e.target.value); setResult(null); setConfirm(false); }}
                  >
                    <option value="" disabled>— Choose an event —</option>
                    {segData.events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name} ({ev.count} attendee{ev.count !== 1 ? 's' : ''})</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Compose */}
          <div className="section-card">
            <div className="section-title">Compose Email</div>
            <div className="section-sub">Write your message. Every recipient in the selected segment will receive the same email.</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f0fdf9', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#065f46', lineHeight: 1.5 }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
              <span><strong>Marketing consent is enforced automatically.</strong> Only attendees who opted in to promotional communications at checkout will receive this email. Those who did not consent are excluded from all segments.</span>
            </div>

            <label className="field-label">Subject Line</label>
            <input
              type="text"
              className="compose-input"
              placeholder="e.g. Exciting news from Trackage Scheme!"
              value={subject}
              onChange={e => { setSubject(e.target.value); setResult(null); setConfirm(false); }}
              disabled={sending}
            />

            <label className="field-label">Message</label>
            <textarea
              className="compose-textarea"
              placeholder="Write your message here..."
              value={message}
              onChange={e => { setMessage(e.target.value); setResult(null); setConfirm(false); }}
              disabled={sending}
            />

            <div className="email-footer">
              <div className="recipient-hint">
                {count === null
                  ? 'Loading recipients…'
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
                  {sending ? 'Sending…' : `Send to ${count ?? 0} Recipient${count !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
