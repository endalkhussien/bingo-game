import { DEFAULT_OPERATOR_ORG_KEY } from '../../src/shared/voucher/default-org-key';
import { getSetting, updateSettings } from './settings-service';

const ORG_KEY_SETTING = 'offline_voucher_org_key';

/** Old installs auto-generated random 64-char hex keys that break cross-PC recharge. */
const LEGACY_RANDOM_ORG_KEY = /^[a-f0-9]{64}$/;

function normalizeOrgKey(value: string | null | undefined): string | null {
  if (!value || value.length < 32) return null;
  if (LEGACY_RANDOM_ORG_KEY.test(value) && value !== DEFAULT_OPERATOR_ORG_KEY) {
    return DEFAULT_OPERATOR_ORG_KEY;
  }
  return value;
}

async function persistOrgKeyIfNeeded(existing: string | null, normalized: string): Promise<string> {
  if (existing !== normalized) {
    await updateSettings({ [ORG_KEY_SETTING]: normalized });
  }
  return normalized;
}

/** Read saved key only — never auto-generates (used when redeeming codes). */
export async function getConfiguredOrganizationKey(): Promise<string | null> {
  const existing = await getSetting(ORG_KEY_SETTING);
  const normalized = normalizeOrgKey(existing);
  if (!normalized) return null;
  return persistOrgKeyIfNeeded(existing, normalized);
}

/** Admin code generation — uses saved key or the shared default operator key. */
export async function getOrganizationVoucherSecret(): Promise<string> {
  const existing = await getSetting(ORG_KEY_SETTING);
  const normalized = normalizeOrgKey(existing) ?? DEFAULT_OPERATOR_ORG_KEY;
  return persistOrgKeyIfNeeded(existing, normalized);
}

export async function setOrganizationVoucherSecret(secret: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = secret.trim();
  if (trimmed.length < 32) {
    return { success: false, error: 'Organization key must be at least 32 characters' };
  }
  await updateSettings({ [ORG_KEY_SETTING]: trimmed });
  return { success: true };
}

export async function getOrganizationKeyForDisplay(): Promise<string> {
  return getOrganizationVoucherSecret();
}

export async function hasOrganizationKey(): Promise<boolean> {
  return (await getConfiguredOrganizationKey()) !== null;
}
