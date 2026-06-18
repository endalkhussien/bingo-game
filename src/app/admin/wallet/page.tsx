'use client';

import { useEffect, useState, useCallback } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { TextArea } from '@/presentation/components/shared/text-area';
import { formatDate } from '@/presentation/lib/utils';
import { AlertTriangle, Wallet } from 'lucide-react';
import { BALANCE_UPDATED_EVENT } from '@/presentation/components/layout/admin-header';
import { normalizeVendorTopupCodeInput } from '@/shared/voucher/vendor-topup-code';

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

  const loadBalance = useCallback(async () => {
    const b = await ipc<number>('operator-wallet:balance');
    const safe = Number.isFinite(b) ? b : 0;
    setBalance(safe);
    return safe;
  }, []);

  const loadTransactions = useCallback(async () => {
    const rows = await ipc<WalletTx[]>('operator-wallet:transactions');
    setTxs(Array.isArray(rows) ? rows : []);
  }, []);

  const load = useCallback(async () => {
    try {
      await Promise.all([loadBalance(), loadTransactions()]);
    } catch {
      /* balance IPC requires activation */
    }
  }, [loadBalance, loadTransactions]);

  useEffect(() => { void load(); }, [load]);

  const handleRedeem = async () => {
    const normalized = normalizeVendorTopupCodeInput(code);
    if (!normalized) {
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
      }>('operator-wallet:redeem', normalized);

      if (result?.success && result.data) {
        const verified = Number.isFinite(result.data.newBalance) ? result.data.newBalance : 0;
        const reRead = await loadBalance();
        const finalBalance = reRead > 0 ? reRead : verified;

        if (finalBalance <= 0 && result.data.amount > 0) {
          setError('Top-up was accepted but balance still shows 0. Restart the app and try again, or contact support.');
          return;
        }

        setBalance(finalBalance);
        await loadTransactions();
        setSuccess(result.data.message);
        setCode('');
        window.dispatchEvent(new CustomEvent(BALANCE_UPDATED_EVENT, { detail: finalBalance }));
      } else {
        setError(result?.error ?? 'Redemption failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Redemption failed');
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = balance <= 0;

  return (
    <div>
      <PageHeader title="Shop Admin Balance" backHref="/admin/dashboard" backLabel="Back to Dashboard" />

      {isEmpty && (
        <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-6">
          <p className="flex items-center gap-2 text-lg font-bold text-amber-900">
            <AlertTriangle className="h-6 w-6" /> Balance is 0 — cannot issue TBG codes
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Contact your vendor for a <strong>TVP</strong> top-up code. Paste it below — your balance will update immediately.
          </p>
          <p className="mt-1 text-sm text-amber-700">የቀሪ ሂሳብ 0 ነው — ለመሥራት TVP ኮድ ያስፈልጋል</p>
        </div>
      )}

      <div className={`mb-6 rounded-xl border-2 p-5 ${isEmpty ? 'border-red-300 bg-white' : 'border-amber-200 bg-amber-50'}`}>
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Wallet className="h-5 w-5" /> Prepaid balance (TVP)
        </p>
        <p className={`mt-2 text-4xl font-bold ${isEmpty ? 'text-red-600' : 'text-amber-700'}`}>
          {balance.toFixed(0)} ETB
        </p>
        <p className="mt-2 text-sm text-amber-800">
          Redeem <strong>TVP</strong> codes from your vendor. This balance is deducted when you generate <strong>TBG</strong> recharge codes for agents.
        </p>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <TextArea
          label="Paste TVP top-up code from vendor"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); setSuccess(''); }}
          placeholder="TVP-xxxxxxxx…"
          rows={4}
          className="font-mono text-xs"
        />
        <button type="button" onClick={handleRedeem} disabled={loading}
          className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
          {loading ? 'Redeeming…' : 'Redeem TVP — add to balance'}
        </button>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{success}</p>}
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
                <td className={`px-4 py-3 font-medium ${tx.amount >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(0)} ETB
                </td>
                <td className="px-4 py-3 font-semibold">{tx.balanceAfter.toFixed(0)} ETB</td>
                <td className="px-4 py-3 text-gray-600">{tx.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
