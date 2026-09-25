/**
 * Who has signed in on this device before.
 *
 * A name, an email, and which button they used — and, for the accounts that
 * are still signed in, the session itself, so switching between them needs no
 * trip to Google. That is what lets Switch account work the way it does in
 * other apps.
 *
 * The trade is plain: a kept session is a way back into that account from this
 * device without signing in again. So Log out does not keep one. Switching
 * keeps both; logging out of an account forgets its session for good.
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
  /**
   * The tokens that can put this account back without signing in again.
   * Present only while the account is switched away from, never after Log out.
   */
  session?: { access_token: string; refresh_token: string };
}

/** Accounts that can be returned to with one tap. */
export function switchableAccounts(exceptEmail?: string | null): KnownAccount[] {
  return knownAccounts().filter(
    (a) => a.session?.refresh_token && a.email.toLowerCase() !== (exceptEmail ?? '').toLowerCase()
  );
}

/** Puts a session away so the account can be returned to. */
export function keepSession(email: string, session: { access_token: string; refresh_token: string }): void {
  const list = knownAccounts();
  const found = list.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!found) return;
  found.session = session;
  write(list);
}

/** Drops the stored session; the account stays listed but needs a real sign-in. */
export function dropSession(email: string): void {
  const list = knownAccounts();
  const found = list.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!found) return;
  delete found.session;
  write(list);
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

export function rememberAccount(account: Omit<KnownAccount, 'lastSeen' | 'session'>): void {
  if (!account.email) return;
  const all = knownAccounts();
  const previous = all.find((a) => a.email.toLowerCase() === account.email.toLowerCase());
  const rest = all.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
  write([{ ...account, session: previous?.session, lastSeen: new Date().toISOString() }, ...rest]);
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
