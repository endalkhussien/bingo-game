'use client';

import { useState, useEffect } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';
import Link from 'next/link';

export default function RechargePage() {
  const [tab, setTab] = useState<'voucher' | 'request'>('voucher');
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('100');
  const [method, setMethod] = useState('Bank Transfer');
  const [ref, setRef] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasOrgKey, setHasOrgKey] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const { refreshBalance, user } = useAuth();

  useEffect(() => {
    ipc<boolean>('settings:has-org-key').then(setHasOrgKey).catch(() => setHasOrgKey(false));
  }, []);

  const loadRequests = () => ipc('recharge:list').then(setRequests);
  useEffect(() => { if (tab === 'request') loadRequests(); }, [tab]);

  const handleVoucher = async () => {
    if (!code.trim()) { setError('Please enter a recharge code'); return; }
    setLoading(true); setError(''); setMessage('');
    const result = await ipc<{ success: boolean; data?: { amount: number; newBalance: number }; error?: string }>('wallet:redeem', code.trim());
    setLoading(false);
    if (result.success && result.data) {
      setMessage(`Recharged ${result.data.amount} ETB. New balance: ${result.data.newBalance} ETB`);
      setCode(''); await refreshBalance();
    } else setError(result.error ?? 'Failed');
  };

  const handleRequest = async () => {
    setLoading(true); setError(''); setMessage('');
    const result = await ipc<{ success: boolean }>('recharge:submit', { amount: parseFloat(amount), paymentMethod: method, referenceNumber: ref });
    setLoading(false);
    if (result.success) { setMessage('Recharge request submitted. Awaiting admin approval.'); loadRequests(); }
    else setError('Failed to submit request');
  };

  return (
    <div>
      <PageHeader title="Recharge Balance" />
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('voucher')} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === 'voucher' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Recharge Code</button>
        <button onClick={() => setTab('request')} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === 'request' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Request (same PC only)</button>
      </div>
      {tab === 'voucher' ? (
        <div className="max-w-lg">
          {hasOrgKey === false && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Setup required (one time per PC)</p>
              <p className="mt-1">Ask your admin for the <strong>organization key</strong>, then save it in{' '}
                <Link href="/agent/settings" className="font-semibold underline">Settings</Link>.
              </p>
              <p className="mt-1 text-xs">Fresh installs include a default key — if recharge still fails, confirm admin generated the code for username <strong>{user?.username}</strong>.</p>
            </div>
          )}
          {hasOrgKey && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">How to recharge (offline)</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Pay admin by cash or Telebirr</li>
                <li>Admin sends you a <strong>TBG-…</strong> code for account <strong>{user?.username}</strong></li>
                <li>Paste the code below — each code works once</li>
              </ol>
            </div>
          )}
          <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
            placeholder="Paste TBG- code from admin" className="mb-4 w-full rounded-lg border px-4 py-3 text-sm font-mono" />
          <button onClick={handleVoucher} disabled={loading} className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Processing...' : 'Recharge'}
          </button>
          <div className="mt-6 rounded-lg bg-gray-100 p-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">Demo codes (this PC only, username &quot;agent&quot;):</p>
            <p>VOUCHER100 · VOUCHER500 · VOUCHER1000 · DEMO2024</p>
          </div>
        </div>
      ) : (
        <div className="max-w-lg space-y-4">
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Recharge requests only work when admin uses the <strong>same computer</strong> as you.
            On a separate agent PC, use <strong>Recharge Code</strong> instead.
          </div>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (ETB)" className="w-full rounded-lg border px-4 py-3 text-sm" />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border px-4 py-3 text-sm">
            <option>Bank Transfer</option><option>Mobile Money</option><option>Cash</option>
          </select>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reference number" className="w-full rounded-lg border px-4 py-3 text-sm" />
          <button onClick={handleRequest} disabled={loading} className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white">Submit Request</button>
          {requests.length > 0 && (
            <div className="mt-4 rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Date</th></tr></thead>
                <tbody>{requests.map((r, i) => (
                  <tr key={i} className="border-t"><td className="px-3 py-2">{Number(r.amount)} ETB</td>
                    <td className="px-3 py-2">{String(r.status)}</td>
                    <td className="px-3 py-2">{formatDate(Number(r.requestedAt))}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
    </div>
  );
}
