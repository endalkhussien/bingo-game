'use client';

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
  const copyCode = async () => {
    await navigator.clipboard.writeText(setupCode);
    onCopy?.();
  };

  const copyAll = async () => {
    const lines = [
      `Username: ${username}`,
      password ? `Password: ${password}` : '',
      '',
      'Activate PC code (paste on hall PC login screen):',
      setupCode,
    ].filter(Boolean);
    await navigator.clipboard.writeText(lines.join('\n'));
    onCopy?.();
  };

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
        <button type="button" onClick={copyCode}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
          Copy TAS code
        </button>
        <button type="button" onClick={copyAll}
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-50">
          Copy all credentials
        </button>
      </div>
    </div>
  );
}
