/**
 * Der/Die/Das and Plural sentence check.
 *
 * Run with:  npx tsx scripts/nounSentences.test.ts
 */
import { INITIAL_VOCABULARY } from '../src/data/vocabulary';
import { BLANK, NOUN_DRILL_SENTENCES, articleSentence, barePlural, fillBlank, pluralSentence } from '../src/data/nounDrillSentences';

let failures = 0;
const fail = (msg: string) => { failures++; console.log('  FAIL ', msg); };
const nouns = INITIAL_VOCABULARY.filter((w) => w.nounDetails?.gender);

for (const w of nouns) {
  const entry = NOUN_DRILL_SENTENCES[w.id];
  if (!entry) fail(`${w.lemma}: no sentences written (would use the generic fallback)`);
  const a = articleSentence(w);
  if (a.split(BLANK).length !== 2) fail(`${w.lemma}: article sentence needs exactly one blank`);
  if (!new RegExp(`${BLANK.replace(/[{}]/g, '\\$&')} ${w.lemma}\\b`).test(a)) fail(`${w.lemma}: the blank must sit right before "${w.lemma}"`);
  const singularOnly = /\(Sg\.?\)/.test(w.nounDetails!.plural);
  if (singularOnly && entry?.plural) fail(`${w.lemma}: singular-only noun should have no plural sentence`);
  if (!singularOnly) {
    const p = pluralSentence(w);
    if (p.split(BLANK).length !== 2) fail(`${w.lemma}: plural sentence needs exactly one blank`);
    if (p.includes(w.lemma + ' ') && barePlural(w) !== w.lemma) fail(`${w.lemma}: plural sentence gives away the singular`);
  }
}
const unknown = Object.keys(NOUN_DRILL_SENTENCES).filter((id) => !nouns.some((w) => w.id === id));
if (unknown.length) fail(`sentences for words that don't exist: ${unknown.join(', ')}`);

const tisch = nouns.find((w) => w.lemma === 'Tisch')!;
if (fillBlank(articleSentence(tisch), 'der') !== 'Der Tisch ist aus Holz.') fail('sentence-initial article should be capitalised');
if (fillBlank(pluralSentence(tisch), barePlural(tisch)) !== 'Im Klassenzimmer stehen zehn Tische.') fail('plural fill');

console.log(`${nouns.length} nouns checked`);
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
