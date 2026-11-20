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
const { cardsFor, typedNumber, pluralOnSingular, germanOf, exampleOf, pluralOf, checkCardEnglish, asListedEnglish, cardMeaningLines, numberTag, germanShown, asksPlural } = cards;
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
check('shown in the plural: "caretakers, janitors (male)"', cardMeaningLines(card('a12_l8_hausmeister', true))[0] === 'caretakers, janitors (male)');
check('note kept: "bosses (female)"', cardMeaningLines(card('a12_l8_chefin', true))[0] === 'bosses (female)');
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
check('Lesson 8 starts with its title, then die Geschichte (book order)', INITIAL_VOCABULARY.find((w) => w.lektion === 8 && w.volume === 'A1.2')?.id === 'a12_l8_title');
check('...die Geschichte next', INITIAL_VOCABULARY.find((w) => w.lektion === 8 && w.volume === 'A1.2' && w.wordType !== 'Title')?.id === 'a12_l8_geschichte');

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


console.log('\nLesson 12 ideas (2026-11-05)');
check('die (Bank-)Überweisung shows one "die"', germanShown(card('a12_l12_uberweisung')) === 'die (Bank-)Überweisung');
check('die (Kaffee-)Maschine shows one "die"', germanShown(card('a12_l12_maschine')) === 'die (Kaffee-)Maschine');
check('no card ever shows an article twice or glued on', !cardsFor(INITIAL_VOCABULARY).some((c) => /^(der|die|das) (der|die|das)\S/.test(germanShown(c)) || /\b(der|die|das)(?=[A-ZÄÖÜ])/.test(germanShown(c))));
check('zumachen: "to close" and "to shut"', checkCardEnglish('to close', card('a12_l12_zumachen')) && checkCardEnglish('to shut', card('a12_l12_zumachen')));
check('anmachen: "to turn on" and "to switch on"', checkCardEnglish('to turn on', card('a12_l12_anmachen')) && checkCardEnglish('to switch on', card('a12_l12_anmachen')));
check('Zeugnis: "transcript" and "report"', checkCardEnglish('transcript', card('a12_l12_zeugnis')) && checkCardEnglish('report', card('a12_l12_zeugnis')));
check('die Hilfen: "helps" is right', checkCardEnglish('helps', card('a12_l12_hilfe', true)));
check('die Reinigungen: "dry cleaners"', checkCardEnglish('dry cleaners', card('a12_l12_reinigung', true)));
check('Übersetzung: book sentence on the plural card', card('a12_l12_ubersetzung', true).word.pluralSentence?.includes('Übersetzungen in vielen Sprachen') === true);

console.log('\nPlural sound, every lesson (2026-11-08)');
{
  const all = cardsFor(INITIAL_VOCABULARY);
  const plurals = all.filter((c) => c.plural);
  const badWord = plurals.filter((c) => germanOf(c) !== pluralOf(c.word));
  const badSentence = plurals.filter((c) => {
    const ex = exampleOf(c);
    const singular = c.word.exampleSentences?.[0]?.german;
    if (!ex || !singular || ex.german !== singular.replace(/\{\{blank\}\}/g, c.word.lemma)) return false;
    // Same sentence is fine when it is already plural: "3 Euro", "Die Möbel sind ..."
    const pl = (pluralOf(c.word) ?? '').replace(/^die /, '');
    return !ex.german.includes(pl);
  });
  check(`all ${plurals.length} plural cards say the plural word`, badWord.length === 0);
  if (badWord.length) console.log('    ', badWord.slice(0, 10).map((c) => c.key).join(', '));
  check('no plural card plays the singular sentence', badSentence.length === 0);
  if (badSentence.length) console.log('    ', badSentence.slice(0, 10).map((c) => c.key).join(', '));
  check('die Röcke: says "die Röcke"', germanOf(plurals.find((c) => c.word.lemma === 'Rock')!) === 'die Röcke');
}

console.log('\nIdeas of 2026-11-12');
{
  const ausgaenge = card('a12_l13_ausgang', true);
  check('die Ausgänge: "exits" says plural', typedNumber('exits', ausgaenge) === 'P');
  check('die Ausgänge: "exit" says singular', typedNumber('exit', ausgaenge) === 'S');
  check('der Ausgang: "exit" says singular', typedNumber('exit', card('a12_l13_ausgang')) === 'S');
  const jacke = card('a12_l13_jacke');
  check('die Jacke: "jackets" is a plural on a singular card', pluralOnSingular('jackets', jacke));
  check('die Jacke: "jacketes" too', pluralOnSingular('jacketes', jacke));
  check('die Jacke: "jacket" is fine', !pluralOnSingular('jacket', jacke));
  check('die Jacken: plural card is never caught', !pluralOnSingular('jackets', card('a12_l13_jacke', true)));
  check('die Information: "information" is fine', !pluralOnSingular('information', card('a12_l8_information')));
  check('"information" can\'t tell', typedNumber('information', card('a12_l8_information', true)) === null);
  check('Steward: its own sentence, about him', word('a12_l13_steward').exampleSentences?.[0]?.german === 'Der Steward erklärt die Notausgänge.');
  check('Stewardess: the book sentence', word('a12_l13_stewardess').exampleSentences?.[0]?.german === 'Ich bin Stewardess von Beruf.');
  const drogerie = card('a12_l13_drogerie');
  check('Drogerie: "drugstore" and "pharmacy"', checkCardEnglish('drugstore', drogerie) && checkCardEnglish('pharmacy', drogerie));
  check('Drogerie: sentence says drugstore', /drugstore/.test(word('a12_l13_drogerie').exampleSentences?.[0]?.english ?? ''));
  check('Uhr: "watch" right in box 1', checkEnglishPair(['watch', "o'clock"], word('a12_l13_uhr')).every(Boolean));
  // No male word keeps the book's sentence about the woman
  const female = INITIAL_VOCABULARY.filter((w) => /\(female\)/.test(w.translation ?? ''));
  const bad = INITIAL_VOCABULARY.filter((w) => {
    if (!/\(male\)/.test(w.translation ?? '')) return false;
    const sentence = w.exampleSentences?.[0]?.german ?? '';
    if (new RegExp(`\\b${w.lemma}\\b`).test(sentence)) return false; // names him too (Präsidentin/Präsident)
    return female.some((f) => f.lemma.startsWith(w.lemma.slice(0, 3)) && f.lemma !== w.lemma && new RegExp(`\\b${f.lemma}\\b`).test(sentence));
  });
  check('no male word uses a sentence about the woman', bad.length === 0);
  if (bad.length) console.log('    ', bad.map((w) => w.id).join(', '));
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
if (failures) process.exit(1);
