'use client';

import { useEffect, useState, useCallback } from 'react';
import { Ticket, Shield, Trash2 } from 'lucide-react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { CopyButton } from '@/presentation/components/shared/copy-button';
import { formatDate } from '@/presentation/lib/utils';
import { copyToClipboard } from '@/presentation/lib/copy-to-clipboard';

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
  const [autoCopied, setAutoCopied] = useState(false);

  const load = useCallback(() => {
    ipc<AgentOption[]>('agents:list').then((rows) => {
      setAgents(rows.map((a) => ({ id: a.id, username: a.username, fullName: a.fullName })));
      setForUsername((prev) => prev || (rows[0]?.username ?? ''));
    }).catch(() => {});
    ipc<IssuedCode[]>('vouchers:list-issued').then(setIssued).catch(() => {});
    ipc<string>('vouchers:org-key').then(setOrgKey).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!forUsername) {
      setError('Select an agent — each code is unique and bound to that agent only');
      return;
    }
    setError('');
    setGenerated(null);
    setAutoCopied(false);
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
      const copied = await copyToClipboard(result.data.code);
      if (copied) {
        setAutoCopied(true);
        setTimeout(() => setAutoCopied(false), 4000);
      }
    } else {
      setError(result.error ?? 'Failed to generate code');
    }
  };

  const handleDelete = async (row: IssuedCode) => {
    if (row.status === 'REDEEMED') return;
    const msg = row.status === 'ISSUED'
      ? `Delete unused ${row.amount} ETB code for ${row.forUsername}? Agent will not be able to use it.`
      : `Remove this revoked code from the list?`;
    if (!window.confirm(msg)) return;

    const result = await ipc<{ success: boolean; error?: string }>('vouchers:delete', row.id);
    if (result.success) {
      load();
    } else {
      setError(result.error ?? 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Secure Recharge Codes" />
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> Unique &amp; secure offline codes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Agent must <strong>Activate PC</strong> with TAS setup code before redeeming</li>
          <li>Each code is <strong>cryptographically signed</strong> with your organization key</li>
          <li>Bound to <strong>one agent username</strong> — must match exactly on agent PC</li>
          <li><strong>One-time use</strong> per agent PC</li>
        </ul>
      </div>

      {orgKey && (
        <div className="mb-6 max-w-xl rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700">Organization recharge key (give to every agent PC)</p>
          <p className="mt-2 break-all rounded-lg bg-gray-50 p-3 font-mono text-xs select-all">{orgKey}</p>
          <CopyButton text={orgKey} label="Copy organization key" className="mt-2" />
        </div>
      )}

      <div className="mb-8 max-w-xl rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="flex items-center gap-2 font-semibold"><Ticket className="h-5 w-5" /> Generate unique code</h3>
        <div>
          <label className="mb-1 block text-sm font-medium">Amount (ETB)</label>
          <input type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)}
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
        <button type="button" onClick={handleGenerate} disabled={loading || !forUsername}
          className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-700">
          {loading ? 'Generating…' : 'Generate secure code'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-900">
              Send to <strong>{generated.forUsername}</strong> via SMS or Telebirr
            </p>
            {autoCopied && (
              <p className="mt-1 text-xs font-medium text-emerald-700">✓ Code copied to clipboard automatically</p>
            )}
            <p className="mt-2 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-sm font-bold text-emerald-900 select-all">
              {generated.code}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {generated.amount} ETB · expires {formatDate(generated.expiresAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={generated.code} label="Copy recharge code" variant="primary" copiedLabel="Copied!" />
            </div>
          </div>
        )}
      </div>

      {issued.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-800">Issued codes — copy or delete</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left border-t">
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-medium">{r.amount} ETB</td>
                  <td className="px-4 py-3">{r.forUsername}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="block truncate font-mono text-xs text-gray-600" title={r.code}>{r.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'REDEEMED' ? 'bg-green-100 text-green-700'
                        : r.status === 'REVOKED' ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.issuedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.status !== 'REVOKED' && (
                        <CopyButton text={r.code} label="Copy" className="!px-2 !py-1 !text-xs" />
                      )}
                      {r.status !== 'REDEEMED' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          title={r.status === 'ISSUED' ? 'Delete unused code' : 'Remove from list'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
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
