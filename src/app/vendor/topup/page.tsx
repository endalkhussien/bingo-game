'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { CopyButton } from '@/presentation/components/shared/copy-button';
import { TextInput } from '@/presentation/components/shared/text-input';
import { formatDate } from '@/presentation/lib/utils';
import { Send, Wallet } from 'lucide-react';

interface IssuedTopup {
  id: string;
  code: string;
  amount: number;
  shopName: string;
  expiresAt: number;
  status: string;
  issuedAt: number;
}

export default function VendorTopupPage() {
  const [shopName, setShopName] = useState('');
  const [amount, setAmount] = useState('1000');
  const [generated, setGenerated] = useState<{ code: string; amount: number; validUntil: number; shopName: string } | null>(null);
  const [issued, setIssued] = useState<IssuedTopup[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => ipc<IssuedTopup[]>('vendor-topup:list').then(setIssued).catch(() => {});

  useEffect(() => { load(); }, []);

  const generate = async () => {
    const parsedAmount = parseFloat(amount);
    if (!shopName.trim()) {
      setError('Enter shop name');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount in ETB');
      return;
    }
    setLoading(true);
    setError('');
    setGenerated(null);
    try {
      const result = await ipc<{
        success: boolean;
        data?: { code: string; amount: number; validUntil: number; shopName: string };
        error?: string;
      }>('vendor-topup:generate', shopName.trim(), parsedAmount);
      if (result?.success && result.data) {
        setGenerated(result.data);
        load();
      } else {
        setError(result?.error ?? 'Failed to generate TVP code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate TVP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">TVP — Shop Admin Top-up</h1>
        <p className="mt-1 text-sm text-violet-300">
          Shop admin redeems TVP to fund their balance. They use that balance to generate TBG codes for agents.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white p-6 text-gray-900 shadow-xl space-y-4">
        <p className="flex items-center gap-2 font-semibold">
          <Wallet className="h-5 w-5 text-emerald-600" /> Generate TVP prepaid code
        </p>
        <TextInput label="Shop name" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Same name as TOL shop" />
        <TextInput label="Amount (ETB)" type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="button" onClick={generate} disabled={loading}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading ? 'Generating…' : 'Generate TVP code'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Send className="h-4 w-4" /> {generated.amount.toFixed(0)} ETB for {generated.shopName}
            </p>
            <p className="mt-1 text-xs text-emerald-800">Expires {formatDate(generated.validUntil)}</p>
            <p className="mt-3 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs select-all">{generated.code}</p>
            <CopyButton text={generated.code} label="Copy TVP code" variant="primary" className="mt-3" />
          </div>
        )}
      </div>

      {issued.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="mb-3 font-semibold text-white">Recently issued TVP codes</p>
          <div className="space-y-2 text-sm">
            {issued.slice(0, 10).map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-violet-100">
                <span>{row.shopName} · {row.amount.toFixed(0)} ETB</span>
                <span className="text-xs text-violet-300">{row.status} · {formatDate(row.issuedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
