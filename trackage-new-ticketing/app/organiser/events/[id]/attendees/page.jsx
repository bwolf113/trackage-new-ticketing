/* app/organiser/events/[id]/attendees/page.jsx */
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

const CSS = `
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-mid); text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--text); }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.page-sub { font-size: 13px; color: var(--text-mid); }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-wrap input { width: 100%; padding: 9px 13px 9px 34px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; background: #fff; }
.search-wrap input:focus { border-color: var(--accent); }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-light); font-size: 13px; }
.count-label { font-size: 13px; color: var(--text-mid); white-space: nowrap; }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: #fff; color: var(--text-mid); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; }
.btn-export:hover { border-color: var(--accent); color: var(--accent); }
.table-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-mid); background: #f9fafb; border-bottom: 1px solid var(--border); }
td { padding: 12px 16px; border-top: 1px solid #f3f4f6; font-size: 14px; color: var(--text); vertical-align: middle; }
tr:hover td { background: #fafafa; }
.mono { font-family: monospace; font-size: 12px; color: var(--text-mid); }
.empty-state { text-align: center; padding: 48px 20px; color: var(--text-mid); font-size: 14px; }
.btn-resend { padding: 5px 11px; border: 1.5px solid var(--border); border-radius: 6px; background: #fff; color: var(--text-mid); font-size: 12px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; transition: all 0.15s; }
.btn-resend:hover { border-color: var(--accent); color: var(--accent); }
.btn-resend:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-resend.sent { border-color: #a7f3d0; color: #065f46; background: #f0fdf9; }
.skel { height: 14px; border-radius: 4px; background: linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.checkin-done { font-size: 12px; color: #065f46; font-weight: 600; }
.checkin-partial { font-size: 12px; color: #92400e; font-weight: 500; }
.checkin-none { font-size: 12px; color: var(--text-light); }
.btn-checkin { padding: 5px 11px; border: 1.5px solid #a7f3d0; border-radius: 6px; background: #f0fdf9; color: #065f46; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; }
.btn-checkin:hover { background: #d1fae5; }
.btn-checkin:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export default function OrgAttendeesPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
    const [resending,  setResending]  = useState({}); // order_id → 'sending' | 'sent' | 'error'
  const [checkingIn, setCheckingIn] = useState({}); // order_id → 'loading' | 'done'

  useEffect(() => {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) { router.push('/organiser/login'); return; }

    fetch(`/api/organiser/events/${eventId}/attendees?organiser_id=${organiser_id}`)
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  const attendees = data?.attendees || [];

  const filtered = attendees.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q)  ||
      a.email?.toLowerCase().includes(q) ||
      a.order_id?.toLowerCase().includes(q)
    );
  });

  async function checkIn(orderId) {
    const organiser_id = localStorage.getItem('organiser_id');
    setCheckingIn(c => ({ ...c, [orderId]: 'loading' }));
    try {
      const res  = await fetch(`/api/organiser/events/${eventId}/attendees`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ organiser_id, order_id: orderId }),
      });
      const json = await res.json();
      if (json.success) {
        setData(prev => ({
          ...prev,
          attendees: prev.attendees.map(a =>
            a.order_id === orderId
              ? { ...a, checked_in_at: json.checked_in_at, checkin_count: a.checkin_total }
              : a
          ),
        }));
      }
    } finally {
      setCheckingIn(c => ({ ...c, [orderId]: 'done' }));
    }
  }

  async function resendTicket(orderId) {
    const organiser_id = localStorage.getItem('organiser_id');
    setResending(r => ({ ...r, [orderId]: 'sending' }));
    try {
      const res  = await fetch('/api/organiser/resend-ticket', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order_id: orderId, organiser_id }),
      });
      const json = await res.json();
      setResending(r => ({ ...r, [orderId]: json.success ? 'sent' : 'error' }));
      if (!json.success) alert(`Failed to resend: ${json.error}`);
    } catch {
      setResending(r => ({ ...r, [orderId]: 'error' }));
    }
  }

  function exportCSV() {
    const rows = [['Order #', 'Name', 'Email', 'Phone', 'Tickets', 'Total (€)', 'Date', 'Marketing Consent']];
    for (const a of filtered) {
      rows.push([
        `#${(a.order_id || '').slice(0,8).toUpperCase()}`,
        a.name,
        a.email,
        a.phone,
        a.ticket_summary,
        (a.total || 0).toFixed(2),
        fmtDate(a.created_at),
        a.marketing_consent ? 'Yes' : 'No',
      ]);
    }
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `attendees-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{CSS}</style>
      <Link href={`/organiser/events/${eventId}/orders`} className="back-link">← Back to Orders</Link>

      <div className="page-header">
        <div className="page-title">{loading ? 'Loading…' : `${data?.event?.name} — Attendees`}</div>
        <div className="page-sub">
          {filtered.length} confirmed attendee{filtered.length !== 1 ? 's' : ''}
          {data?.event?.start_time && ` · ${fmtDate(data.event.start_time)}`}
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-ico">🔍</span>
          <input
            placeholder="Search by name, email or order #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="count-label">{filtered.length} attendee{filtered.length !== 1 ? 's' : ''}</div>
        {attendees.length > 0 && (
          <button className="btn-export" onClick={exportCSV}>⬇ Export CSV</button>
        )}
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skel" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {search ? 'No attendees match your search.' : 'No confirmed attendees yet.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Name</th>
                <th>Email</th>
                <th>Tickets</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Date</th>
                <th>Check-in</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const resendState = resending[a.order_id];
                const allCheckedIn = a.checkin_total > 0 && a.checkin_count === a.checkin_total;
                const partialCheckedIn = a.checkin_count > 0 && !allCheckedIn;
                return (
                  <tr key={a.order_id}>
                    <td className="mono">#{a.order_id?.slice(0,8).toUpperCase()}</td>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{a.email}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{a.ticket_summary || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(a.total)}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{fmtDate(a.created_at)}</td>
                    <td>
                      {allCheckedIn ? (
                        <div>
                          <div className="checkin-done">✓ Checked in</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                            {new Date(a.checked_in_at).toLocaleString('en-MT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
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
                    <td>
                      <button
                        className={`btn-resend ${resendState === 'sent' ? 'sent' : ''}`}
                        disabled={resendState === 'sending'}
                        onClick={() => resendTicket(a.order_id)}
                      >
                        {resendState === 'sending' ? 'Sending…'
                          : resendState === 'sent'  ? '✓ Sent'
                          : resendState === 'error' ? 'Retry'
                          : '↩ Resend'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
