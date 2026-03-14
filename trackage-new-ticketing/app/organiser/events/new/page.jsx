/* app/organiser/events/new/page.jsx — Create event */
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EventForm from '../_EventForm';

export default function NewEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave({ event, tickets, days }) {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) { router.push('/organiser/login'); return; }

    setSaving(true);
    setError('');
    try {
      const res  = await fetch('/api/organiser/events', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ organiser_id, event, tickets, days }),
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
