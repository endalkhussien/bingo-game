'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { formatDate } from '@/presentation/lib/utils';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { ipc('audit:list').then(setLogs); }, []);
  return (
    <div>
      <PageHeader title="Audit Logs" />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left">
            <th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Entity ID</th><th className="px-4 py-3">Date</th>
          </tr></thead>
          <tbody>
            {logs.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No audit logs yet</td></tr>
            : logs.map((l, i) => (
              <tr key={i} className="border-t"><td className="px-4 py-3">{String(l.action)}</td>
                <td className="px-4 py-3">{String(l.entityType)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{String(l.entityId ?? '-')}</td>
                <td className="px-4 py-3">{formatDate(Number(l.createdAt))}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
