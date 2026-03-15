// Base URL of the Next.js ticketing backend
export const BASE_URL = 'https://tickets.trackagescheme.com';

async function apiFetch(path: string, options?: RequestInit, token?: string) {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  return res;
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getOrganiserEvents(token: string) {
  const res = await apiFetch('/api/organiser/events', {}, token);
  const json = await res.json();
  return json.events as EventSummary[];
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function getEventOrders(eventId: string, token: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/orders`, {}, token);
  return res.json();
}

// ── Attendees ─────────────────────────────────────────────────────────────────

export async function getEventAttendees(eventId: string, token: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/attendees`, {}, token);
  return res.json();
}

export async function checkInOrder(eventId: string, orderId: string, token: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/attendees`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId }),
  }, token);
  return res.json();
}

export async function undoCheckInOrder(eventId: string, orderId: string, token: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/attendees`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, undo: true }),
  }, token);
  return res.json();
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getEventStats(eventId: string, token: string) {
  const res = await apiFetch(`/api/organiser/events/${eventId}/stats`, {}, token);
  return res.json();
}

// ── Issue Comp ────────────────────────────────────────────────────────────────

export async function issueComp(payload: {
  event_id: string;
  attendees: { first_name: string; last_name: string; email: string; quantity: number; ticket_id?: string }[];
}, token: string) {
  const res = await apiFetch('/api/organiser/issue-comp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, token);
  return res.json();
}

// ── Scan ──────────────────────────────────────────────────────────────────────

export async function checkInTicket(token: string, accessToken: string) {
  const res = await apiFetch(`/api/scan/${token}`, {
    method: 'POST',
  }, accessToken);
  return res.json() as Promise<ScanResult>;
}

// ── Organiser Me ──────────────────────────────────────────────────────────────

export async function getOrganiserMe(accessToken: string) {
  const res = await apiFetch('/api/organiser/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }, accessToken);
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
