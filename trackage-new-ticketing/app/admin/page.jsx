/* app/admin/page.jsx — Dashboard Home (Analytics) */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { start, end };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [dateFilter, setDateFilter] = useState('this_month');   // this_month | last_month | custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [orgLeaders, setOrgLeaders]   = useState([]);

  useEffect(() => { loadStats(); }, [dateFilter, customStart, customEnd]);

  async function loadStats() {
    setLoading(true);
    try {
      let start, end;
      const now = new Date();

      if (dateFilter === 'this_month') {
        ({ start, end } = getMonthRange(now));
      } else if (dateFilter === 'last_month') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        ({ start, end } = getMonthRange(lm));
      } else {
        start = customStart ? new Date(customStart).toISOString() : getMonthRange(now).start;
        end   = customEnd   ? new Date(customEnd).toISOString()   : getMonthRange(now).end;
      }

      // All completed orders in range
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, stripe_fee, organiser_id, ticket_count, created_at')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);

      const totalRevenue    = (orders || []).reduce((s, o) => s + (o.total_amount || 0), 0);
      const totalTickets    = (orders || []).reduce((s, o) => s + (o.ticket_count  || 0), 0);
      const totalStripeFees = totalRevenue * 0.03; // 3% estimate

      // Group by organiser
      const byOrg = {};
      (orders || []).forEach(o => {
        if (!byOrg[o.organiser_id]) byOrg[o.organiser_id] = { tickets: 0, revenue: 0 };
        byOrg[o.organiser_id].tickets  += o.ticket_count  || 0;
        byOrg[o.organiser_id].revenue  += o.total_amount  || 0;
      });

      // Fetch organiser names
      const orgIds = Object.keys(byOrg);
      let organisers = [];
      if (orgIds.length) {
        const { data } = await supabase
          .from('organisers')
          .select('id, name')
          .in('id', orgIds);
        organisers = data || [];
      }

      const leaderboard = organisers
        .map(o => ({ ...o, ...byOrg[o.id] }))
        .sort((a, b) => b.tickets - a.tickets);

      setOrgLeaders(leaderboard);
      setStats({ totalRevenue, totalTickets, totalStripeFees, orderCount: (orders || []).length });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const top    = orgLeaders[0];
  const bottom = orgLeaders[orgLeaders.length - 1];

  return (
    <div className="dash">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');

        .dash { font-family: 'Syne', sans-serif; color: #f0f0f0; }

        /* ── Filter bar ── */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #888;
          font-family: 'DM Mono', monospace;
          margin-right: 4px;
        }

        .filter-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #aaa;
          padding: 7px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          transition: all 0.15s;
        }

        .filter-btn.active, .filter-btn:hover {
          background: #c8f04a;
          color: #0a0a0a;
          border-color: #c8f04a;
        }

        .date-input {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #f0f0f0;
          padding: 7px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          outline: none;
        }

        .date-input:focus { border-color: #c8f04a; }

        /* ── Stat cards ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .stat-card:hover { border-color: #3a3a3a; }

        .stat-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--accent-line, #2a2a2a);
        }

        .stat-card.green { --accent-line: #c8f04a; }
        .stat-card.red   { --accent-line: #ff4d6d; }
        .stat-card.blue  { --accent-line: #4dabf7; }
        .stat-card.gold  { --accent-line: #fcc419; }

        .stat-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #666;
          font-family: 'DM Mono', monospace;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 800;
          color: #f0f0f0;
          line-height: 1;
        }

        .stat-sub {
          font-size: 12px;
          color: #555;
          margin-top: 8px;
          font-family: 'DM Mono', monospace;
        }

        /* ── Skeleton ── */
        .skeleton {
          background: linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
          height: 36px;
          width: 120px;
        }

        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Section title ── */
        .section-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #666;
          font-family: 'DM Mono', monospace;
          margin-bottom: 16px;
        }

        /* ── Leaderboard ── */
        .leader-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }

        .leader-card {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          padding: 24px;
        }

        .leader-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 20px;
          margin-bottom: 12px;
          font-family: 'DM Mono', monospace;
        }

        .leader-tag.top    { background: rgba(200,240,74,0.15); color: #c8f04a; }
        .leader-tag.bottom { background: rgba(255,77,109,0.15); color: #ff4d6d; }

        .leader-name  { font-size: 20px; font-weight: 700; color: #f0f0f0; margin-bottom: 6px; }
        .leader-stats { font-size: 13px; color: #777; font-family: 'DM Mono', monospace; }

        /* ── Organiser table ── */
        .org-table {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 10px;
          overflow: hidden;
        }

        .org-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .org-table th {
          background: #1a1a1a;
          padding: 12px 20px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #555;
          font-family: 'DM Mono', monospace;
        }

        .org-table td {
          padding: 14px 20px;
          border-top: 1px solid #1a1a1a;
          font-size: 13px;
          color: #ccc;
        }

        .org-table tr:hover td { background: #161616; }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
        }

        .rank-1 { background: rgba(200,240,74,0.2); color: #c8f04a; }
        .rank-2 { background: rgba(200,240,74,0.1); color: #a8c83a; }
        .rank-3 { background: rgba(200,240,74,0.05); color: #888; }
        .rank-n { background: #1a1a1a; color: #555; }

        .empty-state {
          text-align: center;
          padding: 48px;
          color: #555;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
        }

        @media (max-width: 640px) {
          .leader-grid { grid-template-columns: 1fr; }
          .stat-value { font-size: 26px; }
        }
      `}</style>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <span className="filter-label">Period:</span>
        {[
          { key: 'this_month', label: 'This Month' },
          { key: 'last_month', label: 'Last Month' },
          { key: 'custom',     label: 'Custom' },
        ].map(f => (
          <button
            key={f.key}
            className={`filter-btn ${dateFilter === f.key ? 'active' : ''}`}
            onClick={() => setDateFilter(f.key)}
          >
            {f.label}
          </button>
        ))}

        {dateFilter === 'custom' && (
          <>
            <input
              type="date"
              className="date-input"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
            <span style={{ color: '#555' }}>→</span>
            <input
              type="date"
              className="date-input"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {[
          {
            cls: 'green',
            label: 'Revenue',
            value: loading ? null : fmt(stats?.totalRevenue),
            sub: `${stats?.orderCount || 0} completed orders`,
          },
          {
            cls: 'blue',
            label: 'Tickets Sold',
            value: loading ? null : (stats?.totalTickets || 0).toLocaleString(),
            sub: 'across all events',
          },
          {
            cls: 'red',
            label: 'Stripe Fees (est.)',
            value: loading ? null : fmt(stats?.totalStripeFees),
            sub: '~3% of revenue processed',
          },
          {
            cls: 'gold',
            label: 'Organisers Active',
            value: loading ? null : orgLeaders.length.toString(),
            sub: 'with sales this period',
          },
        ].map(card => (
          <div key={card.label} className={`stat-card ${card.cls}`}>
            <div className="stat-label">{card.label}</div>
            {loading
              ? <div className="skeleton" />
              : <div className="stat-value">{card.value}</div>
            }
            {!loading && <div className="stat-sub">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Top / bottom organiser ── */}
      {!loading && orgLeaders.length > 0 && (
        <>
          <div className="section-title">Organiser Highlights</div>
          <div className="leader-grid">
            <div className="leader-card">
              <span className="leader-tag top">⬆ Top Performer</span>
              <div className="leader-name">{top?.name || '—'}</div>
              <div className="leader-stats">{top?.tickets} tickets · {fmt(top?.revenue)}</div>
            </div>
            <div className="leader-card">
              <span className="leader-tag bottom">⬇ Needs Attention</span>
              <div className="leader-name">{bottom?.name || '—'}</div>
              <div className="leader-stats">{bottom?.tickets} tickets · {fmt(bottom?.revenue)}</div>
            </div>
          </div>
        </>
      )}

      {/* ── Full leaderboard ── */}
      <div className="section-title" style={{ marginTop: '8px' }}>All Organisers — Ranked</div>
      <div className="org-table">
        {loading ? (
          <div className="empty-state">Loading data…</div>
        ) : orgLeaders.length === 0 ? (
          <div className="empty-state">No sales data for this period.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Organiser</th>
                <th>Tickets</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {orgLeaders.map((org, i) => (
                <tr key={org.id}>
                  <td>
                    <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : 'rank-n'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#f0f0f0' }}>{org.name}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace" }}>{org.tickets}</td>
                  <td style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(org.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
