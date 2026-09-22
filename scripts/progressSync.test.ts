/**
 * Sign-in / sign-out progress test.
 *
 * Run with:  npx tsx scripts/progressSync.test.ts
 *
 * Runs every restore scenario against an in-memory browser and database, and
 * checks that no path loses progress.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// --- an in-memory localStorage ------------------------------------------------
class MemoryStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
const storage = new MemoryStorage();
(globalThis as any).localStorage = storage;

// --- an in-memory user_progress table ----------------------------------------
const table = new Map<string, Record<string, string>>();
let failWrites = false;
let signedOut = false;

const fakeClient = {
  from: () => ({
    select: () => ({
      eq: (_col: string, userId: string) => ({
        maybeSingle: async () => ({ data: table.has(userId) ? { data: table.get(userId) } : null, error: null }),
      }),
    }),
    upsert: async (row: { user_id: string; data: Record<string, string> }) => {
      if (failWrites) return { error: { message: 'offline' } };
      table.set(row.user_id, { ...row.data });
      return { error: null };
    },
  }),
  auth: { signOut: async () => { signedOut = true; return { error: null }; } },
} as unknown as SupabaseClient;

const sync = await import('../src/lib/progressSync');
sync.setSyncClientForTests(fakeClient);

// --- helpers ------------------------------------------------------------------
let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}
function reset() {
  storage.clear();
  table.clear();
  failWrites = false;
  signedOut = false;
}
const STREAK = 'deutschmeister_streak_v2';
const REVIEW = 'deutschmeister_fsrs_records_v1';
const SESSION = 'sb-abc-auth-token'; // Supabase's own key — must never be touched

// --- scenarios ----------------------------------------------------------------
console.log('1. First sign-in on a browser with progress from before login');
reset();
storage.setItem(STREAK, '12');
storage.setItem(REVIEW, '{"w1":1}');
await sync.restoreForUser('chris');
check('existing progress is kept in the browser', storage.getItem(STREAK) === '12');
check('and uploaded to the account', table.get('chris')?.[STREAK] === '12');
check('browser now marked as Chris\'s', storage.getItem('cpa_sync_owner') === 'chris');

console.log('2. Signing in on a new device downloads saved progress');
reset();
table.set('chris', { [STREAK]: '30', [REVIEW]: '{"w9":4}' });
await sync.restoreForUser('chris');
check('saved streak arrives', storage.getItem(STREAK) === '30');
check('saved review schedule arrives', storage.getItem(REVIEW) === '{"w9":4}');

console.log('3. The other person signs in on the same browser');
reset();
storage.setItem('cpa_sync_owner', 'chris');
storage.setItem(STREAK, '30');
await sync.restoreForUser('partner');
check("Chris's progress is not shown to them", storage.getItem(STREAK) === null);
check("and not uploaded into their account", table.get('partner')?.[STREAK] === undefined);

console.log('4. Studied offline, then signed in again: newer local work wins');
reset();
table.set('chris', { [STREAK]: '5' });
storage.setItem('cpa_sync_owner', 'chris');
storage.setItem('cpa_sync_dirty', '1');
storage.setItem(STREAK, '6');
await sync.restoreForUser('chris');
check('local 6 kept, not overwritten by saved 5', storage.getItem(STREAK) === '6');
check('and uploaded', table.get('chris')?.[STREAK] === '6');

console.log('5. Sign out while offline');
reset();
storage.setItem('cpa_sync_owner', 'chris');
storage.setItem(STREAK, '8');
failWrites = true;
const okOffline = await sync.signOutAndClear('chris');
check('sign-out is refused', okOffline === false);
check('progress is still in the browser', storage.getItem(STREAK) === '8');
check('still signed in', signedOut === false);

console.log('6. Sign out while online');
failWrites = false;
const okOnline = await sync.signOutAndClear('chris');
check('sign-out succeeds', okOnline === true);
check('progress saved first', table.get('chris')?.[STREAK] === '8');
check('then cleared from the browser', storage.getItem(STREAK) === null);

console.log('7. Reset progress leaves the sign-in session alone');
reset();
storage.setItem(SESSION, 'token');
storage.setItem(STREAK, '3');
storage.setItem('some_other_site_key', 'x');
sync.clearAppData();
check('app progress cleared', storage.getItem(STREAK) === null);
check('Supabase session untouched', storage.getItem(SESSION) === 'token');
check('unrelated keys untouched', storage.getItem('some_other_site_key') === 'x');
check('session never synced', !(SESSION in sync.takeSnapshot()));

console.log('8. Sandbox keeps real progress safe');
reset();
storage.setItem(STREAK, '12'); // progress from before login, not yet in any account
sync.enterSandbox();
check('sandbox starts empty', storage.getItem(STREAK) === null);
storage.setItem(STREAK, '999'); // testing
sync.exitSandbox();
check('real progress back exactly', storage.getItem(STREAK) === '12');
sync.enterSandbox();
check('sandbox remembers its own test data', storage.getItem(STREAK) === '999');
sync.exitSandbox();
await sync.restoreForUser('chris');
check('logging in afterwards adopts the real progress, not the test data', table.get('chris')?.[STREAK] === '12');
check('sandbox data never uploaded', !JSON.stringify([...table.values()]).includes('999'));

console.log('9. Remembered accounts for "Continue as …"');
reset();
sync.rememberAccount({ email: 'chris@example.com', name: 'Chris', provider: 'google' });
sync.rememberAccount({ email: 'may@example.com', name: null, provider: 'email' });
sync.rememberAccount({ email: 'CHRIS@example.com', name: 'Chris', provider: 'google' });
const known = sync.getKnownAccounts();
check('most recent first, no duplicates', known.length === 2 && known[0].email === 'CHRIS@example.com');
sync.forgetAccount('may@example.com');
check('forget removes it', sync.getKnownAccounts().length === 1);
sync.clearAppData();
check('survives clearing app progress (e.g. log out)', sync.getKnownAccounts().length === 1);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
