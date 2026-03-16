/* app/scan/[token]/page.jsx
   Human-readable ticket scan page.
   Shown when a buyer scans the QR code with their phone camera.
   The mobile door app will use /api/scan/{token} directly instead.
*/

import { createClient } from '@supabase/supabase-js';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getTicketData(token) {
  const supabase = supabaseAdmin();

  let { data: order } = await supabase
    .from('orders')
    .select('id, qr_token, status, checked_in_at, customer_name, customer_email, total, event_id, order_items(ticket_name, quantity, unit_price)')
    .eq('qr_token', token)
    .single();

  if (!order) {
    ({ data: order } = await supabase
      .from('orders')
      .select('id, qr_token, status, checked_in_at, customer_name, customer_email, total, event_id, order_items(ticket_name, quantity, unit_price)')
      .eq('id', token)
      .single());
  }

  if (!order) return null;

  let eventName = null;
  if (order.event_id) {
    const { data: ev } = await supabase.from('events').select('name, start_time, venue_name').eq('id', order.event_id).single();
    if (ev) {
      eventName = ev.name;
      order.event = ev;
    }
  }

  return order;
}

const MT = { timeZone: 'Europe/Malta' };
function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-MT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...MT });
}
function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit', ...MT });
}
function fmtDateTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-MT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', ...MT });
}
function fmt(n) {
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export default async function ScanPage({ params }) {
  const { token } = await params;
  const order = await getTicketData(token);

  const isCancelled = order?.status === 'cancelled' || order?.status === 'failed';
  const isAlreadyUsed = order?.checked_in_at != null;
  const isValid = order && !isCancelled && !isAlreadyUsed;

  const orderRef = order ? (order.id || '').slice(0, 8).toUpperCase() : null;

  // Status config
  const statusConfig = !order
    ? { bg: '#dc2626', icon: '✗', title: 'Invalid Ticket', sub: 'This QR code was not found in our system.' }
    : isCancelled
    ? { bg: '#dc2626', icon: '✗', title: 'Cancelled Order', sub: 'This order has been cancelled.' }
    : isAlreadyUsed
    ? { bg: '#d97706', icon: '!', title: 'Already Used', sub: `Checked in at ${fmtDateTime(order.checked_in_at)}` }
    : { bg: '#16a34a', icon: '✓', title: 'Valid Ticket', sub: 'This ticket is authentic and unused.' };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Status card */}
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>

        {/* Colour band */}
        <div style={{ background: statusConfig.bg, padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32, color: '#fff', fontWeight: 700, lineHeight: '64px' }}>
            {statusConfig.icon}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{statusConfig.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{statusConfig.sub}</div>
        </div>

        {order && (
          <div style={{ padding: '24px' }}>

            {/* Event */}
            {order.event && (
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Event</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{order.event.name}</div>
                {order.event.start_time && (
                  <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                    {fmtDate(order.event.start_time)} · {fmtTime(order.event.start_time)}
                  </div>
                )}
                {order.event.venue_name && (
                  <div style={{ fontSize: 13, color: '#555' }}>📍 {order.event.venue_name}</div>
                )}
              </div>
            )}

            {/* Ticket holder */}
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Ticket holder</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{order.customer_name || '—'}</div>
              {order.customer_email && <div style={{ fontSize: 13, color: '#666' }}>{order.customer_email}</div>}
            </div>

            {/* Order ref */}
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Order reference</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', fontFamily: 'monospace' }}>#{orderRef}</div>
            </div>

            {/* Tickets */}
            {(order.order_items || []).length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 8 }}>Tickets</div>
                {(order.order_items || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < order.order_items.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{item.ticket_name}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>× {item.quantity}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0a9e7f' }}>{fmt((item.unit_price || 0) * (item.quantity || 1))}</div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#bbb' }}>Powered by <span style={{ color: '#0a9e7f', fontWeight: 700 }}>Trackage Scheme</span></div>
        <div style={{ fontSize: 11, color: '#ccc', marginTop: 2 }}>Above ground is overrated</div>
      </div>
    </div>
  );
}
