/** Country and currency for common time zones; anything else falls back to India (launch market). */
const BY_TIMEZONE: Record<string, { country: string; currency: string }> = {
  'Asia/Kolkata': { country: 'IN', currency: 'INR' },
  'Asia/Calcutta': { country: 'IN', currency: 'INR' },
  'Asia/Dubai': { country: 'AE', currency: 'AED' },
  'Asia/Singapore': { country: 'SG', currency: 'SGD' },
  'Europe/London': { country: 'GB', currency: 'GBP' },
  'America/New_York': { country: 'US', currency: 'USD' },
  'America/Chicago': { country: 'US', currency: 'USD' },
  'America/Los_Angeles': { country: 'US', currency: 'USD' },
  'Australia/Sydney': { country: 'AU', currency: 'AUD' },
};

const FALLBACK = { timezone: 'Asia/Kolkata', country: 'IN', currency: 'INR' };

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Workspace locale defaults from the browser time zone (developer decision, M1-09). */
export function workspaceDefaults(timezone: string | undefined) {
  if (!timezone || !isValidTimeZone(timezone)) return FALLBACK;
  return {
    timezone,
    ...(BY_TIMEZONE[timezone] ?? { country: FALLBACK.country, currency: FALLBACK.currency }),
  };
}

/** URL-safe slug from a business name plus a random suffix (slugs are unique). */
export function workspaceSlug(name: string, suffix: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '');
  return `${base || 'workspace'}-${suffix}`;
}
