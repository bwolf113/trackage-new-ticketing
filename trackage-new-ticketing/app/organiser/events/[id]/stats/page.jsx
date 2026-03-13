/* app/organiser/events/[id]/stats/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDay(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const COLORS = ['#0a9e7f', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#f97316'];

const CSS = `
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-mid); text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--text); }
.page-header { margin-bottom: 28px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.page-sub { font-size: 13px; color: var(--text-mid); }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 32px; }
.tile { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; }
.tile-label { font-size: 11px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.tile-value { font-size: 30px; font-weight: 700; line-height: 1; color: var(--text); }
.tile-value.green { color: #0a9e7f; }
.tile-value.blue  { color: #3b82f6; }
.tile-value.purple{ color: #8b5cf6; }
.chart-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; }
.chart-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 16px; }
.chart-wrap { width: 100%; overflow-x: auto; }
.legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-mid); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.empty-chart { text-align: center; padding: 48px 20px; color: #9ca3af; font-size: 14px; }
.skel { border-radius: 6px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media(max-width:640px) { .tiles { grid-template-columns: 1fr 1fr; } .tile-value { font-size: 24px; } }
`;

/* ─── SVG Line/Area Chart ─── */
function AreaChart({ data, valueKey, color, formatY }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No data for this period yet.</div>;
  }

  const W = 560, H = 160;
  const PAD = { top: 12, right: 16, bottom: 36, left: 56 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const values = data.map(d => d[valueKey] || 0);
  const maxV = Math.max(...values, 1);

  const xOf = i => PAD.left + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW);
  const yOf = v => PAD.top + iH - (v / maxV) * iH;

  const pts = data.map((d, i) => `${xOf(i)},${yOf(d[valueKey] || 0)}`).join(' ');
  const areaD = [
    `M${xOf(0)},${PAD.top + iH}`,
    ...data.map((d, i) => `L${xOf(i)},${yOf(d[valueKey] || 0)}`),
    `L${xOf(data.length - 1)},${PAD.top + iH}`,
    'Z',
  ].join(' ');

  const gradId = `g${color.replace('#', '')}`;
  const yTicks = [0, 0.5, 1].map(t => ({ v: t * maxV, y: yOf(t * maxV) }));
  const step = Math.max(1, Math.ceil(data.length / 7));
  const xLabelIdxs = data.reduce((acc, _, i) => {
    if (i % step === 0 || i === data.length - 1) acc.push(i);
    return acc;
  }, []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', minWidth: 280 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* grid */}
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#f3f4f6" strokeWidth="1" />
      ))}
      {/* area */}
      <path d={areaD} fill={`url(#${gradId})`} />
      {/* line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(d[valueKey] || 0)} r="3.5" fill={color} />
      ))}
      {/* y labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Inter,sans-serif">
          {formatY(t.v)}
        </text>
      ))}
      {/* x labels */}
      {xLabelIdxs.map(i => (
        <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="Inter,sans-serif">
          {fmtDay(data[i].date)}
        </text>
      ))}
    </svg>
  );
}

/* ─── SVG Multi-Line Chart (by ticket type) ─── */
function MultiLineChart({ data, typeNames }) {
  if (!data || data.length === 0 || typeNames.length === 0) {
    return <div className="empty-chart">No sales data yet.</div>;
  }

  const W = 560, H = 160;
  const PAD = { top: 12, right: 16, bottom: 36, left: 40 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap(d => typeNames.map(n => d[n] || 0));
  const maxV = Math.max(...allVals, 1);

  const xOf = i => PAD.left + (data.length === 1 ? iW / 2 : (i / (data.length - 1)) * iW);
  const yOf = v => PAD.top + iH - (v / maxV) * iH;

  const yTicks = [0, 0.5, 1].map(t => ({ v: Math.round(t * maxV), y: yOf(t * maxV) }));
  const step = Math.max(1, Math.ceil(data.length / 7));
  const xLabelIdxs = data.reduce((acc, _, i) => {
    if (i % step === 0 || i === data.length - 1) acc.push(i);
    return acc;
  }, []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', minWidth: 280 }}>
      {/* grid */}
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#f3f4f6" strokeWidth="1" />
      ))}
      {/* lines */}
      {typeNames.map((name, ci) => {
        const color = COLORS[ci % COLORS.length];
        const pts = data.map((d, i) => `${xOf(i)},${yOf(d[name] || 0)}`).join(' ');
        return (
          <g key={name}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <circle key={i} cx={xOf(i)} cy={yOf(d[name] || 0)} r="3.5" fill={color} />
            ))}
          </g>
        );
      })}
      {/* y labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="Inter,sans-serif">
          {t.v}
        </text>
      ))}
      {/* x labels */}
      {xLabelIdxs.map(i => (
        <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="Inter,sans-serif">
          {fmtDay(data[i].date)}
        </text>
      ))}
    </svg>
  );
}

/* ─── Page ─── */
export default function EventStatsPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) { router.push('/organiser/login'); return; }

    fetch(`/api/organiser/events/${eventId}/stats?organiser_id=${organiser_id}`)
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  const summary        = data?.summary        || {};
  const dailySales     = data?.daily_sales    || [];
  const dailyByType    = data?.daily_by_type  || [];
  const typeNames      = data?.ticket_type_names || [];

  return (
    <>
      <style>{CSS}</style>
      <Link href={`/organiser/events/${eventId}/orders`} className="back-link">← Back to Orders</Link>

      <div className="page-header">
        <div className="page-title">
          {loading ? 'Loading…' : `${data?.event?.name} — Stats`}
        </div>
        <div className="page-sub">
          {data?.event?.start_time && fmtDate(data.event.start_time)}
          {data?.event?.venue_name && ` · ${data.event.venue_name}`}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="tiles">
        <div className="tile">
          <div className="tile-label">Tickets Sold</div>
          {loading
            ? <div className="skel" style={{ height: 32, width: 80 }} />
            : <div className="tile-value green">{summary.total_tickets_sold ?? 0}</div>
          }
        </div>
        <div className="tile">
          <div className="tile-label">Complimentary Tickets</div>
          {loading
            ? <div className="skel" style={{ height: 32, width: 60 }} />
            : <div className="tile-value blue">{summary.total_comp_tickets ?? 0}</div>
          }
        </div>
        <div className="tile">
          <div className="tile-label">Ticket Types</div>
          {loading
            ? <div className="skel" style={{ height: 32, width: 40 }} />
            : <div className="tile-value purple">{summary.total_ticket_types ?? 0}</div>
          }
        </div>
      </div>

      {/* Global ticket sales */}
      <div className="chart-card">
        <div className="chart-title">Daily Ticket Sales</div>
        <div className="chart-wrap">
          {loading
            ? <div className="skel" style={{ height: 160 }} />
            : <AreaChart
                data={dailySales}
                valueKey="tickets"
                color="#0a9e7f"
                formatY={v => Math.round(v)}
              />
          }
        </div>
      </div>

      {/* By ticket type */}
      <div className="chart-card">
        <div className="chart-title">Daily Tickets Sold by Type</div>
        <div className="chart-wrap">
          {loading
            ? <div className="skel" style={{ height: 160 }} />
            : <MultiLineChart data={dailyByType} typeNames={typeNames} />
          }
        </div>
        {!loading && typeNames.length > 0 && (
          <div className="legend">
            {typeNames.map((name, i) => (
              <div key={name} className="legend-item">
                <div className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                {name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue */}
      <div className="chart-card">
        <div className="chart-title">Daily Revenue</div>
        <div className="chart-wrap">
          {loading
            ? <div className="skel" style={{ height: 160 }} />
            : <AreaChart
                data={dailySales}
                valueKey="revenue"
                color="#3b82f6"
                formatY={v => `€${Math.round(v)}`}
              />
          }
        </div>
      </div>
    </>
  );
}
