import { ipc } from '@/presentation/lib/ipc';

export interface CreateAgentResult {
  username: string;
  password: string;
  setupCode: string;
  agentId?: string;
  warning?: string;
}

/** Create agent and always try to obtain a TAS setup code (with regenerate fallback). */
export async function createAgentWithSetup(data: {
  fullName: string;
  username: string;
  password: string;
  phone?: string;
  adminCommissionRate: number;
  initialBalance: number;
}): Promise<{ ok: true; result: CreateAgentResult } | { ok: false; error: string }> {
  const username = data.username.trim().toLowerCase();
  if (!/^[a-z0-9_]{2,32}$/.test(username)) {
    return { ok: false, error: 'Username: 2–32 chars, lowercase letters, numbers, underscore only (e.g. abebe)' };
  }
  if (!data.password || data.password.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters' };
  }

  const response = await ipc<{
    success: boolean;
    warning?: string;
    data?: { id?: string; setupCode?: string | null; username?: string };
    error?: string;
  }>('agents:create', {
    ...data,
    username,
    adminCommissionRate: Number.isFinite(data.adminCommissionRate) ? data.adminCommissionRate : 20,
    initialBalance: Number.isFinite(data.initialBalance) ? data.initialBalance : 0,
  });

  if (!response.success) {
    return { ok: false, error: response.error ?? 'Failed to create agent' };
  }

  let setupCode = response.data?.setupCode ?? null;
  const agentId = response.data?.id;
  let warning = response.warning;

  if (!setupCode && agentId) {
    const regen = await ipc<{
      success: boolean;
      data?: { setupCode?: string; username?: string };
      error?: string;
    }>('agents:regenerate-setup', agentId, data.password);
    if (regen.success && regen.data?.setupCode) {
      setupCode = regen.data.setupCode;
    } else if (!warning) {
      warning = regen.error ?? 'Could not generate TAS code. Open agent detail and try again.';
    }
  }

  if (!setupCode) {
    return {
      ok: false,
      error: warning ?? 'Agent may have been created but TAS code is missing. Open Agents → Deposit → Generate TAS.',
    };
  }

  return {
    ok: true,
    result: {
      username: response.data?.username ?? username,
      password: data.password,
      setupCode,
      agentId,
      warning,
    },
  };
}
