'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { createAgentWithSetup } from '@/presentation/lib/create-agent-with-setup';
import { TasSetupPanel } from '@/presentation/components/admin/tas-setup-panel';
import { TextInput } from '@/presentation/components/shared/text-input';

interface AgentRow {
  id: string; fullName: string; username: string; phone: string | null;
  commissionRate: number; adminCommissionRate: number; walletBalance: number; status: string;
  totalGames: number; totalProfit: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [search, setSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [actionError, setActionError] = useState('');

  const load = () => ipc<AgentRow[]>('agents:list').then(setAgents);
  useEffect(() => { load(); }, []);

  const filtered = agents.filter((a) =>
    a.fullName.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSuspend = async (id: string) => {
    setActionError('');
    await ipc('agents:suspend', id);
    load();
  };
  const handleActivate = async (id: string) => {
    setActionError('');
    await ipc('agents:activate', id);
    load();
  };
  const handleDelete = async (agent: AgentRow) => {
    const msg = agent.totalGames > 0
      ? `Delete agent "${agent.fullName}" (${agent.username})? Their ${agent.totalGames} past game(s) on this PC will be removed.`
      : `Delete agent "${agent.fullName}" (${agent.username})? They will not be able to log in on any PC with this account.`;
    if (!window.confirm(msg)) return;
    setActionError('');
    const result = await ipc<{ success: boolean; error?: string }>('agents:delete', agent.id);
    if (result?.success) {
      load();
    } else {
      setActionError(result?.error ?? 'Delete failed');
    }
  };

  const [lastSetup, setLastSetup] = useState<{ username: string; password: string; setupCode: string } | null>(null);

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLastSetup(null);

    const outcome = await createAgentWithSetup({
      fullName: form.fullName,
      username: form.username,
      password: form.password,
      phone: form.phone,
      adminCommissionRate: parseFloat(form.adminCommissionRate) || 20,
    });

    if (outcome.ok) {
      setLastSetup(outcome.result);
      setSuccess(`Agent "${outcome.result.username}" created. Copy the TAS code below.`);
      setForm({ fullName: '', username: '', password: '', phone: '', adminCommissionRate: '20' });
      load();
    } else {
      setError(outcome.error);
    }
  };

  return (
    <div>
      <PageHeader title="Manage Agents" action={
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowQuickCreate(!showQuickCreate)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            <UserPlus className="h-4 w-4" /> Quick Create
          </button>
          <Link href="/admin/agents/new" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">Full Form</Link>
        </div>
      } />

      {showQuickCreate && (
        <form onSubmit={handleQuickCreate} className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-indigo-900">
            <Users className="h-5 w-5" /> Create New Agent Account
          </h3>
          <p className="mb-4 text-sm text-gray-600">Agents start with <strong>0 ETB</strong>. After they activate their PC with TAS, recharge them using <strong>TBG</strong> codes from Recharge (TBG).</p>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mb-3 text-sm text-green-600">{success}</p>}
          {lastSetup && (
            <div className="mb-4">
              <TasSetupPanel
                username={lastSetup.username}
                password={lastSetup.password}
                setupCode={lastSetup.setupCode}
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextInput
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
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
            <TextInput
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextInput
              label="Admin share from agent %"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.adminCommissionRate}
              onChange={(e) => setForm({ ...form, adminCommissionRate: e.target.value })}
              hint="Taken from agent commission earnings"
            />
          </div>
          <button type="submit" className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Create Agent &amp; Get TAS Code
          </button>
        </form>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents..."
        className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Username</th>
            <th className="px-4 py-3 font-semibold">Wallet</th>
            <th className="px-4 py-3 font-semibold">Agent %</th>
            <th className="px-4 py-3 font-semibold">Admin %</th>
            <th className="px-4 py-3 font-semibold">Games</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No agents yet. Click Quick Create above.</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{a.fullName}</td>
                <td className="px-4 py-3">{a.username}</td>
                <td className="px-4 py-3">{a.walletBalance.toFixed(0)} ETB</td>
                <td className="px-4 py-3">{a.commissionRate}%</td>
                <td className="px-4 py-3">{a.adminCommissionRate}%</td>
                <td className="px-4 py-3">{a.totalGames}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/agents/detail?id=${a.id}`} className="text-blue-600 hover:underline text-xs">Manage</Link>
                    {a.status === 'ACTIVE'
                      ? <button type="button" onClick={() => handleSuspend(a.id)} className="text-orange-600 text-xs hover:underline">Deactivate</button>
                      : <button type="button" onClick={() => handleActivate(a.id)} className="text-green-600 text-xs hover:underline">Activate</button>}
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="inline-flex items-center gap-0.5 text-red-600 text-xs hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
