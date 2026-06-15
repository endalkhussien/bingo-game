'use client';

import { useState } from 'react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { TasSetupPanel } from '@/presentation/components/admin/tas-setup-panel';
import { createAgentWithSetup } from '@/presentation/lib/create-agent-with-setup';

export default function NewAgentPage() {
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20', initialBalance: '0' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ username: string; password: string; setupCode: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCreated(null);
    setError('');

    const outcome = await createAgentWithSetup({
      fullName: form.fullName,
      username: form.username,
      password: form.password,
      phone: form.phone,
      adminCommissionRate: parseFloat(form.adminCommissionRate) || 20,
      initialBalance: parseFloat(form.initialBalance) || 0,
    });

    if (outcome.ok) {
      setCreated(outcome.result);
      setForm({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20', initialBalance: '0' });
    } else {
      setError(outcome.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Create Agent" />
      {created && (
        <div className="mb-6">
          <TasSetupPanel
            username={created.username}
            password={created.password}
            setupCode={created.setupCode}
          />
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {(['fullName', 'username', 'password', 'phone'] as const).map((f) => (
          <div key={f}>
            <label className="mb-1 block text-sm font-medium capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
            <input
              type={f === 'password' ? 'password' : 'text'}
              required={f !== 'phone'}
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              placeholder={f === 'username' ? 'e.g. abebe (lowercase)' : undefined}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Admin share from agent %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.adminCommissionRate}
              onChange={(e) => setForm({ ...form, adminCommissionRate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">Agent sets their own pot commission in settings</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Initial Balance (ETB)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Agent & Get TAS Code'}
        </button>
      </form>
    </div>
  );
}
