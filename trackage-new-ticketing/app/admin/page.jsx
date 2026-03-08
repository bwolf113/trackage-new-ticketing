/* app/admin/page.jsx — Dashboard Home */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

function fmt(n) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { start, end };
}

export default function AdminDashboard() {
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [orgLeaders, setOrgLeaders]   = useState([]);

  useEffect(() => { loadStats(); }, [dateFilter, customStart, customEnd]);

  async function loadStats() {
    setLoading(true);
    try {
      let start, end;
      const now = new Date();
      if (dateFilter === 'this_month')       ({ start, end } = getMonthRange(now));
      else if (dateFilter === 'last_month')  ({ start, end } = getMonthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      else {
        start = customStart ? new Date(customStart).toISOString() : getMonthRange(now).start;
        end   = customEnd   ? new Date(customEnd).toISOString()   : getMonthRange(now).end;
      }

      // Fetch completed orders (using your schema: total not total_amount)
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, organiser_id, created_at')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);

      // Fetch ticket counts from order_items
      const orderIds = (orders || []).map(o => o.id);
      let ticketCount = 0;
      if (orderIds.length) {
        const { data: items } = await supabase
          .from('order_items')
          .select('quantity')
          .in('order_id', orderIds);
        ticketCount = (items || []).reduce((s, i) => s + (i.quantity || 0), 0);
      }

      const totalRevenue    = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
      const totalStripeFees = totalRevenue * 0.03;

      // Group by organiser_id
      const byOrg = {};
      (orders || []).forEach(o => {
        if (!o.organiser_id) return;
        if (!byOrg[o.organiser_id]) byOrg[o.organiser_id] = { revenue: 0, orders: 0 };
        byOrg[o.organiser_id].revenue += o.total || 0;
        byOrg[o.organiser_id].orders  += 1;
      });

      const orgIds = Object.keys(byOrg);
      let leaderboard = [];
      if (orgIds.length) {
        const { data: orgs } = await supabase
          .from('organisers')
          .select('id, name')
          .in('id', orgIds);
        leaderboard = (orgs || [])
          .map(o => ({ ...o, ...byOrg[o.id] }))
          .sort((a, b) => b.revenue - a.revenue);
      }

      setOrgLeaders(leaderboard);
      setStats({
        totalRevenue,
        totalTickets: ticketCount,
        totalStripeFees,
        orderCount: (orders || []).length,
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const top    = orgLeaders[0];
  const bottom = orgLeaders[orgLeaders.length - 1];

  const STAT_CARDS = [
    { label: 'Total Revenue',        value: fmt(stats?.totalRevenue),       sub: `${stats?.orderCount || 0} completed orders`,   color: '#0a9e7f', bg: '#f0fdf9' },
    { label: 'Tickets Sold',         value: (stats?.totalTickets || 0).toLocaleString(), sub: 'across all events',              color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Stripe Fees (est.)',    value: fmt(stats?.totalStripeFees),    sub: '~3% of total processed',                      color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Active Organisers',     value: orgLeaders.length.toString(),   sub: 'with sales this period',                      color: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <div className="dash">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .dash { font-family: 'Inter', sans-serif; color: #111827; }

        /* ── Page heading ── */
        .dash-heading {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .dash-sub {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 24px;
        }

        /* ── Filter bar ── */
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin-right: 4px;
        }

        .filter-btn {
          background: #fff;
          border: 1.5px solid #e5e7eb;
          color: #374151;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all 0.15s;
        }
        .filter-btn:hover  { border-color: #0a9e7f; color: #0a9e7f; }
        .filter-btn.active { background: #0a9e7f; border-color: #0a9e7f; color: #fff; font-weight: 600; }

        .date-input {
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          color: #111827;
          background: #fff;
          outline: none;
        }
        .date-input:focus { border-color: #0a9e7f; }

        /* ── Stat cards ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-sub { font-size: 12px; color: #9ca3af; }

        .stat-icon {
          width: 36px; height: 36px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px;
          margin-bottom: 14px;
        }

        /* ── Skeleton ── */
        .skel {
          height: 28px; width: 100px; border-radius: 6px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Section ── */
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 14px;
        }

        /* ── Highlight cards ── */
        .highlight-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
        }

        .highlight-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .highlight-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          margin-bottom: 10px;
        }

        .tag-top    { background: #dcfce7; color: #16a34a; }
        .tag-bottom { background: #fee2e2; color: #dc2626; }

        .highlight-name  { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .highlight-stats { font-size: 13px; color: #6b7280; }

        /* ── Leaderboard table ── */
        .table-wrap {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .data-table { width: 100%; border-collapse: collapse; }

        .data-table th {
          background: #f9fafb;
          padding: 12px 20px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #6b7280;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 14px 20px;
          border-top: 1px solid #f3f4f6;
          font-size: 14px;
          color: #374151;
        }

        .data-table tr:hover td { background: #fafafa; }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px; height: 24px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
        }

        .rank-1 { background: #fef9c3; color: #854d0e; }
        .rank-2 { background: #f1f5f9; color: #475569; }
        .rank-3 { background: #fef3c7; color: #92400e; }
        .rank-n { background: #f3f4f6; color: #9ca3af; }

        .empty-state {
          text-align: center;
          padding: 48px 20px;
          color: #9ca3af;
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .highlight-grid { grid-template-columns: 1fr; }
          .stats-grid     { grid-template-columns: 1fr 1fr; }
          .stat-value     { font-size: 22px; }
        }
      `}</style>

      <div className="dash-heading">Dashboard</div>
      <div className="dash-sub">Here's what's happening with your platform.</div>

      {/* ── Period filter ── */}
      <div className="filter-bar">
        <span className="filter-label">Period:</span>
        {[
          { key: 'this_month', label: 'This month' },
          { key: 'last_month', label: 'Last month' },
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
            <input type="date" className="date-input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span style={{ color: '#9ca3af' }}>→</span>
            <input type="date" className="date-input" value={customEnd}   onChange={e => setCustomEnd(e.target.value)} />
          </>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        {STAT_CARDS.map(card => (
          <div key={card.label} className="stat-card">
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
              {card.label === 'Total Revenue'     && '€'}
              {card.label === 'Tickets Sold'      && '🎫'}
              {card.label === 'Stripe Fees (est.)' && '💳'}
              {card.label === 'Active Organisers' && '👤'}
            </div>
            <div className="stat-label">{card.label}</div>
            {loading
              ? <div className="skel" />
              : <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            }
            {!loading && <div className="stat-sub">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Top / bottom performers ── */}
      {!loading && orgLeaders.length > 1 && (
        <>
          <div className="section-title">Organiser Highlights</div>
          <div className="highlight-grid">
            <div className="highlight-card">
              <span className="highlight-tag tag-top">⬆ Top performer</span>
              <div className="highlight-name">{top?.name}</div>
              <div className="highlight-stats">{top?.orders} orders · {fmt(top?.revenue)}</div>
            </div>
            <div className="highlight-card">
              <span className="highlight-tag tag-bottom">⬇ Lowest sales</span>
              <div className="highlight-name">{bottom?.name}</div>
              <div className="highlight-stats">{bottom?.orders} orders · {fmt(bottom?.revenue)}</div>
            </div>
          </div>
        </>
      )}

      {/* ── Leaderboard ── */}
      <div className="section-title">Organisers ranked by revenue</div>
      <div className="table-wrap">
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : orgLeaders.length === 0 ? (
          <div className="empty-state">No sales data for this period.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Organiser</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {orgLeaders.map((org, i) => (
                <tr key={org.id}>
                  <td><span className={`rank-badge ${i < 3 ? `rank-${i+1}` : 'rank-n'}`}>{i+1}</span></td>
                  <td style={{ fontWeight: 600, color: '#111827' }}>{org.name}</td>
                  <td>{org.orders}</td>
                  <td style={{ fontWeight: 600, color: '#0a9e7f' }}>{fmt(org.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
