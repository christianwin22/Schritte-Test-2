/**
 * The streak counts real days.
 *
 * Run with:  npx tsx scripts/streak.test.ts
 */
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { currentStreak, dayKey, lastSevenDays, recordActivity, activeDays, clearActivity } =
  await import('../src/utils/streak');

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
};
const seed = (...days: string[]) => store.set('deutschmeister_activity_v1', JSON.stringify(days));

console.log('1. Nothing done yet');
clearActivity();
check('no streak', currentStreak() === 0);
check('no day marked', activeDays().size === 0);

console.log('2. One exercise today');
recordActivity();
check('streak of 1', currentStreak() === 1);
recordActivity();
recordActivity();
check('answering again the same day does not add a day', activeDays().size === 1);
check('...and the streak stays 1', currentStreak() === 1);

console.log('3. Days in a row');
seed(daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0));
check('four days → 4', currentStreak() === 4);

console.log('4. Today not done yet');
seed(daysAgo(2), daysAgo(1));
check('yesterday still counts → 2', currentStreak() === 2);

console.log('5. A day missed');
seed(daysAgo(5), daysAgo(4), daysAgo(3));
check('nothing for three days → 0', currentStreak() === 0);
seed(daysAgo(4), daysAgo(3), daysAgo(0));
check('a gap resets to the run that reaches today → 1', currentStreak() === 1);

console.log('6. The week strip');
seed(daysAgo(0), daysAgo(2), daysAgo(6));
const week = lastSevenDays();
check('seven days, oldest first', week.length === 7 && week[6].date.getDate() === new Date().getDate());
check('three of them lit', week.filter((d) => d.active).length === 3);
check('today is the last one', week[6].active);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
