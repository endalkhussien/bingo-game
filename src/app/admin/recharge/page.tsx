'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

interface RechargeRow {
  id: string; agentName: string; amount: number; paymentMethod: string;
  referenceNumber: string | null; status: string; requestedAt: number;
}

export default function AdminRechargePage() {
  const [requests, setRequests] = useState<RechargeRow[]>([]);
  const [tab, setTab] = useState('PENDING');

  const load = () => ipc<RechargeRow[]>('recharge:list', { status: tab === 'ALL' ? undefined : tab }).then(setRequests);
  useEffect(() => { load(); }, [tab]);

  const approve = async (id: string) => { await ipc('recharge:approve', id); load(); };
  const reject = async (id: string) => { await ipc('recharge:reject', id, 'Rejected by admin'); load(); };

  return (
    <div>
      <PageHeader title="Recharge Requests" />
      <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Agent balance is added only via <strong>TBG codes</strong> from{' '}
        <a href="/admin/vouchers/" className="font-semibold text-indigo-700 underline">Recharge (TBG)</a>.
        Manual approval is disabled — reject old requests and issue a TBG code instead.
      </p>
      <div className="mb-4 flex gap-2">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>{t}</button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Agent</th><th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Method</th><th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>
            {requests.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No requests found</td></tr>
            : requests.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{r.agentName}</td>
                <td className="px-4 py-3 font-medium">{r.amount} ETB</td>
                <td className="px-4 py-3">{r.paymentMethod}</td>
                <td className="px-4 py-3">{formatDate(r.requestedAt)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : r.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span></td>
                <td className="px-4 py-3">
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => approve(r.id)} className="text-green-600 text-xs hover:underline">Approve</button>
                      <button onClick={() => reject(r.id)} className="text-red-500 text-xs hover:underline">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
