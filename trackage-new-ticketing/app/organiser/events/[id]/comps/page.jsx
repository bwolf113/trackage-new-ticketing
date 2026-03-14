/* app/organiser/events/[id]/comps/page.jsx — Issue Complimentary Tickets */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function blankRow() {
  return { _id: uid(), first_name: '', last_name: '', email: '', ticket_id: '', quantity: '1' };
}

const CSS = `
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-mid); text-decoration: none; margin-bottom: 20px; }
.back-link:hover { color: var(--text); }
.page-header { margin-bottom: 28px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.page-sub { font-size: 13px; color: var(--text-mid); }
.comp-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.comp-hint { display: flex; align-items: flex-start; gap: 10px; background: #f0fdf9; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #065f46; line-height: 1.5; }
.comp-hint-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.attendees-header { display: grid; grid-template-columns: 1fr 1fr 2fr 1fr auto auto; gap: 10px; align-items: center; padding: 0 0 8px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
.col-label { font-size: 11px; font-weight: 600; color: var(--text-mid); text-transform: uppercase; letter-spacing: 0.05em; }
.attendee-row { display: grid; grid-template-columns: 1fr 1fr 2fr 1fr auto auto; gap: 10px; align-items: center; margin-bottom: 10px; }
.field { width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff; outline: none; box-sizing: border-box; }
.field:focus { border-color: var(--accent); }
.field.error { border-color: #ef4444; }
.qty-field { width: 100%; padding: 9px 8px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff; outline: none; box-sizing: border-box; text-align: center; }
.qty-field:focus { border-color: var(--accent); }
.select-field { width: 100%; padding: 9px 10px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'Inter', sans-serif; color: var(--text); background: #fff; outline: none; box-sizing: border-box; cursor: pointer; appearance: none; }
.select-field:focus { border-color: var(--accent); }
.btn-remove { width: 32px; height: 32px; border: 1.5px solid var(--border); border-radius: 7px; background: #fff; color: #9ca3af; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; line-height: 1; }
.btn-remove:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
.btn-remove:disabled { opacity: 0.3; cursor: not-allowed; }
.row-status { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
.btn-add { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border: 1.5px dashed var(--border); border-radius: 8px; background: transparent; color: var(--text-mid); font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s; margin-top: 4px; }
.btn-add:hover { border-color: var(--accent); color: var(--accent); background: #f0fdf9; }
.footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
.footer-count { font-size: 13px; color: var(--text-mid); }
.btn-send { display: inline-flex; align-items: center; gap: 8px; padding: 11px 28px; background: var(--accent); color: #fff; border: none; border-radius: 9px; font-size: 14px; font-weight: 600; font-family: 'Inter', sans-serif; cursor: pointer; transition: background 0.15s; }
.btn-send:hover { background: var(--accent-dark); }
.btn-send:disabled { opacity: 0.6; cursor: not-allowed; }
.result-banner { border-radius: 10px; padding: 14px 18px; font-size: 14px; font-weight: 500; margin-bottom: 20px; }
.result-banner.success { background: #f0fdf9; border: 1px solid #a7f3d0; color: #065f46; }
.result-banner.error   { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.result-banner.partial { background: #fffbeb; border: 1px solid #fde68a; color: #713f12; }
.failed-list { margin-top: 8px; font-size: 12px; opacity: 0.85; }
@media(max-width:700px) {
  .attendees-header { display: none; }
  .attendee-row { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto auto; }
  .attendee-row .email-wrap { grid-column: 1 / -1; }
  .attendee-row .actions-wrap { display: flex; gap: 8px; grid-column: 1 / -1; }
}
`;

export default function IssueCompsPage() {
  const { id: eventId } = useParams();
  const router = useRouter();

  const [event,   setEvent]   = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rows,    setRows]    = useState([blankRow()]);
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState(null); // { sent, failed, results }
  const [rowStatus, setRowStatus] = useState({}); // _id -> 'sent' | 'failed'

  useEffect(() => {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) { router.push('/organiser/login'); return; }

    fetch(`/api/organiser/events/${eventId}?organiser_id=${organiser_id}`)
      .then(r => r.json())
      .then(json => {
        setEvent(json.event || null);
        setTickets(json.tickets || []);
        // Pre-fill ticket_id with first ticket
        if (json.tickets?.length) {
          setRows([{ ...blankRow(), ticket_id: json.tickets[0].id }]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId]);

  function updateRow(id, field, value) {
    setRows(r => r.map(row => row._id === id ? { ...row, [field]: value } : row));
  }

  function addRow() {
    const defaultTicket = tickets[0]?.id || '';
    setRows(r => [...r, { ...blankRow(), ticket_id: defaultTicket }]);
  }

  function removeRow(id) {
    setRows(r => r.filter(row => row._id !== id));
  }

  async function handleSend() {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) return;

    // Basic validation
    const valid = rows.filter(r => r.first_name.trim() && r.email.trim());
    if (!valid.length) return;

    setSending(true);
    setResult(null);
    setRowStatus({});

    try {
      const res = await fetch('/api/organiser/issue-comp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organiser_id,
          event_id: eventId,
          attendees: valid.map(r => ({
            first_name: r.first_name.trim(),
            last_name:  r.last_name.trim(),
            email:      r.email.trim(),
            ticket_id:  r.ticket_id || tickets[0]?.id,
            quantity:   parseInt(r.quantity) || 1,
          })),
        }),
      });

      const json = await res.json();
      setResult(json);

      // Map row statuses by email
      const statusByEmail = {};
      for (const r of json.results || []) {
        statusByEmail[r.email] = r.success ? 'sent' : 'failed';
      }
      const newStatus = {};
      for (const row of valid) {
        newStatus[row._id] = statusByEmail[row.email.trim()] || 'failed';
      }
      setRowStatus(newStatus);

      // Clear successfully sent rows after a moment
      if (json.sent > 0) {
        setTimeout(() => {
          const sentEmails = new Set(
            (json.results || []).filter(r => r.success).map(r => r.email)
          );
          setRows(prev => {
            const remaining = prev.filter(r => !sentEmails.has(r.email.trim()));
            const defaultTicket = tickets[0]?.id || '';
            return remaining.length ? remaining : [{ ...blankRow(), ticket_id: defaultTicket }];
          });
          setRowStatus({});
        }, 2500);
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    }

    setSending(false);
  }

  const validRows    = rows.filter(r => r.first_name.trim() && r.email.trim());
  const canSend      = !sending && validRows.length > 0;

  return (
    <>
      <style>{CSS}</style>
      <Link href={`/organiser/events/${eventId}/orders`} className="back-link">← Back to Orders</Link>

      <div className="page-header">
        <div className="page-title">
          {loading ? 'Loading…' : `Issue Complimentary Tickets — ${event?.name || ''}`}
        </div>
        <div className="page-sub">Send free tickets directly to guests via email.</div>
      </div>

      {result && (
        <div className={`result-banner ${result.sent > 0 && result.failed === 0 ? 'success' : result.sent > 0 ? 'partial' : 'error'}`}>
          {result.sent > 0 && result.failed === 0 && `✓ ${result.tickets_sent} ticket${result.tickets_sent !== 1 ? 's' : ''} sent successfully.`}
          {result.sent > 0 && result.failed > 0  && `✓ ${result.tickets_sent} ticket${result.tickets_sent !== 1 ? 's' : ''} sent, ${result.failed} recipient${result.failed !== 1 ? 's' : ''} failed.`}
          {result.sent === 0 && `Failed to send tickets. ${result.error || ''}`}
          {result.failed > 0 && (
            <div className="failed-list">
              {(result.results || []).filter(r => !r.success).map(r => (
                <div key={r.email}>✗ {r.email}: {r.error}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="comp-card">
        <div className="comp-hint">
          <span className="comp-hint-icon">💡</span>
          <span>
            Add as many recipients as you like below — each person will receive their own complimentary ticket email with a unique QR code. Fill in their name, email, choose the ticket type, and set the quantity before clicking <strong>Send Tickets</strong>.
          </span>
        </div>

        {/* Column headers (desktop) */}
        {!loading && (
          <div className="attendees-header">
            <span className="col-label">First Name</span>
            <span className="col-label">Last Name</span>
            <span className="col-label">Email</span>
            <span className="col-label">Ticket Type</span>
            <span className="col-label">Qty</span>
            <span></span>
          </div>
        )}

        {/* Attendee rows */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2].map(i => (
              <div key={i} style={{ height: 40, borderRadius: 8, background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
            ))}
          </div>
        ) : (
          rows.map(row => {
            const status = rowStatus[row._id];
            return (
              <div key={row._id} className="attendee-row">
                <input
                  type="text"
                  className="field"
                  placeholder="First name"
                  value={row.first_name}
                  onChange={e => updateRow(row._id, 'first_name', e.target.value)}
                  disabled={sending}
                />
                <input
                  type="text"
                  className="field"
                  placeholder="Last name"
                  value={row.last_name}
                  onChange={e => updateRow(row._id, 'last_name', e.target.value)}
                  disabled={sending}
                />
                <input
                  type="email"
                  className={`field email-wrap ${!row.email || row.email.includes('@') ? '' : 'error'}`}
                  placeholder="Email address"
                  value={row.email}
                  onChange={e => updateRow(row._id, 'email', e.target.value)}
                  disabled={sending}
                />
                <select
                  className="select-field"
                  value={row.ticket_id}
                  onChange={e => updateRow(row._id, 'ticket_id', e.target.value)}
                  disabled={sending}
                >
                  {tickets.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className="qty-field"
                  min="1"
                  max="20"
                  value={row.quantity}
                  onChange={e => updateRow(row._id, 'quantity', e.target.value)}
                  disabled={sending}
                />
                <div className="actions-wrap" style={{ display: 'flex', gap: 4 }}>
                  {status ? (
                    <div className="row-status">
                      {status === 'sent'   ? '✅' : '❌'}
                    </div>
                  ) : (
                    <button
                      className="btn-remove"
                      onClick={() => removeRow(row._id)}
                      disabled={sending || rows.length === 1}
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {!loading && (
          <button className="btn-add" onClick={addRow} disabled={sending}>
            + Add another recipient
          </button>
        )}

        <div className="footer">
          <div className="footer-count">
            {validRows.length} recipient{validRows.length !== 1 ? 's' : ''} ready to send
          </div>
          <button className="btn-send" onClick={handleSend} disabled={!canSend}>
            {sending ? 'Sending…' : 'Send Ticket(s)'}
          </button>
        </div>
      </div>
    </>
  );
}
