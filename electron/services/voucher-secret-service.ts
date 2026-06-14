import { generateOrganizationKey } from '../../src/shared/voucher/offline-voucher';
import { getSetting, updateSettings } from './settings-service';

const ORG_KEY_SETTING = 'offline_voucher_org_key';

export async function getOrganizationVoucherSecret(): Promise<string> {
  const existing = await getSetting(ORG_KEY_SETTING);
  if (existing && existing.length >= 32) return existing;

  const secret = generateOrganizationKey();
  await updateSettings({ [ORG_KEY_SETTING]: secret });
  return secret;
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
