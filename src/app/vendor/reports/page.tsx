'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { BarChart3 } from 'lucide-react';

interface CommissionReport {
  periodDays: number;
  gameCount: number;
  totalBets: number;
  vendorCommissionDue: number;
  shopName: string;
  vendorCommissionRate: number;
  licenseActive: boolean;
}

interface TopupSummary {
  totalIssued: number;
  codeCount: number;
  pendingCount: number;
  redeemedCount: number;
}

export default function VendorReportsPage() {
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [summary, setSummary] = useState<TopupSummary | null>(null);
  const [period, setPeriod] = useState(7);
  const [error, setError] = useState('');

  const load = (days: number) => {
    setError('');
    ipc<CommissionReport>('license:commission-report', days)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load report'));
    ipc<TopupSummary>('vendor-topup:summary').then(setSummary).catch(() => {});
  };

  useEffect(() => { load(period); }, [period]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue & Reports</h1>
        <p className="mt-1 text-sm text-violet-300">
          Commission is calculated on shop PCs where games run. TVP issuance is tracked on this vendor PC.
        </p>
      </div>

      <div className="flex gap-2">
        {[7, 14, 30].map((d) => (
          <button key={d} type="button" onClick={() => setPeriod(d)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${period === d ? 'bg-violet-600 text-white' : 'bg-white/10 text-violet-200 hover:bg-white/20'}`}>
            Last {d} days
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}

      {report && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="flex items-center gap-2 font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-violet-300" /> Commission due (shop PC data)
          </p>
          <p className="mt-2 text-3xl font-bold text-violet-200">{report.vendorCommissionDue.toFixed(0)} ETB</p>
          <p className="mt-1 text-sm text-violet-300">
            {report.gameCount} games · {report.totalBets.toFixed(0)} ETB bets · rate {report.vendorCommissionRate}%
            {report.shopName ? ` · ${report.shopName}` : ''}
          </p>
          {!report.licenseActive && (
            <p className="mt-2 text-xs text-amber-300">Shop has not activated yet or balance is 0 — games run after TAK activation and TVP balance.</p>
          )}
        </div>
      )}

      {summary && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="font-semibold text-white">TVP top-ups issued (this vendor PC)</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{summary.totalIssued.toFixed(0)} ETB</p>
          <p className="mt-1 text-sm text-violet-300">
            {summary.codeCount} codes · {summary.pendingCount} pending redemption · {summary.redeemedCount} redeemed
          </p>
        </div>
      )}
    </div>
  );
}
