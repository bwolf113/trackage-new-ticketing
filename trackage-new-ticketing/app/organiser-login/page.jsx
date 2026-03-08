/* app/organiser-login/page.jsx */
'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function OrganiserLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin(e) {
    e.preventDefault();

    const { data, error } = await supabase
      .from('organisers')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      setMessage('Invalid email or password.');
    } else {
      setMessage('Login successful!');
      localStorage.setItem('organiser', JSON.stringify(data));
      window.location.href = '/organiser-dashboard';
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Organiser Login</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="p-2 border rounded" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="p-2 border rounded" required />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
      </form>
      {message && <p className="mt-3 text-red-600">{message}</p>}
    </div>
  );
}