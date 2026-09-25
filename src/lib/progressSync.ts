import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Keeps each user's learning progress in their own Supabase row.
 *
 * The app itself still reads and writes localStorage exactly as before. This
 * module copies every progress key (the `deutschmeister_` and `schritte_`
 * families) into one JSON row per user, and restores that row on sign-in
 * before the app renders — so no screen had to change to become account-aware.
 */

const APP_KEY_PREFIXES = ['deutschmeister_', 'schritte_'];

// Bookkeeping keys: deliberately outside the prefixes above, so they are never synced.
const OWNER_KEY = 'cpa_sync_owner'; // which user the progress in this browser belongs to
const DEVICE_KEY = 'cpa_device_id'; // this browser's own name, never synced
/**
 * Which device is currently the one in charge. Inside the synced data, so
 * every device sees it. Choosing "Keep this one" writes this device's id, and
 * any other device signs itself out the next time it looks — otherwise the
 * two keep taking turns telling each other about the conflict.
 */
const ACTIVE_DEVICE_KEY = 'deutschmeister_active_device_v1';

export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Marks this device as the one in charge, and saves that with the progress. */
export async function claimAccount(userId: string): Promise<boolean> {
  localStorage.setItem(ACTIVE_DEVICE_KEY, deviceId());
  return pushSnapshot(userId, takeSnapshot());
}

/** True when another device has claimed the account since. */
export async function wasTakenOver(userId: string): Promise<boolean> {
  if (!client) return false;
  try {
    const { snapshot } = await pullRemote(userId);
    const active = snapshot?.[ACTIVE_DEVICE_KEY];
    return !!active && active !== deviceId();
  } catch {
    return false;
  }
}
const DIRTY_KEY = 'cpa_sync_dirty'; // local changes that have not reached Supabase yet

const TABLE = 'user_progress';

let client: SupabaseClient | null = supabase;

/** Test seam: lets scripts/progressSync.test.ts run against a fake database. */
export function setSyncClientForTests(fake: SupabaseClient | null): void {
  client = fake;
}

export type ProgressSnapshot = Record<string, string>;

function isAppKey(key: string): boolean {
  return APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function appKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isAppKey(key)) keys.push(key);
  }
  return keys;
}

/** Every progress key currently in this browser. */
export function takeSnapshot(): ProgressSnapshot {
  const snapshot: ProgressSnapshot = {};
  for (const key of appKeys()) {
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

/**
 * Removes the app's progress from this browser, and nothing else.
 *
 * Use this instead of localStorage.clear(), which would also delete the
 * sign-in session and log the user out.
 */
export function clearAppData(): void {
  for (const key of appKeys()) localStorage.removeItem(key);
}

function applySnapshot(snapshot: ProgressSnapshot): void {
  clearAppData();
  for (const [key, value] of Object.entries(snapshot)) {
    if (isAppKey(key)) localStorage.setItem(key, value);
  }
}

/**
 * The stamp on the saved row the last time this device wrote or read it.
 * If the row carries a different stamp later, another device has been at it.
 */
let lastSeenUpdatedAt: string | null = null;

interface RemoteRow {
  snapshot: ProgressSnapshot | null;
  updatedAt: string | null;
}

async function pullRemote(userId: string): Promise<RemoteRow> {
  if (!client) return { snapshot: null, updatedAt: null };
  const { data, error } = await client
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return {
    snapshot: (data?.data as ProgressSnapshot | undefined) ?? null,
    updatedAt: (data?.updated_at as string | undefined) ?? null,
  };
}

/**
 * Has another device saved since this one last did?
 *
 * Unknown (network down, no client) counts as "no", so a flaky connection
 * never raises a false alarm.
 */
export async function otherDeviceHasSaved(userId: string): Promise<boolean> {
  if (!client || lastSeenUpdatedAt === null) return false;
  try {
    const { updatedAt } = await pullRemote(userId);
    return updatedAt !== null && updatedAt !== lastSeenUpdatedAt;
  } catch {
    return false;
  }
}

/** Takes the saved progress as it now stands, throwing away this device's copy. */
export async function adoptRemote(userId: string): Promise<boolean> {
  try {
    const { snapshot, updatedAt } = await pullRemote(userId);
    if (!snapshot) return false;
    applySnapshot(snapshot);
    localStorage.removeItem(DIRTY_KEY);
    lastSeenUpdatedAt = updatedAt;
    return true;
  } catch {
    return false;
  }
}

/** Uploads a snapshot. Resolves true once Supabase has it. */
export async function pushSnapshot(userId: string, snapshot: ProgressSnapshot): Promise<boolean> {
  if (!client) return false;
  localStorage.setItem(DIRTY_KEY, '1');
  const updatedAt = new Date().toISOString();
  const { error } = await client.from(TABLE).upsert({ user_id: userId, data: snapshot, updated_at: updatedAt });
  if (error) {
    console.warn('Progress sync failed; will retry', error.message);
    return false;
  }
  localStorage.removeItem(DIRTY_KEY);
  lastSeenUpdatedAt = updatedAt;
  return true;
}

/**
 * Runs once after sign-in, before the app renders.
 *
 * - Saved progress in Supabase wins, unless this browser holds newer changes
 *   of the same user that never finished uploading (e.g. studied offline).
 * - No saved progress yet: whatever is in this browser is adopted and
 *   uploaded — this is how progress from before login is kept — unless it
 *   belongs to a different user, in which case this user starts clean.
 */
export async function restoreForUser(userId: string): Promise<void> {
  const owner = localStorage.getItem(OWNER_KEY);
  const hasUnsentChanges = localStorage.getItem(DIRTY_KEY) === '1';
  const belongsToSomeoneElse = owner !== null && owner !== userId;

  if (belongsToSomeoneElse) {
    clearAppData();
    localStorage.removeItem(DIRTY_KEY);
  }

  const { snapshot: remote, updatedAt } = await pullRemote(userId);
  lastSeenUpdatedAt = updatedAt;

  if (remote && !(owner === userId && hasUnsentChanges)) {
    applySnapshot(remote);
    localStorage.removeItem(DIRTY_KEY);
  } else {
    await pushSnapshot(userId, takeSnapshot());
  }

  localStorage.setItem(OWNER_KEY, userId);
}

/** What the app is told when a second device turns out to have been used. */
export interface OtherDeviceEvent {
  /** True when this device has work of its own that has not been saved yet. */
  hasLocalChanges: boolean;
}

/**
 * Uploads changes as they happen: checks every few seconds, and once more
 * when the tab is hidden or closed. Returns a function that stops it.
 *
 * Before every upload it checks whether another device has saved since this
 * one last did. If so it uploads nothing — overwriting the other device's work
 * is the one thing this must never do — and reports it instead.
 */
export function startAutoSync(
  userId: string,
  intervalMs = 4000,
  onOtherDevice?: (event: OtherDeviceEvent) => void
): () => void {
  let lastSent = JSON.stringify(takeSnapshot());
  let inFlight = false;
  let halted = false;

  const halt = (hasLocalChanges: boolean) => {
    halted = true;
    onOtherDevice?.({ hasLocalChanges });
  };

  const syncIfChanged = async () => {
    if (inFlight || halted) return;
    const snapshot = takeSnapshot();
    const serialized = JSON.stringify(snapshot);
    const changedHere = serialized !== lastSent || localStorage.getItem(DIRTY_KEY) === '1';
    if (!changedHere) return;
    inFlight = true;
    try {
      if (await otherDeviceHasSaved(userId)) {
        halt(true);
        return;
      }
      if (await pushSnapshot(userId, snapshot)) lastSent = serialized;
    } finally {
      inFlight = false;
    }
  };

  /** Coming back to the app: catch up before anything is typed into stale data. */
  const onShow = async () => {
    if (halted || inFlight) return;
    if (!(await otherDeviceHasSaved(userId))) return;
    const changedHere = JSON.stringify(takeSnapshot()) !== lastSent;
    halt(changedHere);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void syncIfChanged();
    else void onShow();
  };

  const timer = window.setInterval(syncIfChanged, intervalMs);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', syncIfChanged);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', syncIfChanged);
  };
}

/**
 * Final upload, then wipes this browser's copy so the next person starts from their own.
 *
 * Resolves false — and changes nothing — if the final upload fails, so an
 * offline sign-out can never throw away progress that only exists here.
 */
export async function signOutAndClear(userId: string): Promise<boolean> {
  const saved = await pushSnapshot(userId, takeSnapshot());
  if (!saved) return false;
  clearAppData();
  localStorage.removeItem(OWNER_KEY);
  localStorage.removeItem(DIRTY_KEY);
  // Local only: this device forgets you. A global sign-out would also revoke
  // the tokens on your other phone or laptop, which is not what Log out here
  // should mean — and it would kill a session kept for switching accounts.
  await client?.auth.signOut({ scope: 'local' });
  return true;
}

// ---------------------------------------------------------------------------
// Sandbox: a private test area on this device
// ---------------------------------------------------------------------------
//
// The app always reads the same localStorage keys, so the sandbox works by
// swapping what sits in them. Entering puts the browser's current progress
// aside and loads the sandbox's own; leaving does the reverse. Sandbox
// progress never touches an account and is never uploaded, and whatever was
// in the browser before — including progress from before login existed —
// comes back exactly as it was.

const SANDBOX_DATA_KEY = 'cpa_sandbox_data'; // the sandbox's own progress while you're out of it
const PRE_SANDBOX_KEY = 'cpa_pre_sandbox_data'; // this browser's progress while you're in it

function readStash(key: string): ProgressSnapshot {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as ProgressSnapshot;
  } catch {
    return {};
  }
}

export function enterSandbox(): void {
  // Your real progress must survive the sandbox, so if it cannot be stashed,
  // the sandbox does not open. Better to refuse than to lose it.
  localStorage.setItem(PRE_SANDBOX_KEY, JSON.stringify(takeSnapshot()));
  applySnapshot(readStash(SANDBOX_DATA_KEY));
}

export function exitSandbox(): void {
  // Order matters when the browser is nearly full, which on a phone it can be.
  // Read the sandbox's data into memory, give its space back, put your own
  // progress in, and only then try to keep the sandbox copy. Saving that copy
  // is a convenience; getting out is not, and a failed write here used to trap
  // you inside with no way out.
  const sandboxData = takeSnapshot();
  const yours = readStash(PRE_SANDBOX_KEY);
  localStorage.removeItem(PRE_SANDBOX_KEY); // give its room back before writing
  applySnapshot(yours);
  try {
    localStorage.setItem(SANDBOX_DATA_KEY, JSON.stringify(sandboxData));
  } catch {
    localStorage.removeItem(SANDBOX_DATA_KEY);
  }
}
