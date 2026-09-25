/**
 * The bits of "you" the app keeps: what to call you, and whether you have
 * been asked yet.
 *
 * Kept in the synced progress family, so it follows the account between
 * devices like everything else. The email is not stored here — it belongs to
 * the sign-in and is read from there, so the two can never disagree.
 */

const KEY = 'deutschmeister_profile_v1';

export interface Profile {
  name: string;
  /** Optional, shown under the name. */
  about: string;
  /** Set once the welcome page has been filled in or skipped. */
  setUp: boolean;
}

export const EMPTY_PROFILE: Profile = { name: '', about: '', setUp: false };

export function loadProfile(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') return { ...EMPTY_PROFILE, ...raw };
  } catch {
    // nothing saved yet
  }
  return EMPTY_PROFILE;
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // out of space; the name just won't stick
  }
}

/** What to call someone: their own answer first, then the email's front half. */
export function nameFor(profile: Profile, email: string | null): string {
  if (profile.name.trim()) return profile.name.trim();
  return (email ?? '').split('@')[0] || 'Learner';
}

/** Two letters for the round avatar. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
