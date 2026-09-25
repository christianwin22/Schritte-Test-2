/**
 * Who has signed in on this device before.
 *
 * Only enough to offer them back on the Log in page — a name, an email, and
 * which button they used. No token, nothing that signs anyone in on its own:
 * tapping a remembered account still goes through Google or a fresh email link.
 *
 * Kept under a "cpa_" key so that signing out, which clears the progress keys,
 * leaves this list alone. That is the whole point of it.
 */

const KEY = 'cpa_known_accounts_v1';
const LIMIT = 4;

export interface KnownAccount {
  email: string;
  name: string;
  /** Which button signed them in last time, so we can offer the same one. */
  via: 'google' | 'email';
  /** Their Google picture, when there is one. */
  picture?: string;
  lastSeen: string;
}

export function knownAccounts(): KnownAccount[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((a): a is KnownAccount => !!a && typeof a.email === 'string')
      .sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));
  } catch {
    return [];
  }
}

function write(list: KnownAccount[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
  } catch {
    // out of space: the list is a convenience, nothing depends on it
  }
}

export function rememberAccount(account: Omit<KnownAccount, 'lastSeen'>): void {
  if (!account.email) return;
  const rest = knownAccounts().filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
  write([{ ...account, lastSeen: new Date().toISOString() }, ...rest]);
}

export function forgetAccount(email: string): void {
  write(knownAccounts().filter((a) => a.email.toLowerCase() !== email.toLowerCase()));
}

/** A name from whatever the provider gave us, falling back to the address. */
export function displayName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  const named = [meta.full_name, meta.name, meta.user_name].find((v) => typeof v === 'string' && v.trim());
  if (typeof named === 'string') return named;
  const email = user.email ?? '';
  return email.split('@')[0] || email;
}
