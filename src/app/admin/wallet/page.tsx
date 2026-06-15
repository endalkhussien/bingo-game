'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { TextArea } from '@/presentation/components/shared/text-area';
import { formatDate } from '@/presentation/lib/utils';
import { Wallet } from 'lucide-react';

interface WalletTx {
  id: string;
  amount: number;
  transactionType: string;
  description: string;
  balanceAfter: number;
  createdAt: number;
}

export default function AdminWalletPage() {
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    ipc<number>('operator-wallet:balance').then(setBalance).catch(() => {});
    ipc<WalletTx[]>('operator-wallet:transactions').then(setTxs).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Paste the TVP code from your vendor');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await ipc<{
        success: boolean;
        data?: { message: string; newBalance: number; amount: number };
        error?: string;
      }>('operator-wallet:redeem', trimmed);
      if (result?.success && result.data) {
        setSuccess(result.data.message);
        setCode('');
        setBalance(result.data.newBalance);
        load();
      } else {
        setError(result?.error ?? 'Redemption failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redemption failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Shop Admin Balance" />
      <div className="mb-6 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <Wallet className="h-5 w-5" /> Prepaid balance
        </p>
        <p className="mt-2 text-4xl font-bold text-indigo-700">{balance.toFixed(0)} ETB</p>
        <p className="mt-2 text-sm text-indigo-800">
          Redeem <strong>TVP</strong> codes from your vendor. This balance is used when you generate <strong>TBG</strong> recharge codes for agents.
        </p>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <TextArea
          label="Paste TVP top-up code from vendor"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="TVP-xxxxxxxx…"
          rows={4}
          className="font-mono text-xs"
        />
        <button type="button" onClick={handleRedeem} disabled={loading}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          {loading ? 'Redeeming…' : 'Redeem TVP — add to balance'}
        </button>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Balance</th>
              <th className="px-4 py-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No transactions yet. Redeem a TVP code from vendor.</td></tr>
            ) : txs.map((tx) => (
              <tr key={tx.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{formatDate(tx.createdAt)}</td>
                <td className="px-4 py-3">{tx.transactionType}</td>
                <td className={`px-4 py-3 font-medium ${tx.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(0)} ETB
                </td>
                <td className="px-4 py-3">{tx.balanceAfter.toFixed(0)} ETB</td>
                <td className="px-4 py-3 text-gray-600">{tx.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
