/* app/organiser/events/[id]/page.jsx — Edit event */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EventForm from '../_EventForm';
import { orgFetch } from '../../../../lib/organiserFetch';

export default function EditEventPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!localStorage.getItem('organiser_id')) { router.push('/organiser/login'); return; }

    orgFetch(`/api/organiser/events/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(json.error); setLoading(false); return; }
        setInitial({ event: json.event, tickets: json.tickets, days: json.days || [] });
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  async function handleSave({ event, tickets, days }) {
    setSaving(true);
    setError('');
    try {
      const res  = await orgFetch(`/api/organiser/events/${id}`, {
        method:  'PUT',
        body:    JSON.stringify({ event, tickets, days }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save'); setSaving(false); return; }
      router.push('/organiser/events');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>
      Loading event…
    </div>
  );

  return (
    <EventForm
      initial={initial}
      onSave={handleSave}
      saving={saving}
      error={error}
      eventId={id}
    />
  );
}
