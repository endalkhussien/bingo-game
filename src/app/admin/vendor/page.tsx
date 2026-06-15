'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { useAuth } from '@/presentation/providers/auth-provider';
import { isVendorRole } from '@/shared/roles';
import { CopyButton } from '@/presentation/components/shared/copy-button';
import { TextInput } from '@/presentation/components/shared/text-input';
import { formatDate } from '@/presentation/lib/utils';
import { BarChart3, KeyRound, Send } from 'lucide-react';

export default function VendorPortalPage() {
  const { user } = useAuth();
  const router = useRouter();
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

  useEffect(() => {
    if (user && !isVendorRole(user.role)) router.replace('/admin/dashboard');
  }, [user, router]);

  useEffect(() => {
    if (user && isVendorRole(user.role)) {
      ipc('license:commission-report', 7).then(setReport).catch(() => {});
    }
  }, [user]);

  const generate = async (days: 7 | 30) => {
    if (!shopName.trim()) {
      setError('Enter the shop name for this admin license');
      return;
    }
    setError('');
    setGenerated(null);
    const result = await ipc<{
      success: boolean;
      data?: { code: string; validUntil: number; period: string; validDays: number };
      error?: string;
    }>('license:generate', shopName.trim(), days, parseFloat(commissionRate) || 20);
    if (result.success && result.data) {
      setGenerated(result.data);
    } else {
      setError(result.error ?? 'Failed to generate license');
    }
  };

  if (!user || !isVendorRole(user.role)) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Vendor Board" />

      <div className="mb-6 rounded-xl border border-violet-300 bg-violet-50 p-5 text-sm text-violet-950">
        <p className="text-base font-bold">Three parties — your role is Vendor only</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li><strong>You (vendor)</strong> — send <code className="rounded bg-white px-1">.exe</code> + weekly/monthly <strong>TOL</strong> code to shop admin</li>
          <li><strong>Shop admin</strong> — pastes TOL, creates agents, sends each agent a <strong>TAS</strong> code</li>
          <li><strong>Agents</strong> — Activate PC with TAS on hall computers, then run games</li>
        </ol>
      </div>

      {report && (
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 font-semibold text-gray-800">
            <BarChart3 className="h-4 w-4 text-violet-600" /> Activity on this PC (last 7 days)
          </p>
          <p className="mt-2 text-3xl font-bold text-violet-700">{report.vendorCommissionDue.toFixed(0)} ETB</p>
          <p className="mt-1 text-sm text-gray-600">
            Commission due · {report.gameCount} games · {report.totalBets.toFixed(0)} ETB bets
            {report.shopName ? ` · ${report.shopName}` : ''}
          </p>
          <p className="mt-2 text-xs text-gray-500">Each shop PC keeps its own data. Collect commission, then issue a new TOL.</p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <p className="flex items-center gap-2 font-semibold text-gray-900">
          <KeyRound className="h-5 w-5 text-indigo-600" /> Generate shop admin license (TOL)
        </p>
        <p className="text-sm text-gray-600">
          Shop admin pastes this on <strong>Shop License (TOL)</strong> after install. This is <em>not</em> the agent TAS code.
        </p>
        <TextInput
          label="Shop name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="e.g. Bole Hall"
        />
        <TextInput
          label="Your commission % (from agent earnings)"
          type="number"
          min={0}
          max={100}
          step={1}
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => generate(7)}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            Weekly TOL (7 days)
          </button>
          <button type="button" onClick={() => generate(30)}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            Monthly TOL (30 days)
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {generated && (
          <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Send className="h-4 w-4" /> Send to shop admin with the installer
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              {generated.validDays}-day {generated.period} license · expires {formatDate(generated.validUntil)}
            </p>
            <p className="mt-3 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs">{generated.code}</p>
            <CopyButton text={generated.code} label="Copy TOL code for shop admin" variant="primary" className="mt-3" />
          </div>
        )}
      </div>
    </div>
  );
}
