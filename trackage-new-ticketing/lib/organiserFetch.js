/* lib/organiserFetch.js
   Client-side helper — wraps fetch() to automatically include the
   Supabase session Bearer token on all organiser API requests.
   Usage:
     import { orgFetch } from '../../../lib/organiserFetch';
     const res = await orgFetch('/api/organiser/events', { method: 'POST', body: JSON.stringify({...}) });
*/
'use client';
import { supabase } from './supabase';

export async function orgFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  // Don't set Content-Type for FormData — browser must set it with the boundary
  const isFormData = options.body instanceof FormData;
  return fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
