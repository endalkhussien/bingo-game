/** Default system settings shown in admin forms before/without DB values. */
export const DEFAULT_SYSTEM_SETTINGS: Record<string, string> = {
  default_commission: '20',
  platform_fee: '0',
  minimum_bet: '10',
  maximum_bet: '1000',
  currency: 'ETB',
  timezone: 'Africa/Addis_Ababa',
  number_range_max: '75',
};

export function withDefaultSettings(fetched: Record<string, string>): Record<string, string> {
  return { ...DEFAULT_SYSTEM_SETTINGS, ...fetched };
}
