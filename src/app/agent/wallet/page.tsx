'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { useAuth } from '@/presentation/providers/auth-provider';
import { formatDate } from '@/presentation/lib/utils';

interface Tx { id: string; amount: number; transactionType: string; description: string; balanceAfter: number; createdAt: number; }

export default function WalletPage() {
  const { agent } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  useEffect(() => { ipc<Tx[]>('wallet:transactions').then(setTxs); }, []);

  return (
    <div>
      <PageHeader title="Wallet" />
      <div className="mb-6 rounded-xl bg-sidebar p-6 text-white">
        <p className="text-sm opacity-80">Current Balance</p>
        <p className="text-4xl font-bold">{agent?.walletBalance?.toFixed(0) ?? 0} ETB</p>
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Amount</th><th className="px-4 py-3">Balance After</th>
            <th className="px-4 py-3">Description</th>
          </tr></thead>
          <tbody>
            {txs.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No transactions yet</td></tr>
            : txs.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{t.transactionType}</span></td>
                <td className={`px-4 py-3 font-medium ${t.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>{t.amount >= 0 ? '+' : ''}{t.amount.toFixed(0)} ETB</td>
                <td className="px-4 py-3">{t.balanceAfter.toFixed(0)} ETB</td>
                <td className="px-4 py-3 text-gray-500">{t.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
