export function formatStartupError(err: unknown): string {
  if (err instanceof Error) {
    const parts = [err.message];
    if (err.stack) parts.push('', err.stack);
    return parts.join('\n');
  }
  return String(err);
}

export function sqliteStartupHint(message: string): string {
  if (!/better_sqlite3|bindings|\.node|dll|VCRuntime|application was unable to start/i.test(message)) {
    return '';
  }
  return [
    '',
    'SQLite engine could not load. Try:',
    '  1. Uninstall Waliya, delete %APPDATA%\\Waliya, reinstall from a fresh build',
    '  2. Install Microsoft Visual C++ 2015-2022 Redistributable (x64)',
    '  3. Rebuild on your PC: npm run clean:build && npm run pack:win',
  ].join('\n');
}
