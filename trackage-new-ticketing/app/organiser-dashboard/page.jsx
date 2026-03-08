'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AddTicketType from './AddTicketType';

export default function OrganiserDashboard() {
  const [organiser, setOrganiser] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [vatOrganiser, setVatOrganiser] = useState('');
  const [vatTrackage, setVatTrackage] = useState('');
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('organiser');
    if (stored) setOrganiser(JSON.parse(stored));
    else window.location.href = '/organiser-login';

    async function fetchEvents() {
      if (stored) {
        const organiserData = JSON.parse(stored);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('organiser_id', organiserData.id)
          .order('created_at', { ascending: false });
        if (!error) setEvents(data);
      }
    }

    fetchEvents();
  }, []);

  function handleAddTicket(ticket) {
    setTickets(prev => [...prev, ticket]);
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    if (!eventName || !startTime || !endTime || !tickets.length) return;

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert([{
        organiser_id: organiser.id,
        name: eventName,
        description,
        start_time: startTime,
        end_time: endTime,
        venue,
        vat_organiser: parseFloat(vatOrganiser) || 0,
        vat_trackage: parseFloat(vatTrackage) || 0
      }])
      .select()
      .single();

    if (eventError) {
      setMessage(eventError.message);
      return;
    }

    for (const ticket of tickets) {
      await supabase.from('ticket_types').insert([{
        event_id: eventData.id,
        ...ticket
      }]);
    }

    setMessage('Event created successfully!');
    setEventName(''); setDescription(''); setStartTime(''); setEndTime(''); setVenue('');
    setVatOrganiser(''); setVatTrackage(''); setTickets([]);

    const { data: newEvents } = await supabase
      .from('events')
      .select('*')
      .eq('organiser_id', organiser.id)
      .order('created_at', { ascending: false });
    setEvents(newEvents);
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome, {organiser?.name}</h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
            <input type="text" placeholder="Event Name" value={eventName} onChange={e => setEventName(e.target.value)} className="p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="datetime-local" placeholder="Start Time" value={startTime} onChange={e => setStartTime(e.target.value)} className="p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
              <input type="datetime-local" placeholder="End Time" value={endTime} onChange={e => setEndTime(e.target.value)} className="p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
            </div>
            <input type="text" placeholder="Venue" value={venue} onChange={e => setVenue(e.target.value)} className="p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="number" placeholder="VAT Organiser (%)" value={vatOrganiser} onChange={e => setVatOrganiser(e.target.value)} className="p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <input type="number" placeholder="VAT Trackage (%)" value={vatTrackage} onChange={e => setVatTrackage(e.target.value)} className="p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <AddTicketType onAdd={handleAddTicket} />

            {tickets.length > 0 && (
              <div className="bg-gray-50 border rounded-lg p-3 mb-3">
                <h3 className="font-semibold text-gray-700 mb-2">Tickets Added:</h3>
                <ul className="list-disc pl-5 text-gray-700">
                  {tickets.map((t, idx) => <li key={idx}>{t.name} - €{t.price} ({t.inventory} available)</li>)}
                </ul>
              </div>
            )}

            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition">Create Event</button>
          </form>
          {message && <p className="mt-4 text-green-600 font-medium">{message}</p>}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Events</h2>
          {events.length === 0 ? <p className="text-gray-500">No events yet.</p> :
            <ul className="space-y-2">
              {events.map(event => (
                <li key={event.id} className="p-3 border rounded-lg bg-gray-50 shadow-sm">
                  <span className="font-medium text-gray-800">{event.name}</span> – <span className="text-gray-600">{new Date(event.start_time).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          }
        </div>
      </div>
    </div>
  );
}