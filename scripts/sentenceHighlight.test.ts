/**
 * Finding the word inside its own sentence.
 *
 * Run with:  npx tsx scripts/sentenceHighlight.test.ts
 */
const { INITIAL_VOCABULARY } = await import('../src/data/vocabulary');
const { highlightWord, stemLabel } = await import('../src/utils/sentenceParts');
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
const marked = (w: WordEntry, s: string) =>
  highlightWord(s, w).map((p) => (p.hit ? `[${p.text}]` : p.text)).join('');

console.log('1. The plain cases');
check('"Der [Tisch] ist aus Holz."', marked(find('der Tisch'), 'Der Tisch ist aus Holz.') === 'Der [Tisch] ist aus Holz.');
check('the article is not the word', !marked(find('der Tisch'), 'Der Tisch ist aus Holz.').startsWith('[Der]'));

console.log('2. Endings, plurals and umlauts');
check('Wort → Wörter', marked(find('das Wort'), 'Raten Sie Wörter.').includes('[Wörter]'));
check('Buch → Bücher', marked(find('das Buch'), 'Da sind die Bücher.').includes('[Bücher]'));
check('lernen → lernt', marked(find('lernen'), 'Tim lernt auch Deutsch.').includes('[lernt]'));
check('besonder- → besonderer', marked(find('besonder-'), 'Heute ist ein besonderer Tag.').includes('[besonderer]'));

console.log('3. Separable verbs, in both halves');
const anrufen = marked(find('anrufen'), 'Lara ruft ihre Familie an.');
check(`both halves of anrufen (${anrufen})`, anrufen.includes('[ruft]') && anrufen.includes('[an]'));
check('hinfallen written whole', marked(find('hin·fallen'), 'Man kann leicht hinfallen.').includes('[hinfallen]'));

console.log('4. Inside a compound');
check('Lehrer in Deutschlehrer', marked(find('der Lehrer'), 'Tim ist Laras Deutschlehrer.').includes('[Deutschlehrer]'));
check('Lieblings- in Lieblingsessen', marked(find('Lieblings-'), 'Mein Lieblingsessen ist gut.').includes('[Lieblingsessen]'));

console.log('4b. The book\'s own forms');
check('heiraten → geheiratet', marked(find('heiraten'), 'Wann hast du geheiratet?').includes('[geheiratet]'));
check('einschlafen → eingeschlafen', marked(find('einschlafen'), 'Ich bin sofort eingeschlafen.').includes('[eingeschlafen]'));
check('aufhalten → aufzuhalten', marked(find('aufhalten'), 'Er war nicht aufzuhalten.').includes('[aufzuhalten]'));
check('Einkauf leads Einkaufsstraße', marked(find('der Einkauf'), 'Das ist die Einkaufsstraße.').includes('[Einkaufsstraße]'));
check('Rest does not light up Restaurant', !marked(find('der Rest'), 'Wir gehen ins Restaurant.').includes('['));

console.log('5. A stem says so above its sentence');
check('besonder- is labelled', stemLabel(find('besonder-')) === 'besonder-');
check('an ordinary word is not', stemLabel(find('der Tisch')) === null);

console.log('6. Across the whole list');
let found = 0;
let total = 0;
for (const w of INITIAL_VOCABULARY) {
  if (!w.sentence) continue;
  total++;
  if (highlightWord(w.sentence, w).some((p) => p.hit)) found++;
}
const share = Math.round((found / total) * 100);
// The book's own sentences use irregular forms too (gezogen, wirft, gilt): those stay unbolded.
check(`the word is found in ${share}% of sentences (${found}/${total})`, share >= 97);
check('a sentence with no match is still returned whole',
  highlightWord('Völlig anderer Satz.', find('der Tisch')).map((p) => p.text).join('') === 'Völlig anderer Satz.');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
