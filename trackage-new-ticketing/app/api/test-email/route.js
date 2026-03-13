/* app/api/test-email/route.js
   Test endpoint — visit /api/test-email to send a test email
   Remove this file before going live.
*/
import nodemailer from 'nodemailer';

export async function GET(req) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'team@trackagescheme.com';
  const { searchParams } = new URL(req.url);
  const to = searchParams.get('to') || fromEmail;

  // Log what we have
  console.log('SENDGRID_API_KEY present:', !!apiKey);
  console.log('SENDGRID_API_KEY starts with SG.:', apiKey?.startsWith('SG.'));
  console.log('EMAIL_FROM:', fromEmail);
  console.log('Sending test to:', to);

  if (!apiKey) {
    return Response.json({ error: 'SENDGRID_API_KEY not set in .env.local' }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host:   'smtp.sendgrid.net',
    port:   587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: apiKey,
    },
  });

  // First verify the connection
  try {
    await transporter.verify();
    console.log('SMTP connection verified OK');
  } catch (err) {
    console.error('SMTP verify failed:', err.message);
    return Response.json({
      error: 'SMTP connection failed',
      detail: err.message,
      apiKeyPresent: !!apiKey,
      apiKeyPrefix: apiKey?.slice(0, 6),
    }, { status: 500 });
  }

  // Send test email
  try {
    const info = await transporter.sendMail({
      from:    `"Trackage Scheme" <${fromEmail}>`,
      to,
      subject: '✅ Test email from Trackage Scheme',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
          <h2 style="color:#0a9e7f">✅ SMTP is working!</h2>
          <p>This is a test email from your Trackage Scheme ticketing platform.</p>
          <p style="color:#666;font-size:13px">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });
    console.log('Test email sent:', info.messageId);
    return Response.json({ success: true, messageId: info.messageId, sentTo: to });
  } catch (err) {
    console.error('Send failed:', err.message);
    return Response.json({ error: 'Send failed', detail: err.message }, { status: 500 });
  }
}
