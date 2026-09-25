/**
 * Checks the imported word list.
 *
 * Run with:  npx tsx scripts/importedData.test.ts
 * (Re-run after `python3 scripts/importVocabulary.py`.)
 */
import { INITIAL_VOCABULARY } from '../src/data/vocabulary';
import { BLANK, acceptedPlurals, articleSentence, barePlural, fillBlank, pluralSentence } from '../src/data/nounDrillSentences';
import { isDrillable } from '../src/utils/srsEngine';

let failures = 0;
const check = (label: string, ok: boolean) => {
  if (!ok) { failures++; console.log(`  FAIL  ${label}`); }
};
const words = INITIAL_VOCABULARY;
const nouns = words.filter((w) => w.nounDetails?.gender);

console.log(`1. the list itself — ${words.length} words`);
check('every word has an id, a display form and a meaning', words.every((w) => w.id && w.display && w.translation));
check('ids are unique', new Set(words.map((w) => w.id)).size === words.length);
check('levels are A1/A2/B1 only', words.every((w) => ['A1', 'A2', 'B1'].includes(w.level)));
check('lessons are 0 (Intro) to 14', words.every((w) => typeof w.lektion === 'number' && w.lektion >= 0 && w.lektion <= 14));
check('all six books are present', new Set(words.map((w) => w.volume)).size === 6);
console.log(`   Intro ${words.filter((w) => w.lektion === 0).length} · nouns ${nouns.length} · two-sense ${words.filter((w) => (w.senses?.length ?? 0) > 1).length} · stems ${words.filter((w) => w.isStem).length}`);

console.log('2. answers (EN → DE)');
check('every word has at least one accepted answer', words.every((w) => (w.answers?.length ?? 0) > 0));
const joghurt = words.find((w) => w.display?.includes('Joghurt'));
check('a two-article noun accepts both: der Joghurt / das Joghurt',
  !!joghurt && ['der Joghurt', 'das Joghurt'].every((a) => joghurt.answers!.includes(a)));
const kilo = words.find((w) => w.display?.startsWith('das Kilo('));
check('brackets are optional: das Kilo and das Kilogramm both count',
  !!kilo && kilo.answers!.includes('das Kilo') && kilo.answers!.includes('das Kilogramm'));
const hinfallen = words.find((w) => w.display === 'hin·fallen');
check('the separable dot never reaches the answer', !!hinfallen && hinfallen.answers!.includes('hinfallen') && !hinfallen.answers!.some((a) => a.includes('·')));

console.log('3. meanings (DE → EN)');
const frau = words.find((w) => w.display === 'die Frau');
check('numbered senses split into two boxes', !!frau && frau.senses!.length === 2 && frau.senses![0][0] === 'woman');
const bild = words.find((w) => w.display === 'das Bild');
check('commas stay inside one sense', !!bild && bild.senses!.length === 1 && bild.senses![0].join('|') === 'picture|image');
check('no sense is empty', words.every((w) => (w.senses ?? []).every((s) => s.length > 0)));

console.log('4. drill sentences');
const article = nouns.filter((w) => isDrillable('article', w));
const plural = nouns.filter((w) => isDrillable('plural', w));
check('article sentences contain exactly one blank', article.every((w) => articleSentence(w).split(BLANK).length === 2));
check('plural sentences contain exactly one blank', plural.every((w) => pluralSentence(w).split(BLANK).length === 2));
const withReal = article.filter((w) => w.articleSentenceBlank);
console.log(`   real sentences: ${withReal.length} of ${article.length} article, ${plural.filter((w) => w.pluralSentenceBlank).length} of ${plural.length} plural`);
const tisch = words.find((w) => w.display === 'der Tisch')!;
const filled = fillBlank(articleSentence(tisch), 'der');
check(`filling the blank reads correctly (${filled})`, /\b[Dd]er Tisch\b/.test(filled) && !filled.includes(BLANK));
// A sentence-initial article is capitalised; one in the middle is not.
check('no article is capitalised mid-sentence', article.every((w) => {
  const gender = w.nounDetails!.gender!;
  const text = fillBlank(articleSentence(w), gender);
  const capitalised = text.charAt(0).toUpperCase() + text.slice(1);
  return text === capitalised;
}));
// The article being asked for must not be visible elsewhere in the sentence.
const givesItAway = article.filter((w) => {
  const gender = w.nounDetails!.gender!.toLowerCase();
  const shown = articleSentence(w).replace(BLANK, '').toLowerCase();
  return new RegExp(`(?<!\\w)${gender}(?!\\w)`).test(shown);
});
check(`no sentence shows the article it asks for (${givesItAway.length})`, givesItAway.length === 0);
check('bare plural drops the article', barePlural(tisch) === 'Tische');
const ski = words.find((w) => w.display?.includes('Ski /') || w.nounDetails?.pluralAlternatives?.length === 2);
check('both plural spellings are accepted', !ski || acceptedPlurals(ski).length >= 2);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
