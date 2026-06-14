'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { UserPlus, Users } from 'lucide-react';

interface AgentRow {
  id: string; fullName: string; username: string; phone: string | null;
  commissionRate: number; walletBalance: number; status: string;
  totalGames: number; totalProfit: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [search, setSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', password: '', phone: '', commissionRate: '20', initialBalance: '0' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => ipc<AgentRow[]>('agents:list').then(setAgents);
  useEffect(() => { load(); }, []);

  const filtered = agents.filter((a) =>
    a.fullName.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSuspend = async (id: string) => { await ipc('agents:suspend', id); load(); };
  const handleActivate = async (id: string) => { await ipc('agents:activate', id); load(); };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const result = await ipc<{ success: boolean; error?: string }>('agents:create', {
      fullName: form.fullName, username: form.username, password: form.password,
      phone: form.phone, commissionRate: parseFloat(form.commissionRate),
      initialBalance: parseFloat(form.initialBalance),
    });
    if (result.success) {
      setSuccess(`Agent "${form.username}" created! Create another or close this form.`);
      setForm({ fullName: '', username: '', password: '', phone: '', commissionRate: '20', initialBalance: '0' });
      load();
    } else {
      setError(result.error ?? 'Failed to create agent');
    }
  };

  return (
    <div>
      <PageHeader title="Manage Agents" action={
        <div className="flex gap-2">
          <button onClick={() => setShowQuickCreate(!showQuickCreate)}
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
          <p className="mb-4 text-sm text-gray-600">Create as many agents as you need. Each gets their own login to run games and earn commission.</p>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mb-3 text-sm text-green-600">{success}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(['fullName', 'username', 'password', 'phone'] as const).map((f) => (
              <div key={f}>
                <label className="mb-1 block text-xs font-medium capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
                <input type={f === 'password' ? 'password' : 'text'} required={f !== 'phone'} value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium">Default commission %</label>
              <input type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="20" />
              <p className="mt-1 text-xs text-gray-500">Starting value — agent can change per game</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Starting Wallet (ETB)</label>
              <input type="number" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Create Agent
          </button>
        </form>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents..."
        className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm" />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Username</th>
            <th className="px-4 py-3 font-semibold">Wallet</th>
            <th className="px-4 py-3 font-semibold">Commission</th>
            <th className="px-4 py-3 font-semibold">Games</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No agents yet. Click Quick Create above.</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{a.fullName}</td>
                <td className="px-4 py-3">{a.username}</td>
                <td className="px-4 py-3">{a.walletBalance.toFixed(0)} ETB</td>
                <td className="px-4 py-3">{a.commissionRate}%</td>
                <td className="px-4 py-3">{a.totalGames}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/admin/agents/detail?id=${a.id}`} className="text-blue-600 hover:underline text-xs">Deposit</Link>
                    {a.status === 'ACTIVE'
                      ? <button onClick={() => handleSuspend(a.id)} className="text-red-500 text-xs hover:underline">Suspend</button>
                      : <button onClick={() => handleActivate(a.id)} className="text-green-600 text-xs hover:underline">Activate</button>}
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
