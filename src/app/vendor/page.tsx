'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ipc } from '@/presentation/lib/ipc';
import { useAuth } from '@/presentation/providers/auth-provider';
import { KeyRound, Send, Wallet } from 'lucide-react';
import { VENDOR_TOL, VENDOR_TOPUP } from '@/shared/vendor-routes';

interface TopupSummary {
  totalIssued: number;
  codeCount: number;
  pendingCount: number;
  redeemedCount: number;
}

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TopupSummary | null>(null);

  useEffect(() => {
    ipc<TopupSummary>('vendor-topup:summary').then(setSummary).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Vendor Dashboard</h1>
        <p className="mt-1 text-sm text-violet-300">Logged in as {user?.username} — manage shop licenses and prepaid balance</p>
      </div>

      <div className="rounded-xl border border-violet-500/30 bg-violet-900/40 p-5 text-sm text-violet-100">
        <p className="text-base font-bold text-white">Three-party flow</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li><strong>You (vendor)</strong> → send <strong>TOL</strong> (license) + <strong>TVP</strong> (prepaid balance) to shop admin</li>
          <li><strong>Shop admin</strong> → pastes TOL, redeems TVP, creates agents with <strong>TAS</strong>, issues <strong>TBG</strong> to agents</li>
          <li><strong>Agent</strong> → activates PC with TAS, recharges wallet with TBG, runs games</li>
        </ol>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={VENDOR_TOL} className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
          <p className="flex items-center gap-2 font-semibold text-white"><KeyRound className="h-5 w-5 text-violet-300" /> TOL Licenses</p>
          <p className="mt-2 text-sm text-violet-200">Generate weekly or monthly shop admin license codes</p>
        </Link>
        <Link href={VENDOR_TOPUP} className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
          <p className="flex items-center gap-2 font-semibold text-white"><Wallet className="h-5 w-5 text-emerald-300" /> Shop Top-up (TVP)</p>
          <p className="mt-2 text-sm text-violet-200">Generate prepaid balance codes for shop admin to issue TBG to agents</p>
        </Link>
      </div>

      {summary && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="font-semibold text-white">TVP codes issued (this PC)</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{summary.totalIssued.toFixed(0)} ETB</p>
          <p className="mt-1 text-sm text-violet-300">
            {summary.codeCount} codes · {summary.pendingCount} pending · {summary.redeemedCount} redeemed
          </p>
        </div>
      )}

      <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="flex items-center gap-2 font-semibold"><Send className="h-4 w-4" /> Send to each new shop</p>
        <p className="mt-2">Installer <strong>.exe</strong> + shop admin login + <strong>TOL</strong> + first <strong>TVP</strong> top-up code</p>
      </div>
    </div>
  );
}
