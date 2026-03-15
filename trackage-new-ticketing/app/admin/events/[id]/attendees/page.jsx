/* app/admin/events/[id]/attendees/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '../../../../../lib/adminFetch';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #F5F6FA; --surface: #FFFFFF; --border: #EBEDF0;
  --muted: #767C8C; --green: #48C16E; --green-dim: rgba(72,193,110,0.12);
  --black: #000000; --white: #FFFFFF;
}
body { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); background: var(--bg); }
.att { font-family: 'Plus Jakarta Sans', sans-serif; }
.back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; text-decoration: none; margin-bottom: 20px; font-weight: 500; }
.back-link:hover { color: var(--black); }
.page-header { margin-bottom: 22px; }
.page-title { font-size: 24px; font-weight: 800; margin-bottom: 3px; letter-spacing: -0.02em; color: var(--black); }
.page-sub { font-size: 14px; color: var(--muted); font-weight: 500; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 220px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; pointer-events: none; }
.search-input { width: 100%; padding: 8px 12px 8px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); background: var(--surface); outline: none; }
.search-input:focus { border-color: var(--black); }
.table-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
.att-table { width: 100%; border-collapse: collapse; }
.att-table th { background: var(--bg); padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); border-bottom: 1.5px solid var(--border); white-space: nowrap; }
.att-table td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; color: var(--black); vertical-align: middle; font-weight: 500; }
.att-table tr:hover td { background: var(--bg); }
.name-cell { font-weight: 600; color: var(--black); }
.email-cell { font-size: 12px; color: var(--muted); margin-top: 2px; }
.mono { font-family: monospace; font-size: 12px; color: var(--muted); }
.ticket-badge { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; background: var(--green-dim); color: var(--green); margin: 2px 2px 0 0; }
.empty-state { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }
.skel { height: 16px; border-radius: 8px; background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.count-chip { display: inline-block; background: rgba(0,0,0,0.06); color: var(--muted); font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 100px; margin-left: 8px; }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; text-decoration: none; white-space: nowrap; }
.btn-export:hover { border-color: var(--black); color: var(--black); }
.checkin-done { font-size: 12px; color: var(--green); font-weight: 700; }
.checkin-partial { font-size: 12px; color: #d97706; font-weight: 600; }
.btn-checkin { padding: 5px 11px; border: 1.5px solid var(--green); border-radius: 8px; background: var(--green-dim); color: var(--green); font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: opacity 0.15s; }
.btn-checkin:hover { opacity: 0.8; }
.btn-checkin:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-undo { padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--muted); font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: all 0.15s; margin-top: 4px; }
.btn-undo:hover { border-color: #ef4444; color: #ef4444; }
.btn-undo:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export default function AttendeesPage() {
  const { id: eventId } = useParams();
  const [event,      setEvent]     = useState(null);
  const [attendees,  setAttendees] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [checkingIn, setCheckingIn] = useState({});
  const [undoing,    setUndoing]    = useState({});

  useEffect(() => { fetchData(); }, [eventId]);

  async function fetchData() {
    setLoading(true);
    try {
      const res  = await adminFetch(`/api/admin/event-attendees/${eventId}`);
      const data = await res.json();
      setEvent(data.event || null);
      setAttendees(data.attendees || []);
    } catch {}
    setLoading(false);
  }

  async function checkIn(orderId) {
    setCheckingIn(c => ({ ...c, [orderId]: 'loading' }));
    try {
      const res  = await adminFetch(`/api/admin/event-attendees/${eventId}`, {
        method:  'PATCH',
        body:    JSON.stringify({ order_id: orderId }),
      });
      const json = await res.json();
      if (json.success) {
        setAttendees(prev => prev.map(a =>
          a.order_id === orderId
            ? { ...a, checked_in_at: json.checked_in_at, checkin_count: a.checkin_total }
            : a
        ));
      }
    } finally {
      setCheckingIn(c => ({ ...c, [orderId]: 'done' }));
    }
  }

  async function undoCheckIn(orderId) {
    setUndoing(u => ({ ...u, [orderId]: 'loading' }));
    try {
      const res  = await adminFetch(`/api/admin/event-attendees/${eventId}`, {
        method: 'PATCH',
        body:   JSON.stringify({ order_id: orderId, undo: true }),
      });
      const json = await res.json();
      if (json.success) {
        setAttendees(prev => prev.map(a =>
          a.order_id === orderId
            ? { ...a, checked_in_at: null, checkin_count: 0 }
            : a
        ));
      }
    } finally {
      setUndoing(u => ({ ...u, [orderId]: 'done' }));
    }
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
                <th>Check-in</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const allCheckedIn = a.checkin_total > 0 && a.checkin_count === a.checkin_total;
                const partialCheckedIn = a.checkin_count > 0 && !allCheckedIn;
                return (
                  <tr key={i}>
                    <td>
                      <div className="name-cell">{a.customer_name || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{a.customer_email || '—'}</div>
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
                    <td>
                      {allCheckedIn ? (
                        <div>
                          <div className="checkin-done">✓ Checked in</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            {new Date(a.checked_in_at).toLocaleString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <button
                            className="btn-undo"
                            disabled={undoing[a.order_id] === 'loading'}
                            onClick={() => undoCheckIn(a.order_id)}
                          >
                            {undoing[a.order_id] === 'loading' ? '…' : 'Undo check-in'}
                          </button>
                        </div>
                      ) : partialCheckedIn ? (
                        <div>
                          <div className="checkin-partial">{a.checkin_count}/{a.checkin_total} checked in</div>
                          <button
                            className="btn-checkin"
                            style={{ marginTop: 4 }}
                            disabled={checkingIn[a.order_id] === 'loading'}
                            onClick={() => checkIn(a.order_id)}
                          >
                            {checkingIn[a.order_id] === 'loading' ? '…' : 'Check in remaining'}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-checkin"
                          disabled={checkingIn[a.order_id] === 'loading'}
                          onClick={() => checkIn(a.order_id)}
                        >
                          {checkingIn[a.order_id] === 'loading' ? '…' : 'Check in'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
