/* app/admin/events/[id]/attendees/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --accent: #0a9e7f; --text: #111827; --text-mid: #6b7280; --text-light: #9ca3af;
  --border: #e5e7eb; --bg: #f9fafb; --white: #fff;
}
body { font-family: 'Inter', sans-serif; color: var(--text); background: var(--bg); }
.att { font-family: 'Inter', sans-serif; }
.back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--text-mid); font-size: 13px; text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--accent); }
.page-header { margin-bottom: 22px; }
.page-title { font-size: 22px; font-weight: 700; margin-bottom: 3px; }
.page-sub { font-size: 14px; color: var(--text-mid); }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 220px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 14px; pointer-events: none; }
.search-input { width: 100%; padding: 9px 12px 9px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; color: var(--text); background: var(--white); outline: none; }
.search-input:focus { border-color: var(--accent); }
.table-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.att-table { width: 100%; border-collapse: collapse; }
.att-table th { background: #f9fafb; padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-mid); border-bottom: 1px solid var(--border); white-space: nowrap; }
.att-table td { padding: 12px 16px; border-top: 1px solid #f3f4f6; font-size: 14px; color: #374151; vertical-align: middle; }
.att-table tr:hover td { background: #fafafa; }
.name-cell { font-weight: 600; color: var(--text); }
.email-cell { font-size: 12px; color: var(--text-light); margin-top: 2px; }
.mono { font-family: monospace; font-size: 12px; color: var(--text-mid); }
.ticket-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #f0fdf9; color: var(--accent); border: 1px solid #a7f3d0; margin: 2px 2px 0 0; }
.empty-state { text-align: center; padding: 56px 20px; color: var(--text-light); font-size: 14px; }
.skel { height: 16px; border-radius: 4px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.count-chip { display: inline-block; background: #f3f4f6; color: var(--text-mid); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; margin-left: 8px; border: 1px solid var(--border); }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--white); color: var(--text-mid); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; text-decoration: none; white-space: nowrap; }
.btn-export:hover { border-color: var(--accent); color: var(--accent); }
`;

export default function AttendeesPage() {
  const { id: eventId } = useParams();
  const [event,      setEvent]     = useState(null);
  const [attendees,  setAttendees] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');

  useEffect(() => { fetchData(); }, [eventId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/event-attendees/${eventId}`);
      const data = await res.json();
      setEvent(data.event || null);
      setAttendees(data.attendees || []);
    } catch {}
    setLoading(false);
  }

  function exportCSV() {
    const rows = [['Name', 'Email', 'Order #', 'Tickets', 'Total Qty', 'Marketing Consent']];
    for (const a of filtered) {
      const ticketStr = (a.tickets || []).map(t => `${t.ticket_name} x${t.quantity}`).join('; ');
      rows.push([
        a.customer_name || '',
        a.customer_email || '',
        `#${a.order_ref}`,
        ticketStr,
        a.total_qty,
        a.marketing_consent ? 'Yes' : 'No',
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attendees-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = attendees.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.customer_name?.toLowerCase().includes(q) ||
      a.customer_email?.toLowerCase().includes(q) ||
      a.order_ref?.toLowerCase().includes(q) ||
      a.tickets?.some(t => t.ticket_name?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="att">
      <style>{CSS}</style>

      <Link href="/admin/events" className="back-link">← Back to Events</Link>

      <div className="page-header">
        <div className="page-title">
          Attendees
          {attendees.length > 0 && <span className="count-chip">{attendees.length}</span>}
        </div>
        <div className="page-sub">{event?.name || 'Loading…'}</div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name, email, order # or ticket type…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {attendees.length > 0 && (
          <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>
        )}
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(8)].map((_, i) => <div key={i} className="skel" style={{ width: `${60 + (i % 4) * 10}%`, height: 18 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">{search ? 'No attendees match your search.' : 'No completed orders for this event yet.'}</div>
        ) : (
          <table className="att-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Order #</th>
                <th>Tickets</th>
                <th>Total qty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={i}>
                  <td>
                    <div className="name-cell">{a.customer_name || '—'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>{a.customer_email || '—'}</div>
                  </td>
                  <td>
                    <div className="mono">#{a.order_ref}</div>
                  </td>
                  <td>
                    {(a.tickets || []).map((t, j) => (
                      <span key={j} className="ticket-badge">{t.ticket_name} ×{t.quantity}</span>
                    ))}
                  </td>
                  <td style={{ fontWeight: 600 }}>{a.total_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
