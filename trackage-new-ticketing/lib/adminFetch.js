/* lib/adminFetch.js
   Client-side helper — wraps fetch() to automatically include the
   admin Bearer token on all admin API requests.
   Usage:
     import { adminFetch } from '../../../lib/adminFetch';
     const res = await adminFetch('/api/admin/update-order', { method: 'POST', body: JSON.stringify({...}) });
*/
'use client';

export function adminFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
