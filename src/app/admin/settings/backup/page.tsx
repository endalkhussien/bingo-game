'use client';

import { useState } from 'react';
import { invokeIpc } from '@/presentation/lib/ipc';
import { runFactoryReset } from '@/presentation/lib/factory-reset';
import { isElectron } from '@/shared/runtime';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function AdminBackupPage() {
  const [msg, setMsg] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleExport = async () => {
    const r = await invokeIpc<{ success: boolean; path?: string; error?: string }>('database:export');
    if (r?.success) setMsg(`Exported to ${r.path}`);
    else setMsg(r?.error ?? 'Export failed — use the installed Windows app for file export');
  };

  const handleImport = async () => {
    const r = await invokeIpc<{ success: boolean; error?: string }>('database:import');
    if (r?.success) {
      setMsg('Database imported. Reloading…');
      window.location.reload();
    } else setMsg(r?.error ?? 'Import failed');
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL data? This cannot be undone.')) return;
    setResetting(true);
    setMsg('');
    const r = await runFactoryReset();
    setResetting(false);
    setMsg(r.ok ? r.message : r.error);
  };

  return (
    <div>
      <PageHeader title="Backup & Data" backHref="/admin/settings/" backLabel="Settings" />
      <p className="mb-4 text-sm text-slate-600">
        {isElectron()
          ? 'SQLite database on this PC — export a backup file or wipe everything.'
          : 'Browser preview — backup/export needs the installed Windows .exe with SQLite.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Export database
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
        >
          Import database
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={resetting}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {resetting ? 'Clearing…' : 'Clear All Data'}
        </button>
      </div>
      {msg && <p className="mt-4 text-sm text-slate-700">{msg}</p>}
    </div>
  );
}
