/**
 * Der/Die/Das and Plural review test.
 *
 * Run with:  npx tsx scripts/drillReview.test.ts
 */
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { INITIAL_VOCABULARY } = await import('../src/data/vocabulary');
const engine = await import('../src/utils/srsEngine');
const { drillCardId, drillReviewPool, isDrillable, reviewCard, unlockDrillsAfterPractice } = engine;

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}

const lesson1 = INITIAL_VOCABULARY.filter((w) => w.lektion === 1);
const lesson1Nouns = lesson1.filter((w) => w.nounDetails?.gender);
const milk = INITIAL_VOCABULARY.find((w) => /\(Sg\.?\)/.test(w.nounDetails?.plural ?? ''));

console.log('1. Which nouns each drill can review');
check('every noun has an article to review', lesson1Nouns.every((w) => isDrillable('article', w)));
check('verbs are never reviewed', !INITIAL_VOCABULARY.filter((w) => !w.nounDetails).some((w) => isDrillable('article', w)));
check(`singular-only nouns skip Plural (${milk?.nounDetails?.plural})`, !!milk && !isDrillable('plural', milk));

console.log('2. Finishing a lesson\'s Flashcard Practice unlocks its nouns');
let records = unlockDrillsAfterPractice(lesson1, {});
const firstNoun = lesson1Nouns[0];
const card = records[drillCardId('article', firstNoun.id)];
check('article cards created for the lesson\'s nouns', lesson1Nouns.every((w) => records[drillCardId('article', w.id)]?.isUnlocked));
check('plural cards created too', lesson1Nouns.filter((w) => isDrillable('plural', w)).every((w) => records[drillCardId('plural', w.id)]?.isUnlocked));
check('flashcard cards untouched (separate schedule)', !lesson1.some((w) => records[w.id]));
const hoursUntilDue = (new Date(card.nextReviewDate).getTime() - Date.now()) / 3.6e6;
check(`first due tomorrow (${hoursUntilDue.toFixed(1)} h from now)`, hoursUntilDue > 23 && hoursUntilDue <= 24.01);

console.log('3. Review pool');
let pool = drillReviewPool('article', INITIAL_VOCABULARY, records);
check('nothing due today', pool.due.length === 0);
check('but the unlocked nouns are there to review anyway', pool.unlocked.length === lesson1Nouns.length);
const other = INITIAL_VOCABULARY.find((w) => w.lektion === 2 && w.nounDetails?.gender)!;
check('lessons not practised yet stay out', !pool.unlocked.some((w) => w.id === other.id));
// tomorrow arrives
for (const k of Object.keys(records)) records[k] = { ...records[k], nextReviewDate: new Date(Date.now() - 1000).toISOString() };
pool = drillReviewPool('article', INITIAL_VOCABULARY, records);
check('tomorrow, they are due', pool.due.length === lesson1Nouns.length);

console.log('4. Answering reschedules, like Flashcard');
const id = drillCardId('article', firstNoun.id);
const right = reviewCard(id, true, records[id]);
const wrong = reviewCard(id, false, records[id]);
check('right answer: not due again today', new Date(right.nextReviewDate).getTime() > Date.now());
check('right answer comes back later than a wrong one', new Date(right.nextReviewDate) >= new Date(wrong.nextReviewDate));
check('wrong answer makes it harder', wrong.difficulty > records[id].difficulty);
check('practising a lesson twice does not reset its schedule', unlockDrillsAfterPractice(lesson1, { ...records, [id]: right })[id].nextReviewDate === right.nextReviewDate);

console.log('5. A real day later, the gap grows with each right answer');
const yesterday = new Date(Date.now() - 864e5).toISOString();
let c: (typeof records)[string] = { ...records[id], lastReviewedAt: yesterday };
const days = (r: { nextReviewDate: string }) => (new Date(r.nextReviewDate).getTime() - Date.now()) / 864e5;
const gaps: number[] = [];
for (let n = 0; n < 4; n++) {
  c = reviewCard(id, true, c);
  gaps.push(Math.round(days(c)));
  c = { ...c, lastReviewedAt: new Date(Date.now() - days(c) * 864e5).toISOString() }; // that many days pass
}
const missed = reviewCard(id, false, { ...records[id], lastReviewedAt: yesterday });
check(`right, right, right, right → back in ${gaps.join(', ')} days`, gaps.every((g, i) => i === 0 || g > gaps[i - 1]));
check(`a wrong answer comes back soonest (${Math.round(days(missed))} day)`, days(missed) <= gaps[0]);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
