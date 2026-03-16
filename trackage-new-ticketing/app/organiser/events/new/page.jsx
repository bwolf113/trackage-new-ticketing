/* app/organiser/events/new/page.jsx — Create event */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EventForm from '../_EventForm';
import { orgFetch } from '../../../../lib/organiserFetch';

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave({ event, tickets, days }) {
    if (!localStorage.getItem('organiser_id')) { router.push('/organiser/login'); return; }

    setSaving(true);
    setError('');
    try {
      const res  = await orgFetch('/api/organiser/events', {
        method:  'POST',
        body:    JSON.stringify({ event, tickets, days }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to create event'); setSaving(false); return; }
      router.push('/organiser/events');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return <EventForm onSave={handleSave} saving={saving} error={error} isNew />;
}
