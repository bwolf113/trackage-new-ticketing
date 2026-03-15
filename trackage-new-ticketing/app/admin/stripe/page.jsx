/* app/admin/stripe/page.jsx */
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

/* ─── styles ──────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #F5F6FA;
  --surface:   #FFFFFF;
  --border:    #EBEDF0;
  --muted:     #767C8C;
  --green:     #48C16E;
  --green-dim: rgba(72,193,110,0.12);
  --black:     #000000;
  --white:     #FFFFFF;
  --danger:    #ef4444;
  --danger-bg: rgba(239,68,68,0.1);
  --warn:      #d97706;
  --warn-bg:   #fffbeb;
  --stripe:    #635bff;
  --stripe-bg: #f0efff;
}
body { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--black); background: var(--bg); }

.page-header  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
.page-title   { font-size: 24px; font-weight: 800; color: var(--black); letter-spacing: -0.02em; }
.page-sub     { font-size: 14px; color: var(--muted); margin-top: 2px; font-weight: 500; }

.status-banner { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 16px; border: 1.5px solid; margin-bottom: 28px; }
.status-banner.connected    { background: var(--green-dim); border-color: var(--green); }
.status-banner.disconnected { background: var(--warn-bg);   border-color: #fcd34d; }
.banner-icon  { font-size: 26px; flex-shrink: 0; }
.banner-title { font-size: 15px; font-weight: 700; color: var(--black); margin-bottom: 2px; }
.banner-sub   { font-size: 13px; color: var(--muted); font-weight: 500; }
.banner-badge { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.badge-live { background: var(--green-dim); color: var(--green); }
.badge-test { background: var(--warn-bg);   color: var(--warn); border: 1px solid #fcd34d; }
.badge-dot  { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

.settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }

.card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
.card-header { padding: 18px 22px 14px; border-bottom: 1.5px solid var(--border); display: flex; align-items: center; gap: 10px; }
.card-icon   { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.card-icon.stripe  { background: var(--stripe-bg); }
.card-icon.webhook { background: #fef3c7; }
.card-title  { font-size: 15px; font-weight: 700; color: var(--black); letter-spacing: -0.01em; }
.card-sub    { font-size: 12px; color: var(--muted); margin-top: 1px; font-weight: 500; }
.card-body   { padding: 20px 22px; }
.card-footer { padding: 14px 22px; border-top: 1.5px solid var(--border); background: var(--bg); display: flex; align-items: center; justify-content: flex-end; gap: 10px; }

.field       { margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field label { display: block; font-size: 13px; font-weight: 600; color: var(--black); margin-bottom: 5px; }
.field-hint  { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.5; font-weight: 500; }
.input-wrap  { position: relative; }
.input-wrap input {
  width: 100%; border: 1.5px solid var(--border); border-radius: 8px;
  padding: 8px 12px; font-size: 14px; color: var(--black);
  font-family: 'Plus Jakarta Sans', sans-serif; background: var(--surface); outline: none;
  transition: border-color 0.15s;
}
.input-wrap input.mono { font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 0.02em; }
.input-wrap input:focus { border-color: var(--black); }

.value-display { background: var(--bg); border: 1.5px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--muted); font-family: 'Courier New', monospace; letter-spacing: 0.02em; word-break: break-all; }

.btn-primary   { display: inline-flex; align-items: center; gap: 7px; background: var(--black); color: var(--white); border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: opacity 0.15s; white-space: nowrap; }
.btn-primary:hover   { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { display: inline-flex; align-items: center; gap: 7px; background: var(--surface); color: var(--muted); border: 1.5px solid var(--border); border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; white-space: nowrap; }
.btn-secondary:hover { border-color: var(--black); color: var(--black); }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.webhook-events { display: flex; flex-direction: column; gap: 6px; }
.webhook-event  { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; background: var(--bg); border: 1.5px solid var(--border); border-radius: 8px; }
.webhook-event-name { font-size: 13px; font-family: 'Courier New', monospace; color: var(--black); }
.webhook-event-badge { font-size: 11px; font-weight: 700; color: var(--green); background: var(--green-dim); padding: 2px 10px; border-radius: 100px; }

.alert { display: flex; gap: 10px; padding: 12px 14px; border-radius: 8px; font-size: 13px; line-height: 1.5; margin-bottom: 16px; font-weight: 500; }
.alert.warn { background: var(--warn-bg); border: 1px solid #fcd34d; color: #92400e; }
.alert.info { background: var(--green-dim); border: 1px solid var(--green); color: var(--green); }
.alert-icon { flex-shrink: 0; font-size: 15px; margin-top: 1px; }

.copy-row { display: flex; gap: 8px; align-items: center; }
.copy-row .value-display { flex: 1; }
.copy-btn { background: var(--bg); border: 1.5px solid var(--border); color: var(--muted); border-radius: 8px; padding: 7px 12px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; transition: all 0.15s; }
.copy-btn:hover { border-color: var(--black); color: var(--black); }
.copy-btn.copied { background: var(--green-dim); border-color: var(--green); color: var(--green); }

.test-result { margin-top: 14px; padding: 12px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.test-result.success { background: var(--green-dim); color: var(--green); border: 1px solid var(--green); }
.test-result.fail    { background: var(--danger-bg); color: var(--danger); border: 1px solid #fca5a5; }

.mode-toggle { display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
.mode-btn { flex: 1; padding: 10px 12px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s; text-align: center; }
.mode-btn.live.active { background: var(--black); color: var(--white); }
.mode-btn.test.active { background: var(--warn); color: var(--white); }
.mode-btn:not(.active) { background: var(--surface); color: var(--muted); }
.mode-btn:not(.active):hover { background: var(--bg); color: var(--black); }
.mode-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 100px; }
.mode-label.live { background: var(--green-dim); color: var(--green); }
.mode-label.test { background: var(--warn-bg); color: var(--warn); }

.divider { height: 1px; background: var(--border); margin: 18px 0; }

.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--black); color: var(--white); padding: 12px 20px; border-radius: 9px; font-size: 14px; font-weight: 600; z-index: 999; white-space: nowrap; animation: toastIn 0.2s ease; }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;

const WEBHOOK_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'checkout.session.completed',
  'checkout.session.expired',
  'charge.refunded',
  'charge.dispute.created',
];

/* ─── blank key sets ─────────────────────────────────────────────── */
const BLANK_KEYS = () => ({
  publishable_key: '',
  secret_key:      '',
  webhook_secret:  '',
});

export default function StripePage() {
  const [mode,       setModeState] = useState('live'); // currently viewed mode
  const [activeMode, setActiveMode] = useState('live'); // saved/active mode
  const [liveKeys,   setLiveKeys]  = useState(BLANK_KEYS());
  const [testKeys,   setTestKeys]  = useState(BLANK_KEYS());
  const [accountId,  setAccountId] = useState('acct_1LcQItIxmo2VU0SW');

  const [saving,     setSaving]    = useState(false);
  const [testing,    setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [toast,      setToast]     = useState('');
  const [copied,     setCopied]    = useState(null);
  const [loaded,     setLoaded]    = useState(false);

  // Current keys being edited = whichever mode tab is selected
  const currentKeys = mode === 'live' ? liveKeys : testKeys;
  const setCurrentKeys = mode === 'live' ? setLiveKeys : setTestKeys;

  useEffect(() => { loadSettings(); }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function loadSettings() {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'stripe')
        .single();
      if (data?.value) {
        const v = data.value;
        setAccountId(v.account_id || 'acct_1LcQItIxmo2VU0SW');
        setActiveMode(v.active_mode || 'live');
        setModeState(v.active_mode || 'live');
        setLiveKeys({
          publishable_key: v.live?.publishable_key || '',
          secret_key:      v.live?.secret_key      || '',
          webhook_secret:  v.live?.webhook_secret  || '',
        });
        setTestKeys({
          publishable_key: v.test?.publishable_key || '',
          secret_key:      v.test?.secret_key      || '',
          webhook_secret:  v.test?.webhook_secret  || '',
        });
      }
    } catch {
      // first time — no settings yet
    }
    setLoaded(true);
  }

  async function handleSave() {
    if (!currentKeys.publishable_key.trim()) return showToast('⚠ Publishable key is required');
    if (!currentKeys.secret_key.trim())      return showToast('⚠ Secret key is required');

    // Validate key prefixes match the selected mode
    const pk = currentKeys.publishable_key.trim();
    const sk = currentKeys.secret_key.trim();
    if (mode === 'live' && (!pk.startsWith('pk_live_') || !sk.startsWith('sk_live_')))
      return showToast('⚠ Live mode requires pk_live_ and sk_live_ keys');
    if (mode === 'test' && (!pk.startsWith('pk_test_') || !sk.startsWith('sk_test_')))
      return showToast('⚠ Test mode requires pk_test_ and sk_test_ keys');

    setSaving(true);
    try {
      // Merge current edits into the full payload
      const updatedLive = mode === 'live' ? { ...currentKeys } : { ...liveKeys };
      const updatedTest = mode === 'test' ? { ...currentKeys } : { ...testKeys };

      const payload = {
        account_id:  accountId,
        active_mode: mode,           // whichever tab you're saving becomes the active mode
        live:        updatedLive,
        test:        updatedTest,
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'stripe', value: payload }, { onConflict: 'key' });
      if (error) throw error;

      setActiveMode(mode);
      if (mode === 'live') setLiveKeys(updatedLive);
      else setTestKeys(updatedTest);

      showToast(`✓ ${mode === 'live' ? 'Live' : 'Test'} keys saved — ${mode === 'live' ? 'Live' : 'Test'} mode is now active`);
    } catch (err) {
      showToast('⚠ ' + (err.message || 'Failed to save'));
    }
    setSaving(false);
  }

  async function handleTest() {
    const sk = currentKeys.secret_key.trim();
    const pk = currentKeys.publishable_key.trim();
    if (!sk) return showToast("⚠ Enter your secret key first");

    // Enforce correct key prefix for the selected mode
    const expectedSkPrefix = mode === "live" ? "sk_live_" : "sk_test_";
    const expectedPkPrefix = mode === "live" ? "pk_live_" : "pk_test_";
    if (!sk.startsWith(expectedSkPrefix))
      return showToast(`⚠ Secret key must start with ${expectedSkPrefix} for ${mode} mode`);
    if (pk && !pk.startsWith(expectedPkPrefix))
      return showToast(`⚠ Publishable key must start with ${expectedPkPrefix} for ${mode} mode`);

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("https://api.stripe.com/v1/account", {
        headers: { "Authorization": `Bearer ${sk}` },
      });
      setTestResult(res.ok ? "success" : "fail");
    } catch {
      setTestResult("fail");
    }
    setTesting(false);
  }

  async function copyToClipboard(text, key) {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const isConnected = activeMode === 'live'
    ? !!liveKeys.secret_key
    : !!testKeys.secret_key;

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/stripe/webhook`
    : 'https://yourdomain.com/api/stripe/webhook';

  if (!loaded) return null;

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Stripe Settings</div>
          <div className="page-sub">Manage live and test API keys separately</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary btn-sm" onClick={handleTest} disabled={testing || saving}>
            {testing ? '⏳ Testing…' : '⚡ Test Connection'}
          </button>
          <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving || testing}>
            {saving ? 'Saving…' : '💾 Save & Activate'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`status-banner ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="banner-icon">{isConnected ? '✅' : '⚠️'}</div>
        <div>
          <div className="banner-title">
            {isConnected ? 'Stripe is connected' : 'Stripe not yet configured'}
          </div>
          <div className="banner-sub">
            {isConnected
              ? `Account: ${accountId} — currently running in ${activeMode === 'live' ? 'Live' : 'Test'} mode`
              : 'Enter your Stripe API keys below and click Save & Activate'}
          </div>
        </div>
        {isConnected && (
          <div className={`banner-badge ${activeMode === 'live' ? 'badge-live' : 'badge-test'}`}>
            <span className="badge-dot" />
            {activeMode === 'live' ? 'Live Mode Active' : 'Test Mode Active'}
          </div>
        )}
      </div>

      {testResult && (
        <div className={`test-result ${testResult}`} style={{ marginBottom: 20 }}>
          {testResult === 'success'
            ? `✓ Connection successful — your ${mode} secret key is valid`
            : `✗ Connection failed — check your ${mode} secret key and try again`}
        </div>
      )}

      {/* Mode switcher */}
      <div className="mode-toggle">
        <button
          className={`mode-btn live ${mode === 'live' ? 'active' : ''}`}
          onClick={() => { setModeState('live'); setTestResult(null); }}
        >
          🟢 Live Mode Keys
          {activeMode === 'live' && liveKeys.secret_key && (
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.85 }}>● Active</span>
          )}
        </button>
        <button
          className={`mode-btn test ${mode === 'test' ? 'active' : ''}`}
          onClick={() => { setModeState('test'); setTestResult(null); }}
        >
          🧪 Test Mode Keys
          {activeMode === 'test' && testKeys.secret_key && (
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.85 }}>● Active</span>
          )}
        </button>
      </div>

      <div className="settings-grid">

        {/* ── API Keys ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon stripe">💳</div>
            <div>
              <div className="card-title">
                API Keys —{' '}
                <span className={`mode-label ${mode}`}>
                  {mode === 'live' ? 'Live' : 'Test'}
                </span>
              </div>
              <div className="card-sub">
                {mode === 'live'
                  ? 'Real payments — use pk_live_ and sk_live_ keys'
                  : 'No real charges — use pk_test_ and sk_test_ keys'}
              </div>
            </div>
          </div>
          <div className="card-body">

            <div className="field">
              <label>Account ID</label>
              <div className="value-display">{accountId}</div>
            </div>

            <div className="field">
              <label>Publishable Key</label>
              <div className="input-wrap">
                <input
                  className="mono"
                  placeholder={mode === 'live' ? 'pk_live_…' : 'pk_test_…'}
                  value={currentKeys.publishable_key}
                  onChange={e => setCurrentKeys(k => ({ ...k, publishable_key: e.target.value }))}
                />
              </div>
              {currentKeys.publishable_key && !currentKeys.publishable_key.startsWith(mode === 'live' ? 'pk_live_' : 'pk_test_') && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                  ⚠ Must start with <code>{mode === 'live' ? 'pk_live_' : 'pk_test_'}</code> for {mode} mode
                </div>
              )}
              <div className="field-hint">Safe to expose publicly. Starts with <code>{mode === 'live' ? 'pk_live_' : 'pk_test_'}</code>.</div>
            </div>

            <div className="field">
              <label>Secret Key</label>
              <div className="input-wrap">
                <input
                  className="mono"
                  type="password"
                  placeholder={mode === 'live' ? 'sk_live_…' : 'sk_test_…'}
                  value={currentKeys.secret_key}
                  onChange={e => setCurrentKeys(k => ({ ...k, secret_key: e.target.value }))}
                  onCopy={e => e.preventDefault()}
                  onCut={e => e.preventDefault()}
                />
              </div>
              {currentKeys.secret_key && !currentKeys.secret_key.startsWith(mode === 'live' ? 'sk_live_' : 'sk_test_') && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                  ⚠ Must start with <code>{mode === 'live' ? 'sk_live_' : 'sk_test_'}</code> for {mode} mode
                </div>
              )}
              <div className="field-hint">Keep private. Starts with <code>{mode === 'live' ? 'sk_live_' : 'sk_test_'}</code>.</div>
            </div>
          </div>
          <div className="card-footer">
            <button className="btn-secondary btn-sm" onClick={handleTest} disabled={testing}>
              {testing ? 'Testing…' : '⚡ Test Connection'}
            </button>
            <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : `Save ${mode === 'live' ? 'Live' : 'Test'} Keys`}
            </button>
          </div>
        </div>

        {/* ── Webhook ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-icon webhook">🔗</div>
            <div>
              <div className="card-title">Webhook Configuration</div>
              <div className="card-sub">Receive real-time payment events from Stripe</div>
            </div>
          </div>
          <div className="card-body">
            <div className="alert warn">
              <span className="alert-icon">⚠</span>
              Add the webhook URL in Stripe Dashboard → Developers → Webhooks, then paste the signing secret below.
            </div>

            <div className="field">
              <label>Your Webhook URL</label>
              <div className="copy-row">
                <div className="value-display">{webhookUrl}</div>
                <button
                  className={`copy-btn ${copied === 'webhook_url' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(webhookUrl, 'webhook_url')}
                >
                  {copied === 'webhook_url' ? '✓ Copied' : '⎘ Copy'}
                </button>
              </div>
            </div>

            <div className="field">
              <label>Webhook Signing Secret</label>
              <div className="input-wrap">
                <input
                  className="mono"
                  type="password"
                  placeholder="whsec_…"
                  value={currentKeys.webhook_secret}
                  onChange={e => setCurrentKeys(k => ({ ...k, webhook_secret: e.target.value }))}
                  onCopy={e => e.preventDefault()}
                  onCut={e => e.preventDefault()}
                />
              </div>
              <div className="field-hint">Starts with <code>whsec_</code>. Found in Stripe after creating the endpoint.</div>
            </div>

            <div className="divider" />

            <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
              Required webhook events:
            </div>
            <div className="webhook-events">
              {WEBHOOK_EVENTS.map(ev => (
                <div key={ev} className="webhook-event">
                  <span className="webhook-event-name">{ev}</span>
                  <span className="webhook-event-badge">Required</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card-footer">
            <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Webhook'}
            </button>
          </div>
        </div>

      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
