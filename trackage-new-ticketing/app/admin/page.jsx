/* app/admin/page.jsx — Dashboard */
'use client';
import { useState, useEffect } from 'react';
import { adminFetch } from '../../lib/adminFetch';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export default function AdminDashboard() {
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [dateFilter, setDateFilter]   = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');
  const [orgLeaders, setOrgLeaders]   = useState([]);

  useEffect(() => { loadStats(); }, [dateFilter, customStart, customEnd]);

  async function loadStats() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter: dateFilter });
      if (dateFilter === 'custom') {
        if (customStart) params.set('start', new Date(customStart + 'T00:00:00').toISOString());
        if (customEnd)   params.set('end',   new Date(customEnd   + 'T23:59:59').toISOString());
      }
      const res  = await adminFetch(`/api/admin/stats?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load stats');

      setOrgLeaders(data.leaderboard || []);
      setStats({
        totalRevenue:       data.totalRevenue,
        totalTicketRevenue: data.totalTicketRevenue,
        totalBookingFees:   data.totalBookingFees,
        totalStripeFees:    data.totalStripeFees,
        totalTickets:       data.totalTickets,
        orderCount:         data.orderCount,
        activeOrgCount:     data.activeOrgCount,
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const top = orgLeaders[0];
  const bottom = orgLeaders[orgLeaders.length - 1];
  const STAT_CARDS = [
    { label: 'Total Revenue',       value: fmt(stats?.totalRevenue),                    sub: `${stats?.orderCount || 0} completed orders`, accent: true },
    { label: 'Ticket Face Value',   value: fmt(stats?.totalTicketRevenue),              sub: 'excl. booking fees' },
    { label: 'Booking Fees',        value: fmt(stats?.totalBookingFees),                sub: 'platform revenue', accent: true },
    { label: 'Stripe Fees',         value: fmt(stats?.totalStripeFees),                 sub: 'actual processing fees', danger: true },
    { label: 'Tickets Sold',        value: (stats?.totalTickets || 0).toLocaleString(), sub: 'across all events' },
    { label: 'Active Organisers',   value: (stats?.activeOrgCount || 0).toString(),     sub: 'registered on the platform' },
  ];

  return (
    <div className="dash">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        :root {
          --black: #000000; --white: #ffffff; --bg: #F5F6FA; --surface: #ffffff;
          --border: #EBEDF0; --muted: #767C8C; --green: #48C16E; --green-dim: rgba(72,193,110,0.12);
        }
        .dash { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); background: var(--bg); min-height: 100vh; }
        @media (max-width: 768px) { .dash { margin: 0; padding: 0; } }
        .dash-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .dash-heading { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 3px; }
        .dash-sub { font-size: 14px; color: var(--muted); font-weight: 500; }
        .filter-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .filter-btn { background: var(--surface); border: 1.5px solid var(--border); color: var(--muted); padding: 7px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; }
        .filter-btn:hover { border-color: var(--black); color: var(--black); }
        .filter-btn.active { background: var(--black); border-color: var(--black); color: var(--white); }
        .date-input { border: 1.5px solid var(--border); border-radius: 100px; padding: 7px 14px; font-size: 13px; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); background: var(--surface); outline: none; font-weight: 500; }
        .date-input:focus { border-color: var(--black); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .stat-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; position: relative; }
        .stat-card-accent { border-color: var(--green); }
        .stat-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); position: absolute; top: 24px; right: 24px; }
        .stat-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
        .stat-value { font-size: 30px; font-weight: 800; line-height: 1; margin-bottom: 6px; letter-spacing: -0.02em; color: var(--black); }
        .stat-value-green { color: var(--green); }
        .stat-sub { font-size: 12px; color: var(--muted); font-weight: 500; }
        .skel { height: 30px; width: 120px; border-radius: 8px; background: linear-gradient(90deg,var(--border) 25%,var(--bg) 50%,var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .section-title { font-size: 15px; font-weight: 700; color: var(--black); letter-spacing: -0.01em; }
        .highlight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
        .highlight-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 22px 24px; }
        .highlight-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
        .tag-top { background: var(--green-dim); color: var(--green); }
        .tag-bottom { background: rgba(0,0,0,0.06); color: var(--muted); }
        .highlight-name { font-size: 17px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.01em; }
        .highlight-stats { font-size: 13px; color: var(--muted); font-weight: 500; }
        .table-wrap { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { background: var(--bg); padding: 12px 20px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); border-bottom: 1.5px solid var(--border); font-family: 'Plus Jakarta Sans', sans-serif; }
        .data-table td { padding: 14px 20px; border-top: 1px solid var(--border); font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .data-table tr:hover td { background: var(--bg); }
        .rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; font-size: 12px; font-weight: 700; }
        .rank-1 { background: var(--black); color: var(--white); }
        .rank-2 { background: var(--border); color: var(--muted); }
        .rank-3 { background: var(--border); color: var(--muted); }
        .rank-n { background: var(--bg); color: var(--muted); }
        .empty-state { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }
        @media(max-width:640px){ .highlight-grid{grid-template-columns:1fr} .stats-grid{grid-template-columns:1fr 1fr} .stat-value{font-size:22px} .dash-header{flex-direction:column} }
      `}</style>

      <div className="dash-header">
        <div>
          <div className="dash-heading">Dashboard</div>
          <div className="dash-sub">Platform overview and organiser performance</div>
        </div>
        <div className="filter-bar">
          {[{key:'this_month',label:'This month'},{key:'last_month',label:'Last month'},{key:'custom',label:'Custom'}].map(f => (
            <button key={f.key} className={`filter-btn ${dateFilter===f.key?'active':''}`} onClick={()=>setDateFilter(f.key)}>{f.label}</button>
          ))}
          {dateFilter==='custom' && (<>
            <input type="date" className="date-input" value={customStart} onChange={e=>setCustomStart(e.target.value)} />
            <span style={{color:'var(--muted)',fontWeight:600}}>→</span>
            <input type="date" className="date-input" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} />
          </>)}
        </div>
      </div>

      <div className="stats-grid">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className={`stat-card ${card.accent?'stat-card-accent':''}`}>
            {card.accent && <div className="stat-dot"/>}
            <div className="stat-label">{card.label}</div>
            {loading ? <div className="skel"/> : <div className="stat-value" style={card.accent ? { color: 'var(--green)' } : card.danger ? { color: 'var(--danger, #e53e3e)' } : undefined}>{card.value}</div>}
            {!loading && <div className="stat-sub">{card.sub}</div>}
          </div>
        ))}
      </div>

      {!loading && orgLeaders.length > 1 && (<>
        <div className="section-header"><div className="section-title">Organiser Highlights</div></div>
        <div className="highlight-grid">
          <div className="highlight-card">
            <div><span className="highlight-tag tag-top">↑ Top performer</span></div>
            <div className="highlight-name">{top?.name}</div>
            <div className="highlight-stats">{top?.orders} orders · {fmt(top?.revenue)}</div>
          </div>
          <div className="highlight-card">
            <div><span className="highlight-tag tag-bottom">↓ Lowest sales</span></div>
            <div className="highlight-name">{bottom?.name}</div>
            <div className="highlight-stats">{bottom?.orders} orders · {fmt(bottom?.revenue)}</div>
          </div>
        </div>
      </>)}

      <div className="section-header"><div className="section-title">Organisers ranked by revenue</div></div>
      <div className="table-wrap">
        {loading ? <div className="empty-state">Loading…</div> : orgLeaders.length===0 ? <div className="empty-state">No sales data for this period.</div> : (
          <table className="data-table">
            <thead><tr><th>#</th><th>Organiser</th><th>Orders</th><th>Revenue</th></tr></thead>
            <tbody>{orgLeaders.map((org, i) => (
              <tr key={org.id}>
                <td><span className={`rank-badge ${i<3?`rank-${i+1}`:'rank-n'}`}>{i+1}</span></td>
                <td style={{fontWeight:700,color:'#000'}}>{org.name}</td>
                <td style={{color:'var(--muted)',fontWeight:500}}>{org.orders}</td>
                <td style={{fontWeight:700,color:'var(--green)'}}>{fmt(org.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
