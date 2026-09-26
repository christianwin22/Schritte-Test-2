import { WordEntry } from '../types';

/**
 * Grammar · Sentence, in all three tenses, from one sentence per verb
 * (sentenceFrames.txt) and the verb's own forms in the word list:
 *
 *   frame      a11_intro_ansehen | 1 | Ich | das Foto | I {look} at the photo.
 *   Present    Ich [sehe] das Foto [an].        I look at the photo.
 *   Past       Ich [sah] das Foto [an].         I looked at the photo.
 *   Perfect    Ich [habe] das Foto [angesehen]. I looked at the photo.
 *
 * The first word of the form goes after the subject, a reflexive pronoun
 * (mich, sich …) is shown after it, and the rest (a separable prefix, a
 * participle) goes last. Both gaps are typed as one answer: "sehe an".
 */

export type SentenceTense = 'present' | 'past' | 'perfect';

export interface SentenceItem {
  id: string; // verbId:tense
  verbId: string;
  verb: string; // as the word list shows it: ansehen, (sich) waschen
  lemma: string; // for reading out
  level: string;
  lektion: number;
  tense: SentenceTense;
  subject: string;
  finite: string;
  reflexive: string;
  middle: string;
  end: string;
  english: string;
}

const REFLEXIVE = new Set(['mich', 'dich', 'sich', 'uns', 'euch', 'mir', 'dir']);

// English verbs that don't just add -ed: past (and past participle)
const IRREGULAR: Record<string, [string, string]> = {
  arise: ['arose', 'arisen'], beat: ['beat', 'beaten'], begin: ['began', 'begun'], bleed: ['bled', 'bled'],
  break: ['broke', 'broken'], bring: ['brought', 'brought'], buy: ['bought', 'bought'], choose: ['chose', 'chosen'],
  come: ['came', 'come'], cost: ['cost', 'cost'], cut: ['cut', 'cut'], deal: ['dealt', 'dealt'], do: ['did', 'done'],
  draw: ['drew', 'drawn'], drink: ['drank', 'drunk'], eat: ['ate', 'eaten'], fall: ['fell', 'fallen'],
  feed: ['fed', 'fed'], feel: ['felt', 'felt'], fight: ['fought', 'fought'], find: ['found', 'found'],
  flee: ['fled', 'fled'], fly: ['flew', 'flown'], forbid: ['forbade', 'forbidden'], forget: ['forgot', 'forgotten'],
  get: ['got', 'got'], give: ['gave', 'given'], go: ['went', 'gone'], grow: ['grew', 'grown'], hang: ['hung', 'hung'],
  have: ['had', 'had'], hide: ['hid', 'hidden'], hold: ['held', 'held'], hurt: ['hurt', 'hurt'], keep: ['kept', 'kept'],
  know: ['knew', 'known'], lead: ['led', 'led'], leave: ['left', 'left'], lie: ['lay', 'lain'], light: ['lit', 'lit'],
  lose: ['lost', 'lost'], make: ['made', 'made'], mean: ['meant', 'meant'], meet: ['met', 'met'],
  misunderstand: ['misunderstood', 'misunderstood'], overtake: ['overtook', 'overtaken'], pay: ['paid', 'paid'],
  put: ['put', 'put'], quit: ['quit', 'quit'], read: ['read', 'read'], ring: ['rang', 'rung'], rise: ['rose', 'risen'],
  run: ['ran', 'run'], say: ['said', 'said'], sell: ['sold', 'sold'], send: ['sent', 'sent'], set: ['set', 'set'],
  sew: ['sewed', 'sewn'], show: ['showed', 'shown'], shake: ['shook', 'shaken'], shine: ['shone', 'shone'], sing: ['sang', 'sung'],
  sit: ['sat', 'sat'], sleep: ['slept', 'slept'], speak: ['spoke', 'spoken'], spend: ['spent', 'spent'],
  stand: ['stood', 'stood'], steal: ['stole', 'stolen'], swim: ['swam', 'swum'], take: ['took', 'taken'],
  teach: ['taught', 'taught'], tell: ['told', 'told'], think: ['thought', 'thought'], throw: ['threw', 'thrown'],
  understand: ['understood', 'understood'], upset: ['upset', 'upset'], wake: ['woke', 'woken'],
  wear: ['wore', 'worn'], win: ['won', 'won'], withdraw: ['withdrew', 'withdrawn'], write: ['wrote', 'written'],
};
// Short verbs that double their last letter: stop → stopped (and British travel → travelled)
const DOUBLES = new Set(['chat', 'drop', 'jog', 'plan', 'shop', 'stop', 'swap', 'travel', 'cancel', 'stir', 'wrap', 'unwrap', 'transfer']);

const pastRegular = (v: string) =>
  v.endsWith('e')
    ? `${v}d`
    : /[^aeiou]y$/.test(v)
    ? `${v.slice(0, -1)}ied`
    : DOUBLES.has(v)
    ? `${v}${v.slice(-1)}ed`
    : `${v}ed`;
const third = (v: string) =>
  v === 'have' ? 'has' : /(s|x|z|ch|sh|o)$/.test(v) ? `${v}es` : /[^aeiou]y$/.test(v) ? `${v.slice(0, -1)}ies` : `${v}s`;

/** The English sentence: {look} becomes look / looks, or looked. */
export function englishIn(template: string, tense: 'present' | 'past', thirdSingular: boolean, firstPerson: boolean): string {
  return template.replace(/\{(\w+)\}/g, (_, v: string) => {
    if (v === 'be') {
      if (tense === 'present') return firstPerson ? 'am' : thirdSingular ? 'is' : 'are';
      return firstPerson || thirdSingular ? 'was' : 'were';
    }
    if (tense === 'present') return thirdSingular ? third(v) : v;
    return (IRREGULAR[v] ?? [pastRegular(v)])[0];
  });
}

const formsOf = (w: WordEntry, tense: SentenceTense) =>
  (tense === 'present' ? w.presentTense : tense === 'past' ? w.simplePast : w.presentPerfect) ?? [];

export function buildSentences(framesText: string, words: WordEntry[]): SentenceItem[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  const out: SentenceItem[] = [];
  for (const line of framesText.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split('|');
    const [verbId, personText, subject, middle] = parts.slice(0, 4).map((s) => s.trim());
    const englishText = parts.slice(4).join('|').trim(); // may hold "A || B || C"
    const word = byId.get(verbId);
    if (!word) continue;
    const person = Number(personText) - 1;
    const englishByTense = englishText.split('||').map((s) => s.trim());
    const englishSubject = englishByTense[0].split(' ')[0];
    const firstPerson = englishSubject === 'I';
    // "The police" takes a plural verb in English, though "die Polizei" is singular
    const thirdSingular =
      person === 2 && !['I', 'You', 'We', 'They'].includes(englishSubject) && !englishByTense[0].startsWith('The police');
    (['present', 'past', 'perfect'] as SentenceTense[]).forEach((tense, t) => {
      const form = formsOf(word, tense)[person];
      if (!form || form === '-') return;
      // Perfekt tells of the past as English does with its simple past: "Ich habe … gesehen" = "I saw …"
      const english = englishByTense.length === 3 ? englishByTense[Math.min(t, 1)] : englishByTense[0];
      if (!english || english === '-') return;
      const [finite, ...rest] = form.split(' ');
      out.push({
        id: `${verbId}:${tense}`,
        verbId,
        verb: word.display,
        lemma: word.lemma || word.display,
        level: word.level,
        lektion: word.lektion ?? 0,
        tense,
        subject,
        finite,
        reflexive: rest.filter((r) => REFLEXIVE.has(r)).join(' '),
        middle,
        end: rest.filter((r) => !REFLEXIVE.has(r)).join(' '),
        english: englishIn(english, tense === 'perfect' ? 'past' : tense, thirdSingular, firstPerson),
      });
    });
  }
  return out;
}

/** What is typed: both gaps, "sehe an" / "habe angesehen". */
export const sentenceAnswer = (s: SentenceItem) => [s.finite, s.end].filter(Boolean).join(' ');

/** The whole sentence, for reading out. */
export const sentenceText = (s: SentenceItem) =>
  `${[s.subject, s.finite, s.reflexive, s.middle, s.end].filter(Boolean).join(' ')}.`;
