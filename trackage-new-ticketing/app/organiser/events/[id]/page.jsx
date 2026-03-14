/* app/organiser/events/[id]/page.jsx — Edit event */
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EventForm from '../_EventForm';

export default function EditEventPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const organiser_id = localStorage.getItem('organiser_id');
    if (!organiser_id) { router.push('/organiser/login'); return; }

    fetch(`/api/organiser/events/${id}?organiser_id=${organiser_id}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(json.error); setLoading(false); return; }
        setInitial({ event: json.event, tickets: json.tickets, days: json.days || [] });
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  async function handleSave({ event, tickets, days }) {
    const organiser_id = localStorage.getItem('organiser_id');
    setSaving(true);
    setError('');
    try {
      const res  = await fetch(`/api/organiser/events/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ organiser_id, event, tickets, days }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save'); setSaving(false); return; }
      router.push('/organiser/events');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this event and all its tickets? This cannot be undone.')) return;
    const organiser_id = localStorage.getItem('organiser_id');
    const res = await fetch(`/api/organiser/events/${id}?organiser_id=${organiser_id}`, { method: 'DELETE' });
    if (res.ok) router.push('/organiser/events');
    else setError('Failed to delete event');
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-mid)', fontFamily: 'Inter, sans-serif' }}>
      Loading event…
    </div>
  );

  return (
    <EventForm
      initial={initial}
      onSave={handleSave}
      onDelete={handleDelete}
      saving={saving}
      error={error}
      eventId={id}
    />
  );
}
