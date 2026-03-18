/* app/admin/emails/page.jsx */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

const MT = { timeZone: 'Europe/Malta' };
function fmtDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-MT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', ...MT,
  });
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #F5F6FA; --surface: #FFFFFF; --border: #EBEDF0;
  --muted: #767C8C; --black: #000000;
  --green: #48C16E; --green-dim: rgba(72,193,110,0.12);
  --danger: #ef4444; --danger-bg: rgba(239,68,68,0.10);
}
body { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); background: var(--bg); }

.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
.page-subtitle { font-size: 14px; color: var(--muted); margin-top: 2px; font-weight: 500; }

.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; }
.search-wrap input { width: 100%; padding: 9px 12px 9px 36px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; background: var(--surface); outline: none; }
.search-wrap input:focus { border-color: var(--black); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-size: 15px; color: var(--muted); pointer-events: none; }
.filter-select { padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; background: var(--surface); cursor: pointer; outline: none; }
.filter-select:focus { border-color: var(--black); }

.card { background: var(--surface); border-radius: 12px; border: 1.5px solid var(--border); overflow: hidden; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 600px; }
thead tr { background: var(--bg); }
th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); white-space: nowrap; }
td { padding: 12px 16px; font-size: 13px; border-top: 1px solid var(--border); vertical-align: middle; }
tr:hover td { background: #fafafa; }

.badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.badge-sent   { background: var(--green-dim); color: #166534; }
.badge-failed { background: var(--danger-bg); color: var(--danger); }

.to-email { font-weight: 600; color: var(--black); }
.subject  { color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
.provider { font-size: 11px; color: var(--muted); text-transform: capitalize; }
.error-text { font-size: 11px; color: var(--danger); margin-top: 2px; }

.empty { padding: 48px; text-align: center; color: var(--muted); font-size: 14px; }

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-top: 1px solid var(--border); font-size: 13px; color: var(--muted); gap: 12px; flex-wrap: wrap; }
.pag-btns { display: flex; gap: 6px; }
.btn { padding: 7px 14px; border-radius: 7px; border: 1.5px solid var(--border); font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; background: var(--surface); transition: border-color 0.15s; }
.btn:hover:not(:disabled) { border-color: var(--black); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export default function EmailLogsPage() {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, ...(search && { search }), ...(status && { status }) });
    const res  = await adminFetch(`/api/admin/email-logs?${params}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <style>{CSS}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Email Log</div>
          <div className="page-subtitle">{total.toLocaleString()} emails sent</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by recipient or subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="empty">Loading…</td></tr>
              ) : !logs.length ? (
                <tr><td colSpan={5} className="empty">No emails found.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td className="to-email">{log.to_email}</td>
                  <td>
                    <div className="subject">{log.subject || '—'}</div>
                    {log.error && <div className="error-text">{log.error}</div>}
                  </td>
                  <td>
                    <span className={`badge badge-${log.status}`}>
                      {log.status === 'sent' ? '✓ Sent' : '✕ Failed'}
                    </span>
                  </td>
                  <td className="provider">{log.provider || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>{fmtDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <span>Page {page} of {totalPages}</span>
            <div className="pag-btns">
              <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
