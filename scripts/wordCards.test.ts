/**
 * Words cards: plural English, the book's Sg./Pl. marks, and what Practice still waits for.
 *
 * Run with:  npx tsx scripts/wordCards.test.ts
 */
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { INITIAL_VOCABULARY } = await import('../src/data/vocabulary');
const cards = await import('../src/utils/wordCards');
const { firstPracticeDone } = await import('../src/utils/practiceProgress');
const { cardsFor, checkCardEnglish, asListedEnglish, cardMeaningLines, numberTag, germanShown, asksPlural } = cards;
const { checkEnglishPair } = await import('../src/utils/answerCheck');

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}
const word = (id: string) => {
  const w = INITIAL_VOCABULARY.find((x) => x.id === id);
  if (!w) throw new Error(`no word ${id}`);
  return w;
};
const card = (id: string, plural = false) => cardsFor([word(id)]).find((c) => c.plural === plural)!;

console.log('1. A plural card takes the English plural or the singular');
check('die Kellner: "waiters" is right', checkCardEnglish('waiters', card('a12_l8_kellner', true)));
check('die Kellner: "waiter" is right too', checkCardEnglish('waiter', card('a12_l8_kellner', true)));
check('die Hotels: "hotel" and "hotels"', checkCardEnglish('hotel', card('a12_l9_hotel', true)) && checkCardEnglish('hotels', card('a12_l9_hotel', true)));
check('die Kellner: "cook" is wrong', !checkCardEnglish('cook', card('a12_l8_kellner', true)));
check('der Kellner: "waiter" is right', checkCardEnglish('waiter', card('a12_l8_kellner')));
check('die Hausmeister: either meaning, plural', checkCardEnglish('janitors', card('a12_l8_hausmeister', true)));
check('die Chefinnen: "bosses"', checkCardEnglish('bosses', card('a12_l8_chefin', true)));
check('die Polizisten: "police officers"', checkCardEnglish('police officers', card('a12_l8_polizist', true)));
check('die Studien: "studies" (already plural)', checkCardEnglish('studies', card('a12_l8_studium', true)));
check('die Informationen: "information"', checkCardEnglish('information', card('a12_l8_information', true)));
check('shown in the plural: "caretakers, janitors"', cardMeaningLines(card('a12_l8_hausmeister', true))[0] === 'caretakers, janitors');
check('note kept: "bosses (f.)"', cardMeaningLines(card('a12_l8_chefin', true))[0] === 'bosses (f.)');
const bereiche = card('a12_l8_bereich', true);
check(
  'two boxes: "areas" + "fields" right',
  checkEnglishPair([asListedEnglish('areas', bereiche), asListedEnglish('fields', bereiche)], bereiche.word).every(Boolean)
);
check(
  'two boxes: "area" + "field" right on the plural card too',
  checkEnglishPair([asListedEnglish('area', bereiche), asListedEnglish('field', bereiche)], bereiche.word).every(Boolean)
);

console.log('2. The book\'s marks and spellings');
check('die Wirtschaft is Sg.', numberTag(card('a12_l8_wirtschaft')) === 'Sg.');
check('die Kenntnisse is Pl.', numberTag(card('a12_l8_kenntnisse')) === 'Pl.');
check('die Kenntnisse asks P', asksPlural(card('a12_l8_kenntnisse')));
check('der Chef has no mark', numberTag(card('a12_l8_chef')) === null);
check('die Kenntnisse has one card', cardsFor([word('a12_l8_kenntnisse')]).length === 1);
check('shown "die Uni(versität)"', germanShown(card('a12_l8_universitaet')) === 'die Uni(versität)');
check('shown "(an)bieten"', germanShown(card('a12_l8_anbieten')) === '(an)bieten');
check('shown "die Kenntnisse"', germanShown(card('a12_l8_kenntnisse')) === 'die Kenntnisse');
check('Lesson 8 starts with die Geschichte (book order)', INITIAL_VOCABULARY.find((w) => w.lektion === 8 && w.volume === 'A1.2')?.id === 'a12_l8_geschichte');

console.log('3. What Practice still waits for');
const l8 = cardsFor(INITIAL_VOCABULARY.filter((w) => w.level === 'A1' && w.lektion === 8));
const keys = l8.map((c) => c.key);
// halfway through redo round 2: two cards still to redo, one in the redo pile
const done = firstPracticeDone(INITIAL_VOCABULARY, '', {}, {
  level: 'A1',
  lektion: 8,
  dir: 'DE_TO_EN',
  keys: [keys[0], keys[1], keys[2]],
  index: 1,
  redo: [keys[3]],
});
check('cards still in the redo round wait', !done.de[keys[1]] && !done.de[keys[2]] && !done.de[keys[3]]);
check('a card already redone counts', !!done.de[keys[0]]);
check('cards answered right earlier count', !!done.de[keys[10]]);
check('words added later wait', !done.de['a12_l8_arzt'] && !done.de['a12_l8_kenntnisse']);
check('EN → DE untouched', Object.keys(done.en).length === 0);
const finished = firstPracticeDone(INITIAL_VOCABULARY, '', { A1_L7: { practiceCompleted: true } }, null);
const l7 = cardsFor(INITIAL_VOCABULARY.filter((w) => w.level === 'A1' && w.lektion === 7));
check('a finished lesson is done both ways', l7.every((c) => finished.de[c.key] && finished.en[c.key]));

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
if (failures) process.exit(1);
