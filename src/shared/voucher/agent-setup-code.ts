import crypto from 'crypto';
import { DEFAULT_OPERATOR_ORG_KEY } from './default-org-key';

/** App-wide signing key for agent setup codes (portable across PCs). */
const SETUP_SIGNING_KEY = 'tebib-bingo-v1-agent-setup-signing-secret-key';

export interface AgentSetupPayload {
  username: string;
  password: string;
  fullName: string;
  adminCommissionRate: number;
  orgKey: string;
}

export interface GeneratedAgentSetupCode {
  code: string;
  username: string;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SETUP_SIGNING_KEY).update(data).digest('hex').slice(0, 32);
}

function encodePayload(payload: AgentSetupPayload): string {
  return Buffer.from(JSON.stringify({
    u: payload.username.trim().toLowerCase(),
    p: payload.password,
    n: payload.fullName,
    c: payload.adminCommissionRate,
    k: payload.orgKey,
  }), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): AgentSetupPayload | null {
  try {
    const raw = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      u?: string; p?: string; n?: string; c?: number; k?: string;
    };
    if (!raw.u || !raw.p || !raw.n) return null;
    if (!/^[a-z0-9_]{2,32}$/.test(raw.u)) return null;
    return {
      username: raw.u,
      password: raw.p,
      fullName: raw.n,
      adminCommissionRate: typeof raw.c === 'number' ? raw.c : 20,
      orgKey: raw.k && raw.k.length >= 32 ? raw.k : DEFAULT_OPERATOR_ORG_KEY,
    };
  } catch {
    return null;
  }
}

/** Admin generates this after creating an agent — agent pastes on hall PC to activate login. */
export function generateAgentSetupCode(payload: AgentSetupPayload): GeneratedAgentSetupCode {
  const username = payload.username.trim().toLowerCase();
  const body = encodePayload({
    ...payload,
    username,
    orgKey: payload.orgKey?.length >= 32 ? payload.orgKey : DEFAULT_OPERATOR_ORG_KEY,
  });
  const sig = sign(body);
  return {
    code: `TAS-${body}-${sig}`,
    username,
  };
}

export function parseAgentSetupCode(code: string): { valid: boolean; error?: string; payload?: AgentSetupPayload } {
  const normalized = code.trim();
  if (!normalized.startsWith('TAS-')) {
    return { valid: false, error: 'Invalid setup code. Ask admin for a new TAS- code.' };
  }

  const rest = normalized.slice(4);
  if (rest.length < 34) return { valid: false, error: 'Invalid setup code format' };

  const sig = rest.slice(-32);
  if (!/^[a-f0-9]{32}$/.test(sig) || rest[rest.length - 33] !== '-') {
    return { valid: false, error: 'Invalid setup code format' };
  }
  const body = rest.slice(0, -33);
  if (!body) return { valid: false, error: 'Invalid setup code format' };

  if (sign(body) !== sig) {
    return { valid: false, error: 'Setup code signature invalid. Request a new code from admin.' };
  }

  const payload = decodePayload(body);
  if (!payload) return { valid: false, error: 'Setup code could not be read' };

  return { valid: true, payload };
}
