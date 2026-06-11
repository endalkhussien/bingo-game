'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { ipc<Record<string, string>>('settings:get').then(setSettings); }, []);

  const save = async () => {
    await ipc('settings:update', settings);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="General Settings" />
      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        {['currency', 'timezone', 'minimum_bet', 'maximum_bet', 'number_range_max'].map((key) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</label>
            <input value={settings[key] ?? ''} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
        ))}
        <button onClick={save} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white">{saved ? 'Saved!' : 'Save'}</button>
      </div>
    </div>
  );
}
