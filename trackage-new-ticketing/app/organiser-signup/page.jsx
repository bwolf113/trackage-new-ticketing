/* app/organiser-signup/page.jsx */
'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function OrganiserSignup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSignup(e) {
    e.preventDefault();

    const { data, error } = await supabase
      .from('organisers')
      .insert([{ name, email, phone, password }]);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Organiser account created successfully!');
      setName(''); setEmail(''); setPhone(''); setPassword('');
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign Up as Organiser</h1>
      <form onSubmit={handleSignup} className="flex flex-col gap-3">
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="p-2 border rounded" required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="p-2 border rounded" required />
        <input type="text" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="p-2 border rounded" />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="p-2 border rounded" required />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Sign Up</button>
      </form>
      {message && <p className="mt-3 text-red-600">{message}</p>}
    </div>
  );
}