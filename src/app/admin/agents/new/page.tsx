'use client';

import { useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function NewAgentPage() {
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20', initialBalance: '0' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCreated(null);
    const result = await ipc<{ success: boolean; error?: string }>('agents:create', {
      fullName: form.fullName, username: form.username, password: form.password,
      phone: form.phone, adminCommissionRate: parseFloat(form.adminCommissionRate),
      initialBalance: parseFloat(form.initialBalance),
    });
    setLoading(false);
    if (result.success) {
      setCreated({ username: form.username, password: form.password });
      setForm({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20', initialBalance: '0' });
    } else setError(result.error ?? 'Failed');
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Create Agent" />
      {created && (
        <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-bold">Agent registered on this PC</p>
          <p className="mt-2">Username: <strong>{created.username}</strong></p>
          <p>Password: <strong>{created.password}</strong></p>
          <p className="mt-3 font-medium">Next steps for a separate agent PC:</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Install TEBIB-Bingo on the hall PC</li>
            <li>Login admin → create agent with <strong>same username</strong></li>
            <li>Agent logs in and changes password</li>
            <li>When they need balance: generate TBG code for <strong>{created.username}</strong></li>
          </ol>
        </div>
      )}
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
