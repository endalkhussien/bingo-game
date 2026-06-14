'use client';

import { useEffect, useState } from 'react';
import { Copy, Ticket, Shield } from 'lucide-react';
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
  status: string;
}

export default function AdminVouchersPage() {
  const [amount, setAmount] = useState('500');
  const [forUsername, setForUsername] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [orgKey, setOrgKey] = useState('');
  const [generated, setGenerated] = useState<{ code: string; amount: number; expiresAt: number; forUsername: string } | null>(null);
  const [issued, setIssued] = useState<IssuedCode[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    ipc<AgentOption[]>('agents:list').then((rows) => {
      setAgents(rows.map((a) => ({ id: a.id, username: a.username, fullName: a.fullName })));
      if (!forUsername && rows.length > 0) setForUsername(rows[0].username);
    });
    ipc<IssuedCode[]>('vouchers:list-issued').then(setIssued).catch(() => {});
    ipc<string>('vouchers:org-key').then(setOrgKey).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!forUsername) {
      setError('Select an agent — each code is unique and bound to that agent only');
      return;
    }
    setError('');
    setGenerated(null);
    setLoading(true);
    const result = await ipc<{
      success: boolean;
      data?: { code: string; amount: number; expiresAt: number; forUsername: string };
      error?: string;
    }>('vouchers:generate', parseFloat(amount), forUsername);
    setLoading(false);
    if (result.success && result.data) {
      setGenerated(result.data);
      load();
    } else {
      setError(result.error ?? 'Failed to generate code');
    }
  };

  const handleRevoke = async (id: string) => {
    await ipc('vouchers:revoke', id);
    load();
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <PageHeader title="Secure Recharge Codes" />
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> Unique &amp; secure offline codes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Each code is <strong>cryptographically signed</strong> with your organization key</li>
          <li>Bound to <strong>one agent</strong> — no one else can use it</li>
          <li><strong>One-time use</strong> — cannot be redeemed twice</li>
          <li>Give agents the <strong>organization key</strong> once when you install their PC</li>
        </ul>
      </div>

      {orgKey && (
        <div className="mb-6 max-w-xl rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700">Organization recharge key (give to every agent PC)</p>
          <p className="mt-2 break-all rounded-lg bg-gray-50 p-3 font-mono text-xs">{orgKey}</p>
          <button onClick={() => copy(orgKey)}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
            <Copy className="h-4 w-4" /> Copy organization key
          </button>
        </div>
      )}

      <div className="mb-8 max-w-xl rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="flex items-center gap-2 font-semibold"><Ticket className="h-5 w-5" /> Generate unique code</h3>
        <div>
          <label className="mb-1 block text-sm font-medium">Amount (ETB)</label>
          <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Agent (required)</label>
          <select value={forUsername} onChange={(e) => setForUsername(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Select agent…</option>
            {agents.map((a) => (
              <option key={a.id} value={a.username}>{a.fullName} ({a.username})</option>
            ))}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={loading || !forUsername}
          className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? 'Generating…' : 'Generate secure code'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border border-emerald-300 bg-white p-4">
            <p className="text-xs text-gray-500">Send to <strong>{generated.forUsername}</strong> via SMS or call:</p>
            <p className="mt-2 break-all font-mono text-base font-bold text-emerald-800">{generated.code}</p>
            <p className="mt-2 text-sm text-gray-600">
              {generated.amount} ETB · expires {formatDate(generated.expiresAt)}
            </p>
            <button onClick={() => copy(generated.code)}
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
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.amount} ETB</td>
                  <td className="px-4 py-3">{r.forUsername}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === 'REDEEMED' ? 'bg-green-100 text-green-700'
                        : r.status === 'REVOKED' ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">{formatDate(r.issuedAt)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'ISSUED' && (
                      <button onClick={() => handleRevoke(r.id)} className="text-xs text-red-600 hover:underline">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
