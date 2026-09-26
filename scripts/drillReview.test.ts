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
// singular-only nouns have no plural at all in the word list
const milk = INITIAL_VOCABULARY.find((w) => !!w.nounDetails?.gender && !w.nounDetails?.plural);

console.log('1. Which nouns each drill can review');
check('every noun has an article to review', lesson1Nouns.every((w) => isDrillable('article', w)));
check('verbs are never reviewed', !INITIAL_VOCABULARY.filter((w) => !w.nounDetails).some((w) => isDrillable('article', w)));
check(`singular-only nouns skip Plural (${milk?.display})`, !!milk && !isDrillable('plural', milk));

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
// the two calls are a moment apart, so allow a second of slack; on a fresh card
// both land on the same 1-day floor and only the stability tells them apart
check('right answer comes back no sooner than a wrong one',
  new Date(right.nextReviewDate).getTime() >= new Date(wrong.nextReviewDate).getTime() - 1000);
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

console.log('6. Flashcard Practice → "ready" in both drills → drill Practice → its own Review');
const { markLessonReadyForDrills, markLessonsDoneForDrill, readyLessons, lessonKey } = engine;
let st = { article: {}, plural: {}, accusative: {}, weak: {} } as ReturnType<typeof engine.loadDrillPracticeState>;
st = markLessonReadyForDrills(st, 'A1', 1, lesson1);
check('Flashcard Practice of Lesson 1 → ready in Der/Die/Das', st.article[lessonKey('A1', 1)] === 'ready');
check('...and ready in Plural', st.plural[lessonKey('A1', 1)] === 'ready');
check('...and ready in Accusative', st.accusative[lessonKey('A1', 1)] === 'ready');
check('one notice per lesson (not per word)', readyLessons(st, 'article').length === 1);
const verbsOnly = INITIAL_VOCABULARY.filter((w) => !w.nounDetails);
check('a lesson with no nouns is never "ready"', markLessonReadyForDrills({ article: {}, plural: {}, accusative: {}, weak: {} }, 'A1', 99, verbsOnly).article['A1-99'] === undefined);
const half = lesson1Nouns.slice(0, 2);
check('practising only part of a lesson does not finish it', markLessonsDoneForDrill(st, 'article', half, INITIAL_VOCABULARY).article['A1-1'] === 'ready');
st = markLessonsDoneForDrill(st, 'article', lesson1Nouns, INITIAL_VOCABULARY);
check('finishing Der/Die/Das Practice → done there', st.article['A1-1'] === 'done');
check('...but Plural is still waiting', st.plural['A1-1'] === 'ready');
check('Der/Die/Das notice gone, Plural notice stays', readyLessons(st, 'article').length === 0 && readyLessons(st, 'plural').length === 1);
check('doing Flashcard Practice again does not bring a done notice back', markLessonReadyForDrills(st, 'A1', 1, lesson1).article['A1-1'] === 'done');
const onlyArticle = unlockDrillsAfterPractice(lesson1, {}, ['article']);
check('drill Practice fills only its own Review', lesson1Nouns.every((w) => onlyArticle[drillCardId('article', w.id)]) && !lesson1Nouns.some((w) => onlyArticle[drillCardId('plural', w.id)]));
st = markLessonReadyForDrills(st, 'A1', 3, INITIAL_VOCABULARY.filter((w) => w.lektion === 3));
st = markLessonReadyForDrills(st, 'A1', 2, INITIAL_VOCABULARY.filter((w) => w.lektion === 2));
check('waiting lessons listed in course order', readyLessons(st, 'plural').map((l) => l.lektion).join(',') === '1,2,3');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
