'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { CopyButton } from '@/presentation/components/shared/copy-button';
import { TextInput } from '@/presentation/components/shared/text-input';
import { formatDate } from '@/presentation/lib/utils';
import { BarChart3, KeyRound, Send } from 'lucide-react';

export default function VendorBoardPage() {
  const { user } = useAuth();
  const [shopName, setShopName] = useState('');
  const [commissionRate, setCommissionRate] = useState('20');
  const [generated, setGenerated] = useState<{
    code: string;
    validUntil: number;
    period: string;
    validDays: number;
  } | null>(null);
  const [report, setReport] = useState<{
    gameCount: number;
    totalBets: number;
    vendorCommissionDue: number;
    shopName: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    ipc('license:commission-report', 7).then(setReport).catch(() => {});
  }, []);

  const generate = async (days: 7 | 30) => {
    if (!shopName.trim()) {
      setError('Enter the shop name for this admin license');
      return;
    }
    setError('');
    setGenerated(null);
    setGenerating(true);
    try {
      const result = await ipc<{
        success: boolean;
        data?: { code: string; validUntil: number; period: string; validDays: number };
        error?: string;
      }>('license:generate', shopName.trim(), days, parseFloat(commissionRate) || 20);
      if (result?.success && result.data) {
        setGenerated(result.data);
      } else {
        setError(result?.error ?? 'Failed to generate TOL code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate TOL code');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Vendor Board</h1>
        <p className="mt-1 text-sm text-violet-300">Logged in as {user?.username} — generate TOL only, not TAS</p>
      </div>

      <div className="rounded-xl border border-violet-500/30 bg-violet-900/40 p-5 text-sm text-violet-100">
        <p className="text-base font-bold text-white">Your job as vendor</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Send shop the <strong>.exe</strong> installer</li>
          <li>Generate <strong>TOL</strong> below (weekly or monthly)</li>
          <li>Shop admin logs in as <strong>admin</strong> and pastes TOL on their PC</li>
          <li>Shop admin creates agents and sends them <strong>TAS</strong> (you do not)</li>
        </ol>
      </div>

      {report && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-violet-300" /> Activity report (this PC, last 7 days)
          </p>
          <p className="mt-2 text-3xl font-bold text-violet-200">{report.vendorCommissionDue.toFixed(0)} ETB</p>
          <p className="mt-1 text-sm text-violet-300">
            {report.gameCount} games · {report.totalBets.toFixed(0)} ETB bets
            {report.shopName ? ` · ${report.shopName}` : ''}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white p-6 text-gray-900 shadow-xl space-y-4">
        <p className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-5 w-5 text-indigo-600" /> Generate TOL for shop admin
        </p>
        <p className="text-sm text-gray-600">
          Shop admin pastes this code on <strong>Activate Shop Admin (TOL)</strong>. Do not confuse with agent TAS.
        </p>
        <TextInput
          label="Shop name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="e.g. Bole Hall"
        />
        <TextInput
          label="Commission % (from agent earnings)"
          type="number"
          min={0}
          max={100}
          step={1}
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => generate(7)}
            disabled={generating}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Weekly TOL (7 days)'}
          </button>
          <button
            type="button"
            onClick={() => generate(30)}
            disabled={generating}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            Monthly TOL (30 days)
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Send className="h-4 w-4" /> Copy and send to shop admin
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              {generated.validDays}-day {generated.period} · expires {formatDate(generated.validUntil)}
            </p>
            <p className="mt-3 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs select-all">
              {generated.code}
            </p>
            <CopyButton text={generated.code} label="Copy TOL code" variant="primary" className="mt-3" />
          </div>
        )}
      </div>
    </div>
  );
}
