/* app/admin/reports/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { adminFetch } from '../../../lib/adminFetch';
import { isSampleMode, setSampleMode, getSampleKpis, getSampleOrganisers, getSampleEvents } from '../../../lib/sampleData';

/* ─── helpers ─────────────────────────────────────────────────────── */
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
const MT = { timeZone: 'Europe/Malta' };
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric', ...MT });
}
function getRange(key, cs, ce) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const map = {
    this_month:   [new Date(y, m, 1),       new Date(y, m+1, 0, 23,59,59)],
    last_month:   [new Date(y, m-1, 1),     new Date(y, m, 0, 23,59,59)],
    this_quarter: [new Date(y, Math.floor(m/3)*3, 1), new Date(y, Math.floor(m/3)*3+3, 0, 23,59,59)],
    last_quarter: [new Date(y, Math.floor(m/3)*3-3, 1), new Date(y, Math.floor(m/3)*3, 0, 23,59,59)],
    this_year:    [new Date(y, 0, 1),       new Date(y, 11, 31, 23,59,59)],
    last_year:    [new Date(y-1, 0, 1),     new Date(y-1, 11, 31, 23,59,59)],
    all_time:     [new Date('2000-01-01'),   new Date(y+1, 0, 1)],
    custom:       [
      cs ? new Date(cs) : new Date(y, m, 1),
      ce ? new Date(new Date(ce).setHours(23,59,59)) : new Date(y, m+1, 0, 23,59,59)
    ],
  };
  const [s, e] = map[key] || map.this_month;
  return { start: s.toISOString(), end: e.toISOString() };
}
function pctChange(cur, prev) {
  if (prev == null || prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}
function fmtPct(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

/* ─── styles ──────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F6FA;--surface:#FFFFFF;--border:#EBEDF0;
  --muted:#767C8C;--green:#48C16E;--green-dim:rgba(72,193,110,0.12);
  --black:#000000;--white:#FFFFFF;
  --danger:#ef4444;--danger-bg:rgba(239,68,68,0.1);
  --blue:#3b82f6;--blue-bg:#eff6ff;
  --purple:#7c3aed;--purple-bg:#ede9fe;
}
body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--black);background:var(--bg)}

/* page header */
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px}
.page-title{font-size:24px;font-weight:800;letter-spacing:-0.02em}
.page-sub{font-size:14px;color:var(--muted);margin-top:2px;font-weight:500}

/* period blocks */
.period-block{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:16px 20px;margin-bottom:20px}
.period-block-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:10px}
.filter-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.filter-btn{background:var(--surface);border:1.5px solid var(--border);color:var(--muted);padding:7px 13px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;white-space:nowrap}
.filter-btn:hover{border-color:var(--black);color:var(--black)}
.filter-btn.active{background:var(--black);border-color:var(--black);color:var(--white);font-weight:700}
.date-input{border:1.5px solid var(--border);border-radius:8px;padding:7px 12px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;color:var(--black);background:var(--surface);outline:none}
.date-input:focus{border-color:var(--black)}

/* compare toggle */
.compare-toggle{display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.toggle-label{font-size:13px;font-weight:600;color:var(--muted)}
.toggle-switch{position:relative;width:40px;height:22px;flex-shrink:0}
.toggle-switch input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;inset:0;background:#d1d5db;border-radius:22px;cursor:pointer;transition:background 0.2s}
.toggle-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:white;border-radius:50%;transition:transform 0.2s}
.toggle-switch input:checked + .toggle-slider{background:var(--black)}
.toggle-switch input:checked + .toggle-slider:before{transform:translateX(18px)}
.compare-badge{background:var(--green-dim);border:1px solid var(--green);color:var(--green);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700}

/* two period layout */
.periods-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.period-card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:14px 18px}
.period-card.primary{border-color:var(--black)}
.period-card.secondary{border-color:#94a3b8}
.period-card-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px}
.period-card.primary .period-card-label{color:var(--black)}
.period-card.secondary .period-card-label{color:#64748b}

/* kpi grid */
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:28px}
.kpi-card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:18px 20px}
.kpi-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;margin-bottom:12px}
.kpi-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px}
.kpi-value{font-size:26px;font-weight:700;line-height:1;margin-bottom:4px}
.kpi-sub{font-size:12px;color:var(--muted);font-weight:500}
.kpi-compare{margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px}
.kpi-prev{font-size:12px;color:var(--muted)}
.kpi-change{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;padding:2px 7px;border-radius:100px}
.kpi-change.up{background:var(--green-dim);color:var(--green)}
.kpi-change.down{background:var(--danger-bg);color:var(--danger)}
.kpi-change.flat{background:rgba(0,0,0,0.06);color:var(--muted)}

/* section */
.section{margin-bottom:28px}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.section-title{font-size:15px;font-weight:700;letter-spacing:-0.01em;color:var(--black)}
.section-sub{font-size:13px;color:var(--muted);font-weight:500}

/* card */
.card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;overflow:hidden}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}

/* table */
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse}
thead th{background:var(--bg);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);padding:11px 16px;text-align:left;border-bottom:1.5px solid var(--border);white-space:nowrap}
tbody tr{transition:background 0.1s}
tbody tr:hover{background:var(--bg)}
tbody td{padding:13px 16px;font-size:14px;color:var(--black);border-top:1px solid var(--border);font-weight:500}
.rank{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;font-size:12px;font-weight:700}
.r1{background:#fef9c3;color:#854d0e}.r2{background:#f1f5f9;color:#475569}.r3{background:#fef3c7;color:#92400e}.rn{background:var(--bg);color:var(--muted);border:1px solid var(--border)}

/* highlights */
.highlight-card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:18px 20px}
.hl-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;margin-bottom:10px}
.tag-top{background:var(--green-dim);color:var(--green)}.tag-bot{background:var(--danger-bg);color:var(--danger)}
.hl-name{font-size:17px;font-weight:700;margin-bottom:4px;color:var(--black)}.hl-stat{font-size:13px;color:var(--muted);font-weight:500}

/* bar chart */
.bar-chart{padding:20px}
.bar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.bar-row:last-child{margin-bottom:0}
.bar-label{font-size:12px;font-weight:500;color:var(--muted);width:80px;flex-shrink:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{flex:1;height:20px;background:var(--bg);border-radius:4px;overflow:hidden;border:1px solid var(--border)}
.bar-fill{height:100%;border-radius:4px;transition:width 0.6s ease;display:flex;align-items:center;padding-left:8px}
.bar-val{font-size:11px;font-weight:700;color:var(--white);white-space:nowrap}

/* event status */
.evt-status{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px}
.evt-upcoming{background:var(--blue-bg);color:var(--blue)}.evt-past{background:rgba(0,0,0,0.06);color:var(--muted)}.evt-ongoing{background:var(--green-dim);color:var(--green)}

/* breakdown */
.breakdown-row{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);font-size:14px}
.breakdown-row:last-child{border-bottom:none}
.breakdown-label{color:var(--muted);font-weight:500}.breakdown-value{font-weight:700;color:var(--black)}

/* empty / skeleton */
.empty{text-align:center;padding:56px 20px;color:var(--muted);font-size:14px;font-weight:500}.empty-icon{font-size:36px;margin-bottom:10px}
.skel{background:linear-gradient(90deg,var(--border) 25%,var(--bg) 50%,var(--border) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

.btn-outline{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1.5px solid var(--border);color:var(--muted);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s}
.btn-outline:hover{border-color:var(--black);color:var(--black)}

/* sample banner */
.sample-banner{display:flex;align-items:center;justify-content:space-between;background:#fef9c3;border:1.5px solid #fde047;border-radius:10px;padding:11px 16px;margin-bottom:20px;flex-wrap:wrap;gap:10px}
.sample-banner-left{display:flex;align-items:center;gap:10px}
.sample-banner-title{font-size:13px;font-weight:700;color:#713f12}
.sample-banner-sub{font-size:12px;color:#92400e;margin-top:1px}
.sample-toggle-wrap{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer}
.sample-toggle-track{position:relative;width:44px;height:24px;background:#d1d5db;border-radius:24px;cursor:pointer;transition:background 0.2s}
.sample-toggle-track.on{background:#f59e0b}
.sample-toggle-thumb{position:absolute;width:18px;height:18px;top:3px;left:3px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.sample-toggle-track.on .sample-toggle-thumb{transform:translateX(20px)}
.sample-label-off{color:#6b7280}.sample-label-on{color:#92400e;font-weight:700}

@media(max-width:768px){.two-col{grid-template-columns:1fr}.kpi-grid{grid-template-columns:repeat(2,1fr)}.periods-row{grid-template-columns:1fr}}
@media print{.filter-bar,.btn-outline,.compare-toggle,.period-block,.periods-row,.page-header button,.sample-banner{display:none!important}}
`;

const PERIODS = [
  { key: 'this_month',   label: 'This month' },
  { key: 'last_month',   label: 'Last month' },
  { key: 'this_quarter', label: 'This quarter' },
  { key: 'last_quarter', label: 'Last quarter' },
  { key: 'this_year',    label: 'This year' },
  { key: 'last_year',    label: 'Last year' },
  { key: 'all_time',     label: 'All time' },
  { key: 'custom',       label: 'Custom' },
];

async function fetchReport(start, end, compStart, compEnd) {
  const res = await adminFetch('/api/admin/reports', {
    method: 'POST',
    body: JSON.stringify({ start, end, compStart, compEnd }),
  });
  return res.json();
}

/* ─── component ───────────────────────────────────────────────────── */
export default function ReportsPage() {
  // Primary period
  const [period,  setPeriod]  = useState('this_month');
  const [primCS,  setPrimCS]  = useState('');
  const [primCE,  setPrimCE]  = useState('');

  // Compare period
  const [comparing,  setComparing]  = useState(false);
  const [compPeriod, setCompPeriod] = useState('last_month');
  const [compCS,     setCompCS]     = useState('');
  const [compCE,     setCompCE]     = useState('');

  const [loading,  setLoading]  = useState(true);
  const [kpis,     setKpis]     = useState(null);
  const [prevKpis, setPrevKpis] = useState(null);
  const [orgRanking, setOrgRanking] = useState([]);
  const [eventPerf,  setEventPerf]  = useState([]);
  const [revBreak,   setRevBreak]   = useState(null);
  const [sampleMode, setSampleModeState] = useState(false);

  useEffect(() => { setSampleModeState(isSampleMode()); }, []);
  useEffect(() => { loadReport(); }, [period, primCS, primCE, comparing, compPeriod, compCS, compCE, sampleMode]);

  function toggleSample() {
    const next = !sampleMode;
    setSampleMode(next);
    setSampleModeState(next);
  }

  async function loadReport() {
    setLoading(true);
    try {
      const { start, end } = getRange(period, primCS, primCE);

      if (isSampleMode()) {
        // ── Sample data path ──
        const { kpis: k, orgRanking: orgs, eventPerf: evts } = getSampleKpis(start, end);
        setKpis(k);
        setRevBreak({ grossRevenue: k.totalRevenue, bookingFees: k.totalBookingFees, stripeFees: k.totalStripeFees, organiserPayout: k.totalRevenue - k.totalBookingFees - k.totalStripeFees, platformNet: k.totalBookingFees });
        setOrgRanking(orgs);
        setEventPerf(evts);

        if (comparing) {
          const comp = getRange(compPeriod, compCS, compCE);
          const { kpis: pk } = getSampleKpis(comp.start, comp.end);
          setPrevKpis(pk);
        } else { setPrevKpis(null); }
        setLoading(false); return;
      }

      // ── Real data path (via admin API) ──
      const compRange = comparing ? getRange(compPeriod, compCS, compCE) : {};
      const data = await fetchReport(start, end, compRange.start, compRange.end);

      setKpis(data.kpis);
      setRevBreak({
        grossRevenue:    data.kpis.totalRevenue,
        bookingFees:     data.kpis.totalBookingFees,
        stripeFees:      data.kpis.totalStripeFees,
        organiserPayout: data.kpis.totalRevenue - data.kpis.totalBookingFees - data.kpis.totalStripeFees,
        platformNet:     data.kpis.totalBookingFees,
      });
      setOrgRanking(data.orgRanking || []);
      setEventPerf(data.eventPerf || []);
      setPrevKpis(data.prevKpis || null);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  function handleExportCSV() {
    if (!orgRanking.length) return;
    const rows = [['Rank','Organiser','Orders','Gross (€)','Ticket Value (€)','Booking Fee (€)','Stripe Fee (€)','Payout (€)'], ...orgRanking.map((o,i) => [i+1, o.name, o.orders, o.revenue.toFixed(2), o.ticketFaceValue.toFixed(2), o.bookingFees.toFixed(2), o.stripeFees.toFixed(2), o.payout.toFixed(2)])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `trackage-report-${period}.csv`; a.click();
  }

  const top = orgRanking[0];
  const bottom = orgRanking[orgRanking.length - 1];
  const maxRev = orgRanking[0]?.revenue || 1;

  function periodLabel(key, cs, ce) {
    if (key === 'custom') return `${cs || '?'} → ${ce || '?'}`;
    return PERIODS.find(p => p.key === key)?.label || key;
  }

  function KpiCard({ label, value, prevValue, prevRaw, curRaw, sub, icon, iconBg, iconColor }) {
    const change = (comparing && prevRaw != null && curRaw != null) ? pctChange(curRaw, prevRaw) : null;
    return (
      <div className="kpi-card">
        <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
        <div className="kpi-label">{label}</div>
        {loading
          ? <div className="skel" style={{ height: 28, width: 100, marginBottom: 4 }} />
          : <div className="kpi-value" style={{ color: 'var(--black)' }}>{value}</div>
        }
        {!loading && <div className="kpi-sub">{sub}</div>}
        {!loading && comparing && prevValue != null && (
          <div className="kpi-compare">
            <span className="kpi-prev">vs {prevValue}</span>
            {change !== null && !isNaN(change) && (
              <span className={`kpi-change ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`}>
                {change > 0 ? '▲' : change < 0 ? '▼' : '–'} {fmtPct(change)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  function eventStatus(e) {
    if (e.status === 'sample') return <span className="evt-status evt-past" style={{background:'#fef9c3',color:'#92400e',border:'1px solid #fde047'}}>Sample</span>;
    const now = new Date(), start = new Date(e.start_time), end = e.end_time ? new Date(e.end_time) : null;
    if (start > now) return <span className="evt-status evt-upcoming">Upcoming</span>;
    if (end && end > now) return <span className="evt-status evt-ongoing">Ongoing</span>;
    return <span className="evt-status evt-past">Past</span>;
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Reports & Analytics</div>
          <div className="page-sub">Sales performance across all events and organisers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={handleExportCSV}>⬇ Export CSV</button>
          <button className="btn-outline" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      {/* ── Primary period selector ── */}
      <div className="period-block">
        <div className="period-block-title">📅 Reporting Period</div>
        <div className="filter-bar">
          {PERIODS.map(p => (
            <button key={p.key} className={`filter-btn ${period === p.key ? 'active' : ''}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
          ))}
          {period === 'custom' && (
            <>
              <input type="date" className="date-input" value={primCS} onChange={e => setPrimCS(e.target.value)} />
              <span style={{ color: 'var(--muted)' }}>→</span>
              <input type="date" className="date-input" value={primCE} onChange={e => setPrimCE(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {/* ── Compare toggle ── */}
      <div className="compare-toggle">
        <span className="toggle-label">Compare to another period</span>
        <label className="toggle-switch">
          <input type="checkbox" checked={comparing} onChange={e => setComparing(e.target.checked)} />
          <span className="toggle-slider" />
        </label>
        {comparing && (
          <span className="compare-badge">
            Comparing: <strong>{periodLabel(period, primCS, primCE)}</strong> vs <strong>{periodLabel(compPeriod, compCS, compCE)}</strong>
          </span>
        )}
      </div>

      {/* ── Comparison period selector ── */}
      {comparing && (
        <div className="period-block" style={{ borderColor: '#94a3b8' }}>
          <div className="period-block-title" style={{ color: '#64748b' }}>📊 Compare To</div>
          <div className="filter-bar">
            {PERIODS.filter(p => p.key !== 'all_time').map(p => (
              <button key={p.key} className={`filter-btn ${compPeriod === p.key ? 'active' : ''}`}
                style={compPeriod === p.key ? { background: '#64748b', borderColor: '#64748b' } : {}}
                onClick={() => setCompPeriod(p.key)}>{p.label}</button>
            ))}
            {compPeriod === 'custom' && (
              <>
                <input type="date" className="date-input" value={compCS} onChange={e => setCompCS(e.target.value)} />
                <span style={{ color: 'var(--muted)' }}>→</span>
                <input type="date" className="date-input" value={compCE} onChange={e => setCompCE(e.target.value)} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Period summary labels ── */}
      {comparing && (
        <div className="periods-row">
          <div className="period-card primary">
            <div className="period-card-label">Primary Period</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{periodLabel(period, primCS, primCE)}</div>
          </div>
          <div className="period-card secondary">
            <div className="period-card-label">Comparison Period</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>{periodLabel(compPeriod, compCS, compCE)}</div>
          </div>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="kpi-grid">
        <KpiCard label="Gross Revenue" icon="€" iconBg="var(--green-dim)" iconColor="var(--green)"
          value={loading ? '—' : fmt(kpis?.totalRevenue)}
          prevValue={prevKpis ? fmt(prevKpis.totalRevenue) : null}
          curRaw={kpis?.totalRevenue} prevRaw={prevKpis?.totalRevenue}
          sub={`${kpis?.orderCount || 0} completed orders`} />
        <KpiCard label="Tickets Sold" icon="🎫" iconBg="var(--blue-bg)" iconColor="var(--blue)"
          value={loading ? '—' : (kpis?.ticketCount || 0).toLocaleString()}
          prevValue={prevKpis ? prevKpis.ticketCount.toLocaleString() : null}
          curRaw={kpis?.ticketCount} prevRaw={prevKpis?.ticketCount}
          sub="across all events" />
        <KpiCard label="Booking Fees Earned" icon="💰" iconBg="var(--green-dim)" iconColor="var(--green)"
          value={loading ? '—' : fmt(kpis?.totalBookingFees)}
          prevValue={prevKpis ? fmt(prevKpis.totalBookingFees) : null}
          curRaw={kpis?.totalBookingFees} prevRaw={prevKpis?.totalBookingFees}
          sub="platform commission" />
        <KpiCard label="Stripe Fees" icon="💳" iconBg="var(--purple-bg)" iconColor="var(--purple)"
          value={loading ? '—' : fmt(kpis?.totalStripeFees)}
          prevValue={prevKpis ? fmt(prevKpis.totalStripeFees) : null}
          curRaw={kpis?.totalStripeFees} prevRaw={prevKpis?.totalStripeFees}
          sub="actual processing fees" />
        <KpiCard label="Total Orders" icon="📋" iconBg="rgba(0,0,0,0.06)" iconColor="var(--muted)"
          value={loading ? '—' : (kpis?.orderCount || 0).toLocaleString()}
          prevValue={prevKpis ? prevKpis.orderCount.toLocaleString() : null}
          curRaw={kpis?.orderCount} prevRaw={prevKpis?.orderCount}
          sub="completed transactions" />
      </div>

      {/* ── Revenue breakdown + highlights ── */}
      {!loading && kpis && (
        <div className="two-col">
          <div className="section">
            <div className="section-header"><div className="section-title">Revenue Breakdown</div></div>
            <div className="card">
              <div className="breakdown-row"><span className="breakdown-label">Gross Revenue</span><span className="breakdown-value">{fmt(revBreak?.grossRevenue)}</span></div>
              <div className="breakdown-row"><span className="breakdown-label">Ticket Face Value</span><span className="breakdown-value">{fmt((revBreak?.grossRevenue || 0) - (revBreak?.bookingFees || 0))}</span></div>
              <div className="breakdown-row"><span className="breakdown-label">Booking Fees (you keep)</span><span className="breakdown-value" style={{color:'var(--green)'}}>+{fmt(revBreak?.bookingFees)}</span></div>
              <div className="breakdown-row"><span className="breakdown-label">Stripe Fees (organiser cost)</span><span className="breakdown-value" style={{color:'var(--danger)'}}>−{fmt(revBreak?.stripeFees)}</span></div>
              <div className="breakdown-row"><span className="breakdown-label">Organiser Payout</span><span className="breakdown-value">{fmt(revBreak?.organiserPayout)}</span></div>
              <div className="breakdown-row" style={{borderTop:'2px solid var(--border)',background:'var(--bg)'}}>
                <span className="breakdown-label" style={{fontWeight:700,color:'var(--black)'}}>Platform Net</span>
                <span className="breakdown-value" style={{fontSize:16,color:'var(--green)'}}>{fmt(revBreak?.platformNet)}</span>
              </div>
            </div>
          </div>
          <div className="section">
            <div className="section-header"><div className="section-title">Organiser Highlights</div></div>
            {orgRanking.length >= 2 ? (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div className="highlight-card"><span className="hl-tag tag-top">⬆ Top performer</span><div className="hl-name">{top?.name}</div><div className="hl-stat">{top?.orders} orders · {fmt(top?.revenue)}</div></div>
                <div className="highlight-card"><span className="hl-tag tag-bot">⬇ Lowest sales</span><div className="hl-name">{bottom?.name}</div><div className="hl-stat">{bottom?.orders} orders · {fmt(bottom?.revenue)}</div></div>
              </div>
            ) : (
              <div className="card"><div className="empty"><div className="empty-icon">👤</div><div>Not enough data for this period.</div></div></div>
            )}
          </div>
        </div>
      )}

      {/* ── Bar chart ── */}
      {!loading && orgRanking.length > 0 && (
        <div className="section">
          <div className="section-header"><div className="section-title">Revenue by Organiser</div><div className="section-sub">Top {Math.min(orgRanking.length,10)}</div></div>
          <div className="card">
            <div className="bar-chart">
              {orgRanking.slice(0,10).map((org,i) => {
                const colors=['#0a9e7f','#3b82f6','#7c3aed','#f59e0b','#ef4444','#06b6d4','#84cc16','#ec4899','#f97316','#6366f1'];
                return (
                  <div key={org.id} className="bar-row">
                    <div className="bar-label" title={org.name}>{org.name}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{width:`${Math.max(4,(org.revenue/maxRev)*100)}%`,background:colors[i%colors.length]}}>
                        <span className="bar-val">{fmt(org.revenue)} (Tickets: {fmt(org.ticketFaceValue)} · Fees: {fmt(org.bookingFees)})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Organiser rankings table ── */}
      <div className="section">
        <div className="section-header"><div className="section-title">Organiser Settlements</div><button className="btn-outline" onClick={handleExportCSV}>⬇ Export CSV</button></div>
        <div className="card">
          {loading ? (
            <div style={{padding:24,display:'flex',flexDirection:'column',gap:10}}>{[1,2,3,4].map(i=><div key={i} className="skel" style={{height:40}}/>)}</div>
          ) : orgRanking.length === 0 ? (
            <div className="empty"><div className="empty-icon">📊</div><div>No sales data for this period.</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Organiser</th><th>Orders</th><th>Gross</th><th>Ticket Value</th><th>Booking Fee</th><th>Stripe Fee</th><th>Payout</th></tr></thead>
                <tbody>
                  {orgRanking.map((org,i) => {
                    return (
                      <tr key={org.id}>
                        <td><span className={`rank ${i===0?'r1':i===1?'r2':i===2?'r3':'rn'}`}>{i+1}</span></td>
                        <td style={{fontWeight:600}}>{org.name}</td>
                        <td style={{color:'var(--muted)'}}>{org.orders}</td>
                        <td>{fmt(org.revenue)}</td>
                        <td>{fmt(org.ticketFaceValue)}</td>
                        <td style={{color:'var(--green)'}}>{fmt(org.bookingFees)}</td>
                        <td style={{color:'var(--danger)'}}>{fmt(org.stripeFees)}</td>
                        <td style={{fontWeight:700}}>{fmt(org.payout)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Event performance ── */}
      <div className="section">
        <div className="section-header"><div className="section-title">Event Performance</div><div className="section-sub">Last 20 events</div></div>
        <div className="card">
          {loading ? (
            <div style={{padding:24,display:'flex',flexDirection:'column',gap:10}}>{[1,2,3].map(i=><div key={i} className="skel" style={{height:40}}/>)}</div>
          ) : eventPerf.length === 0 ? (
            <div className="empty"><div className="empty-icon">🎫</div><div>No events found.</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Tickets Sold</th><th>Gross Revenue</th><th>Ticket Value</th><th>Booking Fees</th></tr></thead>
                <tbody>
                  {eventPerf.map(e => {
                    const ticketValue = (e.revenue || 0) - (e.bookingFees || 0);
                    return (
                      <tr key={e.id}>
                        <td style={{fontWeight:600}}>{e.name}</td>
                        <td style={{color:'var(--muted)',fontSize:13}}>{fmtDate(e.start_time)}</td>
                        <td>{eventStatus(e)}</td>
                        <td style={{color:'var(--muted)'}}>{e.tickets||0}</td>
                        <td style={{fontWeight:700}}>{fmt(e.revenue)}</td>
                        <td style={{fontWeight:600}}>{fmt(ticketValue)}</td>
                        <td style={{color:'var(--green)'}}>{fmt(e.bookingFees)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
