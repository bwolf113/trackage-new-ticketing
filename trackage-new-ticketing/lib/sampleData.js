/* lib/sampleData.js
   Generates 100 fake orders (with items, events, organisers) used by
   Orders and Reports pages when sample-mode is enabled.
   Nothing is ever written to Supabase — all data lives in memory.
*/

const SAMPLE_KEY = 'ts_sample_mode';

export function isSampleMode() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SAMPLE_KEY) === '1';
}
export function setSampleMode(on) {
  if (typeof window === 'undefined') return;
  if (on) localStorage.setItem(SAMPLE_KEY, '1');
  else localStorage.removeItem(SAMPLE_KEY);
}

/* ── seed data ────────────────────────────────────────────────────── */
const ORGANISERS = [
  { id: 'org-1', name: 'Wicked Events Malta' },
  { id: 'org-2', name: 'Underground Collective' },
  { id: 'org-3', name: 'Sonic Boom Promotions' },
  { id: 'org-4', name: 'Freeform Republic' },
  { id: 'org-5', name: 'Dark Matter Events' },
];

const EVENTS = [
  { id: 'evt-1', name: 'Bass Culture Vol.12', organiser_id: 'org-1', start_time: ago(5),  end_time: ago(4) },
  { id: 'evt-2', name: 'Nocturnal Sessions',  organiser_id: 'org-2', start_time: ago(20), end_time: ago(19) },
  { id: 'evt-3', name: 'Maltese Rave IV',      organiser_id: 'org-1', start_time: ago(45), end_time: ago(44) },
  { id: 'evt-4', name: 'Void Frequency',       organiser_id: 'org-3', start_time: ago(60), end_time: ago(59) },
  { id: 'evt-5', name: 'Subterranean Nights',  organiser_id: 'org-4', start_time: ago(90), end_time: ago(89) },
  { id: 'evt-6', name: 'Echo Chamber Fest',    organiser_id: 'org-2', start_time: future(14), end_time: future(15) },
  { id: 'evt-7', name: 'Hypercolour Malta',    organiser_id: 'org-5', start_time: future(30), end_time: future(31) },
  { id: 'evt-8', name: 'Warehouse Project MT', organiser_id: 'org-3', start_time: ago(10), end_time: ago(9) },
];

const TICKET_TYPES = [
  { name: 'Early Bird', price: 8 },
  { name: 'General Admission', price: 15 },
  { name: 'VIP', price: 30 },
  { name: 'Group (x4)', price: 50 },
];

const FIRST_NAMES = ['Michael','Sarah','Luke','Emma','Chris','Jade','Ryan','Laura','Karl','Martina','David','Francesca','Joe','Rebecca','Stefan','Elena','Marco','Anna','Daniel','Sophie'];
const LAST_NAMES  = ['Borg','Camilleri','Vella','Farrugia','Mifsud','Attard','Grech','Fenech','Buhagiar','Agius','Azzopardi','Galea','Bonello','Debono','Schembri','Zammit','Pace','Gatt','Tabone','Mercieca'];
const STATUSES    = ['completed','completed','completed','completed','completed','completed','completed','pending_payment','cancelled','failed','refunded'];

function ago(days) {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
}
function future(days) {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString();
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/* Seeded random so data is stable per session */
let _seed = 42;
function seededRand() {
  _seed = (_seed * 1664525 + 1013904223) & 0xffffffff;
  return ((_seed >>> 0) / 0xffffffff);
}
function spick(arr) { return arr[Math.floor(seededRand() * arr.length)]; }
function srandInt(min, max) { return Math.floor(seededRand() * (max - min + 1)) + min; }

/* ── generator ────────────────────────────────────────────────────── */
let _cache = null;

export function getSampleOrders() {
  if (_cache) return _cache;
  _seed = 42; // reset seed for stable output

  const orders = [];
  const now = new Date();

  for (let i = 0; i < 100; i++) {
    const event = spick(EVENTS);
    const org   = ORGANISERS.find(o => o.id === event.organiser_id);
    const fname = spick(FIRST_NAMES);
    const lname = spick(LAST_NAMES);
    const status = spick(STATUSES);

    // date: spread across last 90 days, more recent = more orders
    const daysAgo = Math.floor(Math.pow(seededRand(), 1.5) * 90);
    const createdAt = new Date(now); createdAt.setDate(createdAt.getDate() - daysAgo);

    // items: 1-3 ticket types
    const numItems = srandInt(1, 3);
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < numItems; j++) {
      const tt  = spick(TICKET_TYPES);
      const qty = srandInt(1, 4);
      const fee = +(tt.price * qty * 0.08).toFixed(2); // 8% booking fee
      items.push({
        id: `sitem-${i}-${j}`,
        ticket_name: tt.name,
        quantity: qty,
        unit_price: tt.price,
        booking_fee: fee,
        tickets: { name: tt.name },
      });
      subtotal += tt.price * qty;
    }
    const bookingFee = +(subtotal * 0.08).toFixed(2);
    const total      = +(subtotal + bookingFee).toFixed(2);
    const stripeFee  = +(total * 0.025 + 0.25).toFixed(2); // simulate Stripe 2.5% + €0.25

    orders.push({
      id:          `ssample-${String(i).padStart(3,'0')}-${Math.random().toString(36).slice(2,6)}`,
      status,
      total:       status === 'completed' ? total : total,
      customer_name:  `${fname} ${lname}`,
      customer_email: `${fname.toLowerCase()}.${lname.toLowerCase()}@example.com`,
      customer_phone: `+356 ${srandInt(7700,9999)} ${srandInt(1000,9999)}`,
      created_at:  createdAt.toISOString(),
      event_id:    event.id,
      organiser_id: org.id,
      event_name:  event.name,
      booking_fee: bookingFee,
      stripe_fee:  status === 'completed' ? stripeFee : null,
      stripe_payment_intent: status === 'completed' ? `pi_sample_${Math.random().toString(36).slice(2,18)}` : null,
      stripe_charge_id: null,
      events:      { name: event.name, start_time: event.start_time },
      organisers:  { name: org.name },
      order_items: items,
      _isSample:   true,
    });
  }

  // Sort newest first
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  _cache = orders;
  return orders;
}

export function getSampleEvents() { return EVENTS; }
export function getSampleOrganisers() { return ORGANISERS; }

/* Aggregated KPIs from sample orders — used by Reports */
export function getSampleKpis(start, end) {
  const orders = getSampleOrders();
  const inRange = orders.filter(o => {
    if (o.status !== 'completed') return false;
    const d = new Date(o.created_at);
    return d >= new Date(start) && d <= new Date(end);
  });

  let ticketCount = 0;
  inRange.forEach(o => {
    (o.order_items || []).forEach(i => { ticketCount += i.quantity || 0; });
  });

  const totalRevenue     = inRange.reduce((s, o) => s + (o.total || 0), 0);
  const totalBookingFees = inRange.reduce((s, o) => s + (o.booking_fee || 0), 0);

  // Organiser breakdown
  const byOrg = {};
  inRange.forEach(o => {
    if (!o.organiser_id) return;
    if (!byOrg[o.organiser_id]) byOrg[o.organiser_id] = { id: o.organiser_id, name: o.organisers?.name, revenue: 0, orders: 0, bookingFees: 0, stripeFees: 0 };
    byOrg[o.organiser_id].revenue     += o.total || 0;
    byOrg[o.organiser_id].orders      += 1;
    byOrg[o.organiser_id].bookingFees += o.booking_fee || 0;
    byOrg[o.organiser_id].stripeFees  += o.stripe_fee || 0;
  });
  const orgRanking = Object.values(byOrg).map(d => ({ ...d, payout: d.revenue - d.bookingFees - d.stripeFees })).sort((a, b) => b.revenue - a.revenue);

  // Event breakdown
  const byEvt = {};
  inRange.forEach(o => {
    if (!o.event_id) return;
    if (!byEvt[o.event_id]) byEvt[o.event_id] = { id: o.event_id, name: o.event_name, revenue: 0, tickets: 0 };
    (o.order_items || []).forEach(i => {
      byEvt[o.event_id].revenue += (i.unit_price || 0) * (i.quantity || 0);
      byEvt[o.event_id].tickets += i.quantity || 0;
    });
  });
  const eventPerf = EVENTS.map(e => ({
    ...e, ...(byEvt[e.id] || { revenue: 0, tickets: 0 }),
    status: 'sample',
  })).sort((a, b) => b.revenue - a.revenue);

  return {
    kpis: {
      totalRevenue,
      totalBookingFees,
      totalStripeFees: inRange.reduce((s, o) => s + (o.stripe_fee || 0), 0),
      ticketCount,
      orderCount: inRange.length,
      orders: inRange,
    },
    orgRanking,
    eventPerf,
  };
}
