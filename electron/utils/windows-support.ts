import os from 'os';

export interface WindowsSupportResult {
  supported: boolean;
  reason?: string;
}

/**
 * Waliya ships on Electron 22 (Chromium 108) — the last Electron line that supports
 * Windows 8 and 8.1. Supported shop PCs: Windows 8, 8.1, 10, and 11 (64-bit).
 */
export function checkWindowsSupport(): WindowsSupportResult {
  if (process.platform !== 'win32') {
    return { supported: true };
  }

  if (process.arch !== 'x64') {
    return {
      supported: false,
      reason: 'Waliya requires 64-bit Windows (8, 8.1, 10, or 11). This PC is 32-bit.',
    };
  }

  const release = os.release();
  const [majorStr, minorStr] = release.split('.');
  const major = Number(majorStr);
  const minor = Number(minorStr);

  // Windows 7 = 6.1, Vista = 6.0. Windows 8 = 6.2, 8.1 = 6.3, 10/11 = 10.0.
  if (Number.isFinite(major) && Number.isFinite(minor)) {
    if (major < 6 || (major === 6 && minor < 2)) {
      return {
        supported: false,
        reason: 'Waliya requires Windows 8 or newer (64-bit). Windows 7 and older are not supported.',
      };
    }
  }

  return { supported: true };
}
