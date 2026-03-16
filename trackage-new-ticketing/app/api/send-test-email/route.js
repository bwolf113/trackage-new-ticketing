/* app/api/send-test-email/route.js */
import { sendEmail, ticketConfirmationEmail, bookingFeeReceiptEmail, adminNewOrderEmail } from '../../../lib/sendEmail';

const MOCK_ORDER = {
  id:             'test-0000-0000-0000-000000000001',
  total:          32.40,
  booking_fee:    2.40,
  discount:       0,
  coupon_code:    null,
  customer_name:  'Marco Borg',
  customer_email: 'marco.borg@example.com',
  customer_phone: '+356 7912 3456',
  status:         'completed',
  created_at:     new Date().toISOString(),
  organiser_id:   null,
};
const MOCK_EVENT = {
  id:         'evt-test-001',
  name:       'Bass Culture Vol. 14',
  start_time: new Date(Date.now() + 14 * 86400000).toISOString(),
  venue_name: 'Uno Kitchen & Bar, Paceville',
};
const MOCK_ORGANISER = {
  id:         'org-test-001',
  name:       'Wicked Events Malta',
  vat_number: 'MT2280-1806',
};
const MOCK_ITEMS = [
  { ticket_name: 'General Admission', quantity: 2, unit_price: 15.00 },
];

export async function POST(req) {
  try {
    const { to, template } = await req.json();
    if (!to) return Response.json({ error: 'Email address required' }, { status: 400 });
    if (!process.env.SENDGRID_API_KEY) return Response.json({ error: 'SENDGRID_API_KEY not set' }, { status: 500 });

    let result;
    switch (template) {
      case 'ticket_confirmation':
        result = await sendEmail({
          to,
          subject: `🎫 [TEST] Your tickets for ${MOCK_EVENT.name}`,
          html: await ticketConfirmationEmail({ order: MOCK_ORDER, event: MOCK_EVENT, orderItems: MOCK_ITEMS, organiser: MOCK_ORGANISER }),
        });
        break;
      case 'booking_fee_receipt':
        result = await sendEmail({
          to,
          subject: `🧾 [TEST] Booking fee receipt — ${MOCK_EVENT.name}`,
          html: await bookingFeeReceiptEmail({ order: MOCK_ORDER, event: MOCK_EVENT, receiptNumber: 'TEST-0001' }),
        });
        break;
      case 'admin_notification':
        result = await sendEmail({
          to,
          subject: `💰 [TEST] New order — ${MOCK_EVENT.name}`,
          html: await adminNewOrderEmail({ order: MOCK_ORDER, event: MOCK_EVENT, orderItems: MOCK_ITEMS }),
        });
        break;
      default:
        return Response.json({ error: 'Unknown template' }, { status: 400 });
    }

    return result.success
      ? Response.json({ success: true, messageId: result.messageId })
      : Response.json({ error: result.error }, { status: 500 });

  } catch (err) {
    console.error('Test email error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const template = searchParams.get('template') || 'ticket_confirmation';
  let html = '';
  switch (template) {
    case 'ticket_confirmation':
      html = await ticketConfirmationEmail({ order: MOCK_ORDER, event: MOCK_EVENT, orderItems: MOCK_ITEMS, organiser: MOCK_ORGANISER });
      break;
    case 'booking_fee_receipt':
      html = await bookingFeeReceiptEmail({ order: MOCK_ORDER, event: MOCK_EVENT, receiptNumber: 'TEST-0001' });
      break;
    case 'admin_notification':
      html = await adminNewOrderEmail({ order: MOCK_ORDER, event: MOCK_EVENT, orderItems: MOCK_ITEMS });
      break;
    default:
      return Response.json({ error: 'Unknown template' });
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
