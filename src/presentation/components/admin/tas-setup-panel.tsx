'use client';

import { CopyButton } from '@/presentation/components/shared/copy-button';
import { copyToClipboard } from '@/presentation/lib/copy-to-clipboard';

interface TasSetupPanelProps {
  username: string;
  password?: string;
  setupCode: string;
  title?: string;
  onCopy?: () => void;
}

export function TasSetupPanel({
  username,
  password,
  setupCode,
  title = 'TAS setup code — send to agent hall PC',
  onCopy,
}: TasSetupPanelProps) {
  return (
    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 text-sm text-emerald-950 shadow-sm">
      <p className="text-lg font-bold text-emerald-900">{title}</p>
      <p className="mt-1 text-xs text-emerald-800">
        Required for each hall PC. Agent: Login → <strong>Activate PC</strong> → paste code → Sign in.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p>Username: <strong className="font-mono">{username}</strong></p>
        {password && <p>Password: <strong className="font-mono">{password}</strong></p>}
      </div>
      <p className="mt-4 font-semibold">TAS setup code:</p>
      <p className="mt-1 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs leading-relaxed">
        {setupCode}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={setupCode} label="Copy TAS code" variant="primary" onCopied={onCopy} />
        <button
          type="button"
          onClick={async () => {
            const lines = [
              `Username: ${username}`,
              password ? `Password: ${password}` : '',
              '',
              'Activate PC code (paste on hall PC login screen):',
              setupCode,
            ].filter(Boolean).join('\n');
            const ok = await copyToClipboard(lines);
            if (ok) onCopy?.();
          }}
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-50"
        >
          Copy all credentials
        </button>
      </div>
    </div>
  );
}
