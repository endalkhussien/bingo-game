'use client';

import { useEffect, useState } from 'react';
import { Copy, Ticket } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

interface AgentOption {
  id: string;
  username: string;
  fullName: string;
}

interface IssuedCode {
  id: string;
  code: string;
  amount: number;
  forUsername: string;
  expiresAt: number;
  issuedAt: number;
}

export default function AdminVouchersPage() {
  const [amount, setAmount] = useState('500');
  const [forUsername, setForUsername] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [generated, setGenerated] = useState<{ code: string; amount: number; expiresAt: number } | null>(null);
  const [issued, setIssued] = useState<IssuedCode[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    ipc<AgentOption[]>('agents:list').then((rows) =>
      setAgents(rows.map((a) => ({ id: a.id, username: a.username, fullName: a.fullName }))),
    );
    ipc<IssuedCode[]>('vouchers:list-issued').then(setIssued).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setError('');
    setGenerated(null);
    setLoading(true);
    const result = await ipc<{
      success: boolean;
      data?: { code: string; amount: number; expiresAt: number };
      error?: string;
    }>('vouchers:generate', parseFloat(amount), forUsername || undefined);
    setLoading(false);
    if (result.success && result.data) {
      setGenerated(result.data);
      load();
    } else {
      setError(result.error ?? 'Failed to generate code');
    }
  };

  const copyCode = async () => {
    if (generated?.code) await navigator.clipboard.writeText(generated.code);
  };

  return (
    <div>
      <PageHeader title="Offline Recharge Codes" />
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">For agents on separate PCs (no internet)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Agent pays you cash / Telebirr in real life</li>
          <li>Generate a code here and send it by SMS or phone call</li>
          <li>Agent enters the code on their PC → balance updates instantly</li>
        </ol>
      </div>

      <div className="mb-8 max-w-xl rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="flex items-center gap-2 font-semibold"><Ticket className="h-5 w-5" /> Generate code</h3>
        <div>
          <label className="mb-1 block text-sm font-medium">Amount (ETB)</label>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">For agent (optional)</label>
          <select value={forUsername} onChange={(e) => setForUsername(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Any agent can use this code</option>
            {agents.map((a) => (
              <option key={a.id} value={a.username}>{a.fullName} ({a.username})</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Binding to one agent stops other agents from using the same code</p>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? 'Generating…' : 'Generate recharge code'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border border-emerald-300 bg-white p-4">
            <p className="text-xs text-gray-500">Send this to the agent (SMS / call / paper):</p>
            <p className="mt-2 break-all font-mono text-lg font-bold text-emerald-800">{generated.code}</p>
            <p className="mt-2 text-sm text-gray-600">
              {generated.amount} ETB · expires {formatDate(generated.expiresAt)}
            </p>
            <button onClick={copyCode}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
              <Copy className="h-4 w-4" /> Copy code
            </button>
          </div>
        )}
      </div>

      {issued.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">For agent</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Code</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.amount} ETB</td>
                  <td className="px-4 py-3">{r.forUsername}</td>
                  <td className="px-4 py-3">{formatDate(r.issuedAt)}</td>
                  <td className="px-4 py-3">{formatDate(r.expiresAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.code.slice(0, 28)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
