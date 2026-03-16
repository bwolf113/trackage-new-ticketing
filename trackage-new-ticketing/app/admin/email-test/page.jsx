/* app/admin/email-test/page.jsx */
'use client';
import { useState, useEffect, useRef } from 'react';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F6FA;--surface:#FFFFFF;--border:#EBEDF0;
  --muted:#767C8C;--green:#48C16E;--green-dim:rgba(72,193,110,0.12);
  --black:#000000;--danger:#ef4444;--danger-bg:#fef2f2;
  --success:#16a34a;--success-bg:#dcfce7;
}
body{font-family:'Plus Jakarta Sans',sans-serif;color:var(--black);background:var(--bg)}

.page{display:grid;grid-template-columns:340px 1fr;min-height:100vh;gap:0}

/* ── LEFT PANEL ── */
.left{background:var(--surface);border-right:1.5px solid var(--border);display:flex;flex-direction:column;height:100vh;position:sticky;top:0;overflow-y:auto}
.left-header{padding:24px 24px 20px;border-bottom:1.5px solid var(--border)}
.left-title{font-size:18px;font-weight:800;color:var(--black);margin-bottom:3px;letter-spacing:-0.02em}
.left-sub{font-size:13px;color:var(--muted)}

/* templates */
.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);padding:20px 24px 8px}
.template-btn{width:100%;display:flex;align-items:center;gap:12px;padding:12px 24px;background:none;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:background 0.1s;text-align:left;border-left:3px solid transparent}
.template-btn:hover{background:var(--bg)}
.template-btn.active{background:var(--green-dim);border-left-color:var(--green)}
.template-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.template-name{font-size:13px;font-weight:600;color:var(--black);margin-bottom:2px}
.template-desc{font-size:11px;color:var(--muted)}

/* send form */
.send-section{padding:20px 24px;border-top:1.5px solid var(--border);margin-top:auto}
.send-label{font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em}
.send-input{width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:'Plus Jakarta Sans',sans-serif;color:var(--black);background:var(--surface);outline:none;margin-bottom:10px;transition:border-color 0.15s}
.send-input:focus{border-color:var(--black)}
.send-btn{width:100%;padding:11px;background:var(--black);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:opacity 0.15s;display:flex;align-items:center;justify-content:center;gap:8px}
.send-btn:hover:not(:disabled){opacity:0.85}
.send-btn:disabled{opacity:0.5;cursor:not-allowed}
.send-btn.sending{position:relative;overflow:hidden}
.send-btn.sending::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);animation:shimmer 1s infinite}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}

.result{margin-top:10px;padding:10px 12px;border-radius:8px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:7px}
.result.success{background:var(--success-bg);color:var(--success)}
.result.error{background:var(--danger-bg);color:var(--danger)}

/* mock data card */
.mock-card{margin:16px 24px 0;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:12px 14px}
.mock-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:8px}
.mock-row{display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px}
.mock-row:last-child{margin-bottom:0}
.mock-key{color:var(--muted)}
.mock-val{font-weight:600;color:var(--black);text-align:right;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ── RIGHT PANEL ── */
.right{display:flex;flex-direction:column;background:var(--border)}
.preview-bar{background:var(--surface);border-bottom:1.5px solid var(--border);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.preview-title{font-size:13px;font-weight:600;color:var(--muted)}
.preview-actions{display:flex;gap:8px}
.action-btn{display:flex;align-items:center;gap:5px;padding:6px 12px;border:1.5px solid var(--border);border-radius:6px;background:var(--surface);font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s;text-decoration:none}
.action-btn:hover{border-color:var(--black);color:var(--black)}

.preview-device-bar{background:var(--surface);border-bottom:1.5px solid var(--border);padding:8px 20px;display:flex;gap:6px;flex-shrink:0}
.device-btn{padding:5px 12px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface);font-size:12px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all 0.15s}
.device-btn.active{background:var(--black);border-color:var(--black);color:#fff}

.preview-wrap{flex:1;overflow:auto;padding:24px;display:flex;justify-content:center;align-items:flex-start}
.preview-frame-wrap{background:var(--surface);border-radius:4px;box-shadow:0 4px 24px rgba(0,0,0,0.12);overflow:hidden;transition:width 0.3s}
.preview-frame-wrap.desktop{width:100%;max-width:700px}
.preview-frame-wrap.mobile{width:375px}
.preview-frame-wrap.tablet{width:600px}

iframe{width:100%;border:none;display:block}

/* loading */
.loading{display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:13px;gap:8px;flex-direction:column}
.spin{width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--black);border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

@media(max-width:900px){.page{grid-template-columns:1fr}.right{min-height:50vh}.left{height:auto;position:static}}
`;

const TEMPLATES = [
  {
    id:    'ticket_confirmation',
    name:  'Ticket Confirmation',
    desc:  'Sent to buyer — QR code shown in email body, no attachment',
    icon:  '🎫',
    iconBg:'#f0fdf9',
  },
  {
    id:    'booking_fee_receipt',
    name:  'Booking Fee Receipt',
    desc:  'Itemised receipt for the booking fee, sent to buyer',
    icon:  '🧾',
    iconBg:'#eff6ff',
  },
  {
    id:    'admin_notification',
    name:  'Admin New Order',
    desc:  'Sent to admin when a new order is completed',
    icon:  '💰',
    iconBg:'#fffbeb',
  },
];

const MOCK_SUMMARY = [
  { k: 'Customer',  v: 'Marco Borg' },
  { k: 'Email',     v: 'marco.borg@example.com' },
  { k: 'Event',     v: 'Bass Culture Vol. 14' },
  { k: 'Tickets',   v: '2× General Admission' },
  { k: 'Total',     v: '€32.40' },
  { k: 'Order ref', v: '#TEST-000' },
];

export default function EmailTestPage() {
  const [template,   setTemplate]   = useState('ticket_confirmation');
  const [toEmail,    setToEmail]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [device,     setDevice]     = useState('desktop');
  const [previewSrc, setPreviewSrc] = useState('');
  const [frameH,     setFrameH]     = useState(600);
  const iframeRef = useRef(null);

  useEffect(() => { loadPreview(); }, [template]);

  async function loadPreview() {
    setPreviewSrc(`/api/send-test-email?template=${template}&t=${Date.now()}`);
  }

  function onIframeLoad() {
    try {
      const h = iframeRef.current?.contentDocument?.body?.scrollHeight;
      if (h) setFrameH(h + 40);
    } catch {}
  }

  const [sendingAll,  setSendingAll]  = useState(false);
  const [allResults,  setAllResults]  = useState(null);

  async function handleSend() {
    if (!toEmail.trim() || !toEmail.includes('@')) {
      setResult({ type: 'error', msg: 'Enter a valid email address first' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/send-test-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: toEmail.trim(), template }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: 'success', msg: `✓ Sent to ${toEmail}` });
      } else {
        setResult({ type: 'error', msg: data.error || 'Send failed' });
      }
    } catch (err) {
      setResult({ type: 'error', msg: err.message });
    }
    setSending(false);
  }

  async function handleSendAll() {
    if (!toEmail.trim() || !toEmail.includes('@')) {
      setAllResults({ type: 'error', msg: 'Enter a valid email address first' });
      return;
    }
    setSendingAll(true);
    setAllResults(null);
    const results = [];
    for (const t of TEMPLATES) {
      try {
        const res  = await fetch('/api/send-test-email', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ to: toEmail.trim(), template: t.id }),
        });
        const data = await res.json();
        results.push({ name: t.name, success: !!data.success, error: data.error });
      } catch (err) {
        results.push({ name: t.name, success: false, error: err.message });
      }
    }
    setSendingAll(false);
    const allOk = results.every(r => r.success);
    setAllResults({ type: allOk ? 'success' : 'error', results });
  }

  function handleRefresh() {
    setPreviewSrc(`/api/send-test-email?template=${template}&t=${Date.now()}`);
  }

  function handleOpenNew() {
    window.open(`/api/send-test-email?template=${template}`, '_blank');
  }

  const activeTemplate = TEMPLATES.find(t => t.id === template);

  return (
    <div className="page">
      <style>{CSS}</style>

      {/* ── LEFT ── */}
      <div className="left">
        <div className="left-header">
          <div className="left-title">Email Tester</div>
          <div className="left-sub">Preview and send test emails without going through checkout</div>
        </div>

        <div className="section-label">Templates</div>
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            className={`template-btn ${template === t.id ? 'active' : ''}`}
            onClick={() => { setTemplate(t.id); setResult(null); }}
          >
            <div className="template-icon" style={{ background: t.iconBg }}>{t.icon}</div>
            <div>
              <div className="template-name">{t.name}</div>
              <div className="template-desc">{t.desc}</div>
            </div>
          </button>
        ))}

        {/* Mock data summary */}
        <div className="mock-card">
          <div className="mock-title">Mock data used</div>
          {MOCK_SUMMARY.map(r => (
            <div key={r.k} className="mock-row">
              <span className="mock-key">{r.k}</span>
              <span className="mock-val">{r.v}</span>
            </div>
          ))}
        </div>

        {/* Send form */}
        <div className="send-section">
          <div className="send-label">Send test to</div>
          <input
            type="email"
            className="send-input"
            placeholder="your@email.com"
            value={toEmail}
            onChange={e => { setToEmail(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            className={`send-btn ${sending ? 'sending' : ''}`}
            disabled={sending || sendingAll || !toEmail.trim()}
            onClick={handleSend}
          >
            {sending ? (
              <><div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} /> Sending…</>
            ) : (
              <>↗ Send {activeTemplate?.name}</>
            )}
          </button>

          <button
            style={{ width:'100%',marginTop:8,padding:'10px',background:'#1a1a1a',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,fontFamily:"'Plus Jakarta Sans',sans-serif",cursor:(sendingAll||sending||!toEmail.trim())?'not-allowed':'pointer',opacity:(sendingAll||sending||!toEmail.trim())?0.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}
            disabled={sending || sendingAll || !toEmail.trim()}
            onClick={handleSendAll}
          >
            {sendingAll ? (
              <><div style={{ width:13,height:13,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} /> Sending all…</>
            ) : (
              <>⚡ Send all templates at once</>
            )}
          </button>

          {result && (
            <div className={`result ${result.type}`}>
              {result.type === 'success' ? '✓' : '✗'} {result.msg}
            </div>
          )}

          {allResults && (
            <div style={{ marginTop:10 }}>
              {allResults.type === 'error' && !allResults.results && (
                <div className="result error">✗ {allResults.msg}</div>
              )}
              {allResults.results && allResults.results.map((r,i) => (
                <div key={i} className={`result ${r.success ? 'success' : 'error'}`} style={{ marginBottom:4, fontSize:11 }}>
                  {r.success ? '✓' : '✗'} {r.name}{!r.success && r.error ? ` — ${r.error}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: preview ── */}
      <div className="right">
        <div className="preview-bar">
          <div className="preview-title">
            Preview — {activeTemplate?.name}
          </div>
          <div className="preview-actions">
            <button className="action-btn" onClick={handleRefresh}>↺ Refresh</button>
            <button className="action-btn" onClick={handleOpenNew}>⬡ Open in new tab</button>
          </div>
        </div>

        <div className="preview-device-bar">
          {[
            { id: 'desktop', label: '🖥 Desktop' },
            { id: 'tablet',  label: '▭ Tablet' },
            { id: 'mobile',  label: '📱 Mobile' },
          ].map(d => (
            <button
              key={d.id}
              className={`device-btn ${device === d.id ? 'active' : ''}`}
              onClick={() => setDevice(d.id)}
            >{d.label}</button>
          ))}
        </div>

        <div className="preview-wrap">
          <div className={`preview-frame-wrap ${device}`}>
            {previewSrc ? (
              <iframe
                ref={iframeRef}
                src={previewSrc}
                height={frameH}
                onLoad={onIframeLoad}
                title="Email preview"
              />
            ) : (
              <div className="loading">
                <div className="spin" />
                Loading preview…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
