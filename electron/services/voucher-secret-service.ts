import { generateOrganizationKey } from '../../src/shared/voucher/offline-voucher';
import { DEFAULT_OPERATOR_ORG_KEY } from '../../src/shared/voucher/default-org-key';
import { getSetting, updateSettings } from './settings-service';

const ORG_KEY_SETTING = 'offline_voucher_org_key';

/** Read saved key only — never auto-generates (used when redeeming codes). */
export async function getConfiguredOrganizationKey(): Promise<string | null> {
  const existing = await getSetting(ORG_KEY_SETTING);
  if (existing && existing.length >= 32) return existing;
  return null;
}

/** Admin code generation — uses saved key, default operator key, or creates one. */
export async function getOrganizationVoucherSecret(): Promise<string> {
  const existing = await getSetting(ORG_KEY_SETTING);
  if (existing && existing.length >= 32) return existing;

  await updateSettings({ [ORG_KEY_SETTING]: DEFAULT_OPERATOR_ORG_KEY });
  return DEFAULT_OPERATOR_ORG_KEY;
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
