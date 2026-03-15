/* app/organiser/events/[id]/attendees/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { orgFetch } from '../../../../../lib/organiserFetch';

function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}
function fmtComp(n) {
  if (!n || n === 0) return '€0 (Free/Comp)';
  return fmt(n);
}
function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-MT', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CSS = `
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); font-weight: 500; text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--black); }
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 800; color: var(--black); margin-bottom: 4px; letter-spacing: -0.02em; }
.page-sub { font-size: 14px; color: var(--muted); font-weight: 500; }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-wrap input { width: 100%; padding: 9px 13px 9px 34px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500; outline: none; background: var(--surface); }
.search-wrap input:focus { border-color: var(--black); }
.search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; }
.count-label { font-size: 13px; color: var(--muted); font-weight: 500; white-space: nowrap; }
.btn-export { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: all 0.15s; }
.btn-export:hover { border-color: var(--black); color: var(--black); }
.table-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); background: var(--bg); border-bottom: 1.5px solid var(--border); }
td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; color: var(--black); vertical-align: middle; font-weight: 500; }
tr:hover td { background: var(--bg); }
.mono { font-family: monospace; font-size: 12px; color: var(--muted); }
.empty-state { text-align: center; padding: 56px 20px; color: var(--muted); font-size: 14px; font-weight: 500; }
.btn-resend { padding: 5px 11px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--muted); font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: all 0.15s; }
.btn-resend:hover { border-color: var(--black); color: var(--black); }
.btn-resend:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-resend.sent { border-color: var(--green); color: var(--green); background: var(--green-dim); }
.skel { height: 14px; border-radius: 8px; background: linear-gradient(90deg, var(--border) 25%, var(--bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.checkin-done { font-size: 12px; color: var(--green); font-weight: 700; }
.checkin-partial { font-size: 12px; color: #92400e; font-weight: 500; }
.checkin-none { font-size: 12px; color: var(--muted); font-weight: 500; }
.btn-checkin { padding: 5px 11px; border: 1.5px solid var(--green); border-radius: 8px; background: var(--green-dim); color: var(--green); font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: all 0.15s; }
.btn-checkin:hover { background: rgba(72,193,110,0.2); }
.btn-checkin:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-undo { padding: 4px 10px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--muted); font-size: 11px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: all 0.15s; margin-top: 4px; }
.btn-undo:hover { border-color: #ef4444; color: #ef4444; }
.btn-undo:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export default function OrgAttendeesPage() {
  const { id: eventId } = useParams();
  const router = useRouter();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
    const [resending,  setResending]  = useState({}); // order_id → 'sending' | 'sent' | 'error'
  const [checkingIn, setCheckingIn] = useState({}); // order_id → 'loading' | 'done'
  const [undoing,    setUndoing]    = useState({}); // order_id → 'loading' | 'done'

  useEffect(() => {
    if (!localStorage.getItem('organiser_id')) { router.push('/organiser/login'); return; }

    orgFetch(`/api/organiser/events/${eventId}/attendees`)
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
    setCheckingIn(c => ({ ...c, [orderId]: 'loading' }));
    try {
      const res  = await orgFetch(`/api/organiser/events/${eventId}/attendees`, {
        method:  'PATCH',
        body:    JSON.stringify({ order_id: orderId }),
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

  async function undoCheckIn(orderId) {
    setUndoing(u => ({ ...u, [orderId]: 'loading' }));
    try {
      const res  = await orgFetch(`/api/organiser/events/${eventId}/attendees`, {
        method: 'PATCH',
        body:   JSON.stringify({ order_id: orderId, undo: true }),
      });
      const json = await res.json();
      if (json.success) {
        setData(prev => ({
          ...prev,
          attendees: prev.attendees.map(a =>
            a.order_id === orderId
              ? { ...a, checked_in_at: null, checkin_count: 0 }
              : a
          ),
        }));
      }
    } finally {
      setUndoing(u => ({ ...u, [orderId]: 'done' }));
    }
  }

  async function resendTicket(orderId) {
    setResending(r => ({ ...r, [orderId]: 'sending' }));
    try {
      const res  = await orgFetch('/api/organiser/resend-ticket', {
        method:  'POST',
        body:    JSON.stringify({ order_id: orderId }),
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
                    <td style={{ fontWeight: 600 }}>{a.name}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{a.email}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{a.ticket_summary || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmtComp(a.total)}</td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{fmtDate(a.created_at)}</td>
                    <td>
                      {allCheckedIn ? (
                        <div>
                          <div className="checkin-done">✓ Checked in</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginTop: 2 }}>
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
