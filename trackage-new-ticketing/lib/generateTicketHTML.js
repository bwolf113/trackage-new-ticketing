/* lib/generateTicketPDF.js
   Generates a PDF ticket as a base64 string using PDFKit-style manual generation.
   Uses the 'pdf-lib' approach but actually just generates an HTML email attachment
   that renders perfectly as a printable ticket.
   
   We use a pure Node.js approach with no browser dependencies.
*/

export function generateTicketHTML({ order, event, tickets, orderItems, siteUrl }) {
  const fmtDate = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('en-MT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };
  const fmtTime = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit' });
  };
  const fmt = (n) => new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const orderRef = order.id?.slice(0, 8).toUpperCase();

  // Generate QR code URL — encodes the scan page URL so any reader can validate the ticket
  const base   = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const scanId = order.qr_token || order.id;
  const qrData = encodeURIComponent(`${base}/scan/${scanId}`);
  const qrUrl  = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${qrData}&choe=UTF-8`;

  // Build ticket rows
  const ticketRows = (orderItems || []).map(item => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;font-weight:600">${item.ticket_name || '—'}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555;text-align:center">${item.quantity}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#0a9e7f;font-weight:700;text-align:right">${fmt((item.unit_price || 0) * (item.quantity || 1))}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket — ${event?.name || 'Event'}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0a9e7f;margin-bottom:4px">Trackage Scheme</div>
      <div style="font-size:11px;color:#999;letter-spacing:0.08em;text-transform:uppercase">Malta's Music Ticketing Platform</div>
    </div>

    <!-- Ticket body -->
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      
      <!-- Dark header -->
      <div style="background:#0a0a0a;padding:32px 32px 28px;position:relative">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0a9e7f;margin-bottom:10px">🎵 Your ticket</div>
        <div style="font-size:28px;font-weight:700;color:#ffffff;line-height:1.15;margin-bottom:16px;letter-spacing:-0.02em">${event?.name || 'Event'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:16px">
          ${event?.start_time ? `
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:13px;color:rgba(255,255,255,0.5)">📅</span>
            <span style="font-size:13px;color:rgba(255,255,255,0.8)">${fmtDate(event.start_time)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:13px;color:rgba(255,255,255,0.5)">🕐</span>
            <span style="font-size:13px;color:rgba(255,255,255,0.8)">${fmtTime(event.start_time)}</span>
          </div>` : ''}
          ${event?.venue_name ? `
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:13px;color:rgba(255,255,255,0.5)">📍</span>
            <span style="font-size:13px;color:rgba(255,255,255,0.8)">${event.venue_name}</span>
          </div>` : ''}
        </div>
      </div>

      <!-- Tear line -->
      <div style="background:#f5f5f5;height:2px;background-image:repeating-linear-gradient(90deg,#ddd 0,#ddd 8px,transparent 8px,transparent 16px)"></div>

      <!-- Ticket details + QR -->
      <div style="padding:28px 32px;display:flex;gap:24px;align-items:flex-start">
        
        <!-- Left: details -->
        <div style="flex:1">
          
          <!-- Buyer -->
          <div style="margin-bottom:20px">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:6px">Ticket holder</div>
            <div style="font-size:16px;font-weight:700;color:#1a1a1a">${order.customer_name || order.purchaser_name || '—'}</div>
            <div style="font-size:13px;color:#666;margin-top:2px">${order.customer_email || order.purchaser_email || ''}</div>
          </div>

          <!-- Order ref -->
          <div style="margin-bottom:20px">
            <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:6px">Order reference</div>
            <div style="font-size:15px;font-weight:700;color:#1a1a1a;font-family:monospace;letter-spacing:0.05em">#${orderRef}</div>
          </div>

          <!-- Tickets -->
          <div>
            <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:8px">Tickets</div>
            <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f0f0f0">
                  <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#999">Type</th>
                  <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#999">Qty</th>
                  <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#999">Total</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
              </tbody>
            </table>
            <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#0a9e7f;border-radius:0 0 8px 8px">
              <span style="font-size:13px;font-weight:700;color:white">Total paid</span>
              <span style="font-size:15px;font-weight:700;color:white">${fmt(order.total)}</span>
            </div>
          </div>
        </div>

        <!-- Right: QR code -->
        <div style="flex-shrink:0;text-align:center">
          <img src="${qrUrl}" width="140" height="140" alt="QR Code" style="display:block;border-radius:8px;border:3px solid #f0f0f0" />
          <div style="font-size:10px;color:#999;margin-top:6px;font-weight:600">Scan at door</div>
          <div style="font-size:11px;color:#1a1a1a;font-weight:700;margin-top:3px;font-family:monospace">#${orderRef}</div>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center">
        <div style="font-size:11px;color:#999;line-height:1.6">
          This ticket is non-transferable. Please present this QR code at the venue entrance.<br>
          For support: <a href="mailto:team@trackagescheme.com" style="color:#0a9e7f">team@trackagescheme.com</a>
        </div>
      </div>

    </div>

    <!-- Powered by -->
    <div style="text-align:center;margin-top:20px">
      <div style="font-size:11px;color:#bbb">Powered by <span style="color:#0a9e7f;font-weight:700">Trackage Scheme</span> · trackagescheme.com</div>
    </div>

  </div>
</body>
</html>`;
}
