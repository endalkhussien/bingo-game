'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

interface Plan { id: string; name: string; planType: string; price: number; cardLimit: number | null; duration: string | null; isActive: boolean; }

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', planType: 'CARD_PACK', price: '50', cardLimit: '10', duration: '' });

  const load = () => ipc<Plan[]>('pricing:list').then(setPlans);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await ipc('pricing:create', {
      name: form.name, planType: form.planType, price: parseFloat(form.price),
      cardLimit: form.cardLimit ? parseInt(form.cardLimit) : undefined,
      duration: form.duration || undefined,
    });
    setShowForm(false); load();
  };

  const cardPacks = plans.filter((p) => p.planType === 'CARD_PACK');
  const memberships = plans.filter((p) => p.planType === 'MEMBERSHIP');

  return (
    <div>
      <PageHeader title="Pricing Plans" action={
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">+ Create Plan</button>
      } />
      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Plan name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
            <select value={form.planType} onChange={(e) => setForm({ ...form, planType: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              <option value="CARD_PACK">Card Pack</option><option value="MEMBERSHIP">Membership</option>
            </select>
            <input placeholder="Price (ETB)" type="number" min={1} step={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
            <input placeholder="Card limit" type="number" min={1} step={1} value={form.cardLimit} onChange={(e) => setForm({ ...form, cardLimit: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <button onClick={handleCreate} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white">Save Plan</button>
        </div>
      )}
      {[{ title: 'Card Packs', data: cardPacks }, { title: 'Memberships', data: memberships }].map(({ title, data }) => (
        <div key={title} className="mb-6">
          <h3 className="mb-3 font-semibold text-gray-700">{title}</h3>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Limit/Duration</th><th className="px-4 py-3">Status</th>
              </tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{p.price} ETB</td>
                    <td className="px-4 py-3">{p.cardLimit ? `${p.cardLimit} cards` : p.duration}</td>
                    <td className="px-4 py-3"><span className={`text-xs rounded-full px-2 py-0.5 ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.isActive ? 'Active' : 'Disabled'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
