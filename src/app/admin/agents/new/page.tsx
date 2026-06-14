'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function NewAgentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20', initialBalance: '0' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await ipc<{ success: boolean; error?: string }>('agents:create', {
      fullName: form.fullName, username: form.username, password: form.password,
      phone: form.phone, adminCommissionRate: parseFloat(form.adminCommissionRate),
      initialBalance: parseFloat(form.initialBalance),
    });
    setLoading(false);
    if (result.success) router.push('/admin/agents');
    else setError(result.error ?? 'Failed');
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Create Agent" />
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {(['fullName', 'username', 'password', 'phone'] as const).map((f) => (
          <div key={f}>
            <label className="mb-1 block text-sm font-medium capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
            <input type={f === 'password' ? 'password' : 'text'} required={f !== 'phone'} value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Admin share from agent %</label>
            <input type="number" value={form.adminCommissionRate} onChange={(e) => setForm({ ...form, adminCommissionRate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-gray-500">Agent sets their own pot commission in settings</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Initial Balance</label>
            <input type="number" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Agent'}
        </button>
      </form>
    </div>
  );
}
