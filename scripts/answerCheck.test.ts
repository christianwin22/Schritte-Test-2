/**
 * What the app accepts as an answer.
 *
 * Run with:  npx tsx scripts/answerCheck.test.ts
 */
const { INITIAL_VOCABULARY } = await import('../src/data/vocabulary');
const { checkGerman, checkEnglish, checkEnglishPair, meaningLines } = await import('../src/utils/answerCheck');
import type { WordEntry } from '../src/types';

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
}
const find = (display: string): WordEntry => {
  const w = INITIAL_VOCABULARY.find((x) => x.display === display);
  if (!w) throw new Error(`no word ${display}`);
  return w;
};

console.log('1. German: the article is part of the answer');
const frau = find('die Frau');
check('"die Frau" is right', checkGerman('die Frau', frau).isCorrect);
check('"DIE FRAU" too — capitals are free', checkGerman('DIE FRAU', frau).isCorrect);
check('"Frau" alone is wrong', !checkGerman('Frau', frau).isCorrect);
check('...and says the article is missing', checkGerman('Frau', frau).miss === 'article');
check('"das Frau" is wrong', !checkGerman('das Frau', frau).isCorrect);

console.log('2. German: brackets are optional, umlauts are not');
const kilo = find('das Kilo(gramm) (kg)');
check('"das Kilo" is right', checkGerman('das Kilo', kilo).isCorrect);
check('"das Kilogramm" is right too', checkGerman('das Kilogramm', kilo).isCorrect);
check('"das Kilo kg" is wrong', !checkGerman('das Kilo kg', kilo).isCorrect);
const spat = INITIAL_VOCABULARY.find((w) => /ä|ö|ü/.test(w.lemma) && !w.isStem)!;
const noUmlaut = spat.lemma.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
const article = spat.nounDetails?.gender ? `${spat.nounDetails.gender} ` : '';
check(`"${article}${noUmlaut}" is wrong (${spat.display})`, !checkGerman(article + noUmlaut, spat).isCorrect);
check('...and says it is the umlaut', checkGerman(article + noUmlaut, spat).miss === 'umlaut');

console.log('3. German: a stem takes any ending');
const besonder = find('besonder-');
for (const form of ['besonder', 'besondere', 'besonderen', 'besonderes']) {
  check(`"${form}" is right`, checkGerman(form, besonder).isCorrect);
}
check('"besonders" too', checkGerman('besonders', besonder).isCorrect);
check('"wichtig" is wrong', !checkGerman('wichtig', besonder).isCorrect);

console.log('4. German: separable verbs are written as one word');
const hin = find('hin·fallen');
check('"hinfallen" is right', checkGerman('hinfallen', hin).isCorrect);
check('"hin fallen" is wrong', !checkGerman('hin fallen', hin).isCorrect);

console.log('5. English: loose, but not a free pass');
const vater = INITIAL_VOCABULARY.find((w) => w.translation.toLowerCase() === 'father')!;
check('"father" is right', checkEnglish('father', vater));
check('"the father" is right — a leading the is free', checkEnglish('the father', vater));
check('"the" is WRONG (the old bug)', !checkEnglish('the', vater));
check('"fat" is wrong', !checkEnglish('fat', vater));
const hoeren = find('hören');
check('"to hear" is right', checkEnglish('to hear', hoeren));
check('"hear" is right without the to', checkEnglish('hear', hoeren));
const mrs = find('die Frau');
check('"Mrs" is right — the bracket note is ignored', checkEnglish('Mrs', mrs));

console.log('6. Two meanings: two boxes, either order');
check('both right', checkEnglishPair(['to hear', 'to listen'], hoeren).every(Boolean));
check('both right the other way round', checkEnglishPair(['listen', 'hear'], hoeren).every(Boolean));
check('the same meaning twice is not both', !checkEnglishPair(['hear', 'to hear'], hoeren).every(Boolean));
check('one right one wrong marks only the right one', JSON.stringify(checkEnglishPair(['hear', 'to see'], hoeren)) === '[true,false]');
check('an empty box is not right', !checkEnglishPair(['hear', ''], hoeren).every(Boolean));

console.log('7. Meanings are shown without the raw <br>');
check('two lines for a two-meaning word', meaningLines(hoeren).length === 2);
check('no <br> anywhere', !INITIAL_VOCABULARY.some((w) => meaningLines(w).join(' ').includes('<br>')));

console.log('8. Every real answer in the list passes its own check');
let germanBad = 0;
let englishBad = 0;
for (const w of INITIAL_VOCABULARY) {
  if (!checkGerman(w.answers?.[0] ?? w.lemma, w).isCorrect) germanBad++;
  const first = (w.senses?.[0]?.[0] ?? w.translation);
  if (!checkEnglish(first, w)) englishBad++;
}
check(`all 2,823 German answers accepted (${germanBad} refused)`, germanBad === 0);
check(`all 2,823 English answers accepted (${englishBad} refused)`, englishBad === 0);

console.log('9. Junk never passes');
const junk = ['the', 'a', 'to', 'x', 'asdf', '???', '1', 'der'];
// A word whose meaning really is one of these (der = "the") is not a false accept.
const genuine = (w: WordEntry, j: string) =>
  (w.answers ?? []).some((a) => a.toLowerCase() === j) ||
  (w.senses ?? []).flat().some((s) => s.toLowerCase().replace(/\([^)]*\)/g, '').trim() === j);
let falseAccepts = 0;
for (const w of INITIAL_VOCABULARY) {
  for (const j of junk) {
    if (checkGerman(j, w).isCorrect && !genuine(w, j)) falseAccepts++;
    if (checkEnglish(j, w) && !genuine(w, j)) falseAccepts++;
  }
}
check(`0 false accepts across ${INITIAL_VOCABULARY.length * junk.length * 2} tries (${falseAccepts})`, falseAccepts === 0);

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
