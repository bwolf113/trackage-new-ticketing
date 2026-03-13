// Base URL of the Next.js ticketing backend
export const BASE_URL = 'http://192.168.1.54:3000';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  return res;
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getOrganiserEvents(organiserId: string) {
  const res = await apiFetch(`/api/organiser/events?organiser_id=${organiserId}`);
  const json = await res.json();
  return json.events as EventSummary[];
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function getEventOrders(eventId: string, organiserId: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/orders?organiser_id=${organiserId}`);
  return res.json();
}

// ── Attendees ─────────────────────────────────────────────────────────────────

export async function getEventAttendees(eventId: string, organiserId: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/attendees?organiser_id=${organiserId}`);
  return res.json();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getEventStats(eventId: string, organiserId: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/stats?organiser_id=${organiserId}`);
  return res.json();
}

// ── Issue Comp ────────────────────────────────────────────────────────────────

export async function issueComp(payload: {
  organiser_id: string;
  event_id: string;
  attendees: { first_name: string; last_name: string; email: string; quantity: number; ticket_id?: string }[];
}) {
  const res = await apiFetch('/api/organiser/issue-comp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── Scan ──────────────────────────────────────────────────────────────────────

export async function checkInTicket(token: string, accessToken: string) {
  const res = await apiFetch(`/api/scan/${token}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json() as Promise<ScanResult>;
}

// ── Organiser Me ──────────────────────────────────────────────────────────────

export async function getOrganiserMe(accessToken: string) {
  const res = await apiFetch('/api/organiser/me', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });
  const json = await res.json();
  return json.organiser as Organiser | null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventSummary {
  id: string;
  name: string;
  slug: string;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  status: 'published' | 'draft';
  thumbnail_url: string | null;
  completed_orders: number;
}

export interface Organiser {
  id: string;
  name: string;
  email: string;
  status: string;
  vat_number: string | null;
}

export interface ScanResult {
  valid: boolean;
  status: 'ok' | 'already_used' | 'not_found' | 'cancelled' | 'error';
  checked_in_at: string | null;
  order: {
    ref: string;
    customer_name: string;
    event_name: string;
    tickets: { ticket_name: string; quantity: number; unit_price: number }[];
  } | null;
}
