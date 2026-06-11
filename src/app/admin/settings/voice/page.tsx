'use client';

import { useEffect, useState } from 'react';
import { ipc } from '@/presentation/lib/ipc';
import { PageHeader } from '@/presentation/components/shared/page-header';
import { VOICE_TYPES } from '@/shared/constants';

export default function VoiceSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  useEffect(() => { ipc<Record<string, string>>('settings:get').then(setSettings); }, []);

  const save = async () => {
    await ipc('settings:update', { default_voice: settings.default_voice, default_language: settings.default_language });
    alert('Voice settings saved');
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="Voice Settings" />
      <div className="rounded-xl bg-white p-6 shadow-sm border space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Default Voice</label>
          <select value={settings.default_voice ?? 'AMHARIC_MALE'} onChange={(e) => setSettings({ ...settings, default_voice: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm">
            {VOICE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Default Language</label>
          <select value={settings.default_language ?? 'en'} onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
            className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="en">English</option><option value="am">Amharic</option>
          </select>
        </div>
        <button onClick={save} className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white">Save</button>
      </div>
    </div>
  );
}
