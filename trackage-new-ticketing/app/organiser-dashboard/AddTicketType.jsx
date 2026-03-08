'use client';
import { useState } from 'react';

export default function AddTicketType({ onAdd }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [inventory, setInventory] = useState('');
  const [disclaimer, setDisclaimer] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!name || !price || !inventory) return;

    onAdd({ name, price: parseFloat(price), inventory: parseInt(inventory), disclaimer });
    setName(''); setPrice(''); setInventory(''); setDisclaimer('');
  }

  return (
    <div className="border p-3 mb-3 rounded">
      <h2 className="font-bold mb-2">Add Ticket Type</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <input type="text" placeholder="Ticket Name" value={name} onChange={e => setName(e.target.value)} className="p-2 border rounded" required />
        <input type="number" placeholder="Price (€)" value={price} onChange={e => setPrice(e.target.value)} className="p-2 border rounded" required />
        <input type="number" placeholder="Inventory" value={inventory} onChange={e => setInventory(e.target.value)} className="p-2 border rounded" required />
        <textarea placeholder="Disclaimer" value={disclaimer} onChange={e => setDisclaimer(e.target.value)} className="p-2 border rounded" />
        <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded mt-2">Add Ticket</button>
      </form>
    </div>
  );
}