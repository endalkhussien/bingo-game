'use client';

import { useState } from 'react';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { TasSetupPanel } from '@/presentation/components/admin/tas-setup-panel';
import { TextInput } from '@/presentation/components/shared/text-input';
import { createAgentWithSetup } from '@/presentation/lib/create-agent-with-setup';

export default function NewAgentPage() {
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20' });
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
    });

    if (outcome.ok) {
      setCreated(outcome.result);
      setForm({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20' });
    } else {
      setError(outcome.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Create Agent" backHref="/admin/agents" backLabel="Back to Agents" />
      <p className="mb-4 text-sm text-gray-600">
        New agents start with <strong>0 ETB</strong>. Send them the TAS code to activate their PC, then issue a <strong>TBG</strong> recharge code when they pay you.
      </p>
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
        <TextInput label="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <TextInput
          label="Username"
          required
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="e.g. abebe (lowercase)"
        />
        <TextInput
          label="Password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <TextInput label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <TextInput
          label="Admin share from agent %"
          type="number"
          min={0}
          max={100}
          step={1}
          value={form.adminCommissionRate}
          onChange={(e) => setForm({ ...form, adminCommissionRate: e.target.value })}
          hint="Agent sets their own pot commission in settings"
        />
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Agent & Get TAS Code'}
        </button>
      </form>
    </div>
  );
}
