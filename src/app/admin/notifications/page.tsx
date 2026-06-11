'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

interface Notif { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: number; }

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const load = () => ipc<Notif[]>('notifications:list').then(setNotifs);
  useEffect(() => { load(); }, []);

  const markAll = async () => { await ipc('notifications:mark-all-read'); load(); };

  return (
    <div>
      <PageHeader title="Notifications" action={
        <button onClick={markAll} className="text-sm text-blue-600 hover:underline">Mark all read</button>
      } />
      <div className="space-y-3">
        {notifs.length === 0 ? <p className="text-gray-500">No notifications</p>
        : notifs.map((n) => (
          <div key={n.id} className={`rounded-xl p-4 border ${n.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex justify-between">
              <h3 className="font-medium">{n.title}</h3>
              <span className="text-xs text-gray-400">{n.type}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
