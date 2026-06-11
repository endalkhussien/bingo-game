'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

interface Backup { filename: string; size: number; createdAt: string; }

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [msg, setMsg] = useState('');

  const load = () => ipc<Backup[]>('backup:list').then(setBackups);
  useEffect(() => { load(); }, []);

  const create = async () => {
    const r = await ipc<{ success: boolean; data?: { filename: string } }>('backup:create');
    if (r.success) { setMsg(`Backup created: ${r.data?.filename}`); load(); }
  };

  const restore = async (filename: string) => {
    if (!confirm(`Restore from ${filename}? App will need restart.`)) return;
    const r = await ipc<{ success: boolean; message?: string }>('backup:restore', filename);
    setMsg(r.message ?? 'Restored');
  };

  return (
    <div>
      <PageHeader title="Backup & Restore" action={
        <button onClick={create} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Create Backup</button>
      } />
      {msg && <p className="mb-4 text-sm text-green-600">{msg}</p>}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Filename</th><th className="px-4 py-3">Size</th>
            <th className="px-4 py-3">Created</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>
            {backups.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No backups yet</td></tr>
            : backups.map((b) => (
              <tr key={b.filename} className="border-t">
                <td className="px-4 py-3">{b.filename}</td>
                <td className="px-4 py-3">{(b.size / 1024).toFixed(1)} KB</td>
                <td className="px-4 py-3">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3"><button onClick={() => restore(b.filename)} className="text-blue-600 text-xs hover:underline">Restore</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
