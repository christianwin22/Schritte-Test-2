/**
 * The bits of "you" the app keeps: what to call you, and whether you have
 * been asked yet.
 *
 * Kept in the synced progress family, so it follows the account between
 * devices like everything else. The email is not stored here — it belongs to
 * the sign-in and is read from there, so the two can never disagree.
 */

const KEY = 'deutschmeister_profile_v1';

/** What most apps ask for, and nothing more: a name, and two optional facts. */
export type Gender = '' | 'female' | 'male';

export interface Profile {
  name: string;
  gender: Gender;
  /** ISO date, "1990-04-23". Optional. */
  birthday: string;
  /**
   * A small square photo as a data URL. Shrunk to 256px before it is kept —
   * a full-size one would eat the browser's whole allowance.
   */
  photo?: string;
  /** Set once the welcome page has been answered. */
  setUp: boolean;
}

export const EMPTY_PROFILE: Profile = { name: '', gender: '', birthday: '', setUp: false };

/** Shrinks a chosen picture to a square that is safe to store and sync. */
export function shrinkPhoto(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('not an image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        // cover: fill the square from the middle of the picture
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

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
