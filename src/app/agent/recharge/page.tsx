'use client';

import { useState, useEffect } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

export default function RechargePage() {
  const [tab, setTab] = useState<'voucher' | 'request'>('voucher');
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('100');
  const [method, setMethod] = useState('Bank Transfer');
  const [ref, setRef] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const { refreshBalance } = useAuth();

  const loadRequests = () => ipc('recharge:list').then(setRequests);
  useEffect(() => { if (tab === 'request') loadRequests(); }, [tab]);

  const handleVoucher = async () => {
    if (!code.trim()) { setError('Please enter a voucher code'); return; }
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
        <button onClick={() => setTab('voucher')} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === 'voucher' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Voucher Code</button>
        <button onClick={() => setTab('request')} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === 'request' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>Request Recharge</button>
      </div>
      {tab === 'voucher' ? (
        <div className="max-w-lg">
          <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
            placeholder="Enter Voucher Code" className="mb-4 w-full rounded-lg border px-4 py-3 text-sm" />
          <button onClick={handleVoucher} disabled={loading} className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Processing...' : 'Recharge'}
          </button>
          <div className="mt-6 rounded-lg bg-gray-100 p-4 text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">Demo vouchers:</p>
            <p>VOUCHER100 · VOUCHER500 · VOUCHER1000 · DEMO2024</p>
          </div>
        </div>
      ) : (
        <div className="max-w-lg space-y-4">
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
