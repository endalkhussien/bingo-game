'use client';

import { useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { CopyButton } from '@/presentation/components/shared/copy-button';
import { TextInput } from '@/presentation/components/shared/text-input';
import { KeyRound, Send } from 'lucide-react';

export default function VendorTolPage() {
  const { user } = useAuth();
  const [shopName, setShopName] = useState('');
  const [amount, setAmount] = useState('1000');
  const [commissionRate, setCommissionRate] = useState('20');
  const [generated, setGenerated] = useState<{
    code: string;
    amount: number;
    shopName: string;
    vendorCommissionRate: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!shopName.trim()) {
      setError('Enter the shop name for this admin');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid ETB balance amount');
      return;
    }
    setError('');
    setGenerated(null);
    setGenerating(true);
    try {
      const result = await ipc<{
        success: boolean;
        data?: { code: string; amount: number; shopName: string; vendorCommissionRate: number };
        error?: string;
      }>('license:generate', shopName.trim(), parsedAmount, parseFloat(commissionRate) || 20);
      if (result?.success && result.data) {
        setGenerated(result.data);
      } else {
        setError(result?.error ?? 'Failed to generate activation key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate activation key');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">TAK — Shop Admin Activation</h1>
        <p className="mt-1 text-sm text-violet-300">
          Logged in as {user?.username}. One key activates the shop admin portal and funds their balance (TVP).
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white p-6 text-gray-900 shadow-xl space-y-4">
        <p className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-5 w-5 text-indigo-600" /> Generate activation key for shop admin
        </p>
        <TextInput
          label="Shop name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="e.g. Bole Hall"
        />
        <TextInput
          label="Starting balance (ETB) — included in key"
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <TextInput
          label="Your commission % (from shop admin earnings)"
          type="number"
          min={0}
          max={100}
          step={1}
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
        />
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate TAK activation key'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Send className="h-4 w-4" /> Copy and send to shop admin (one-time use)
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Includes <strong>{generated.amount.toFixed(0)} ETB</strong> shop balance for {generated.shopName}
            </p>
            <p className="mt-3 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs select-all">
              {generated.code}
            </p>
            <CopyButton text={generated.code} label="Copy TAK key" variant="primary" className="mt-3" />
          </div>
        )}
      </div>
    </div>
  );
}
