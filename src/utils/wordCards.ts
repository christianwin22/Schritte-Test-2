import { WordEntry } from '../types';
import { checkEnglish, checkGerman, englishSenses } from './answerCheck';

/**
 * Words · one card per thing to learn.
 *
 * A noun with a real plural is two cards: "der Student" and "die Studenten".
 * Each has its own place in Review. The singular card keeps the word's own id,
 * so everything learned before plural cards existed stays where it was; the
 * plural card is "wpl:<id>".
 *
 * Speaking keeps its own schedule — saying a word is a different skill from
 * typing it — so its cards carry a "speak:" prefix.
 */
export interface WordCard {
  word: WordEntry;
  plural: boolean;
  /** Its key in the review records. */
  key: string;
}

export function cardKey(wordId: string, plural: boolean, prefix = ''): string {
  return `${prefix}${plural ? 'wpl:' : ''}${wordId}`;
}

/** "die Studenten", or null for a noun with no plural of its own (Sg., die Jeans, die SMS). */
export function pluralOf(word: WordEntry): string | null {
  const raw = word.nounDetails?.gender ? word.nounDetails.plural?.trim() : '';
  if (!raw || /\(Sg\.?\)|^die\s*-?$/i.test(raw)) return null;
  const plural = raw.toLowerCase().startsWith('die ') ? raw : `die ${raw}`;
  // Same as the singular (die Jeans → die Jeans): nothing new to learn
  if (plural.toLowerCase() === `${word.nounDetails!.gender} ${word.lemma}`.toLowerCase()) return null;
  return plural;
}

/** Every accepted plural answer: "die Studenten", and a second form where the list gives one. */
export function pluralAnswers(word: WordEntry): string[] {
  const listed = word.nounDetails?.pluralAlternatives?.filter(Boolean) ?? [];
  const main = pluralOf(word);
  const all = [...(main ? [main] : []), ...listed.map((p) => (p.toLowerCase().startsWith('die ') ? p : `die ${p}`))];
  return [...new Set(all)];
}

export function cardsFor(words: WordEntry[], prefix = ''): WordCard[] {
  const out: WordCard[] = [];
  for (const word of words) {
    out.push({ word, plural: false, key: cardKey(word.id, false, prefix) });
    if (pluralOf(word)) out.push({ word, plural: true, key: cardKey(word.id, true, prefix) });
  }
  return out;
}

/** The German side: "der Student" / "die Studenten" / "gehen". */
export function germanOf(card: WordCard): string {
  const { word } = card;
  if (card.plural) return pluralOf(word) ?? word.lemma;
  return word.nounDetails?.gender ? `${word.nounDetails.gender} ${word.lemma}` : word.lemma;
}

/** The example for this card: the plural card uses the plural sentence. */
export function exampleOf(card: WordCard): { german: string; english: string } | null {
  const { word } = card;
  if (card.plural) {
    if (word.pluralSentence) return { german: word.pluralSentence, english: word.pluralSentenceEnglish ?? '' };
    return null;
  }
  const ex = word.exampleSentences?.[0];
  if (!ex?.german) return null;
  return { german: ex.german.replace(/\{\{blank\}\}/g, word.lemma), english: ex.english || '' };
}

// --- The two little switches beside the DE → EN answer box ------------------

export type GenderChoice = 'M' | 'F';
export type NumberChoice = 'S' | 'P';

/** A person word with a female and a male form ("journalist (f.)"), so M / F says which. */
export function genderMark(word: WordEntry, all: WordEntry[]): GenderChoice | null {
  const text = englishSenses(word).flat().join(' ');
  if (/\((f\.?|female)\)/i.test(text)) return 'F';
  if (/\((m\.?|male)\)/i.test(text)) return 'M';
  if (!word.nounDetails?.gender) return null;
  // The male form often carries no mark; it has one when its female twin does.
  const bare = englishSenses(word)
    .flat()
    .flatMap((s) => s.split(/[,;/]/))
    .map((s) => s.replace(/\([^)]*\)/g, '').trim().toLowerCase());
  const twin = femaleMeanings(all);
  return bare.some((s) => twin.has(s)) ? 'M' : null;
}

let femaleCache: { list: WordEntry[]; set: Set<string> } | null = null;
function femaleMeanings(all: WordEntry[]): Set<string> {
  if (femaleCache?.list === all) return femaleCache.set;
  const set = new Set<string>();
  for (const w of all) {
    for (const s of englishSenses(w).flat()) {
      const m = s.match(/^(.*?)\s*\((f\.?|female)\)\s*$/i);
      if (m) set.add(m[1].trim().toLowerCase());
    }
  }
  femaleCache = { list: all, set };
  return set;
}

/** Nouns ask singular or plural; everything else has no S / P switch. */
export function hasNumberSwitch(card: WordCard): boolean {
  return !!card.word.nounDetails?.gender;
}

// --- Checking ----------------------------------------------------------------

/** EN → DE: the plural card wants the plural ("die Studenten"), article and all. */
export function checkCardGerman(input: string, card: WordCard) {
  if (!card.plural) return checkGerman(input, card.word);
  return checkGerman(input, { ...card.word, answers: pluralAnswers(card.word), isStem: false });
}

/** English plurals back to the word list's singular: students → student, cities → city, men → man. */
function singularGuesses(text: string): string[] {
  const t = text.trim();
  const out = [t];
  if (/ies$/i.test(t)) out.push(t.replace(/ies$/i, 'y'));
  if (/es$/i.test(t)) out.push(t.replace(/es$/i, ''));
  if (/s$/i.test(t)) out.push(t.replace(/s$/i, ''));
  if (/men$/i.test(t)) out.push(t.replace(/men$/i, 'man'));
  if (/children$/i.test(t)) out.push(t.replace(/children$/i, 'child'));
  if (/people$/i.test(t)) out.push(t.replace(/people$/i, 'person'));
  return out;
}

/** DE → EN: the meaning. On a plural card "students" counts as well as "student". */
export function checkCardEnglish(input: string, card: WordCard): boolean {
  if (checkEnglish(input, card.word)) return true;
  return card.plural && singularGuesses(input).some((guess) => checkEnglish(guess, card.word));
}

/** The typed meaning as the word list writes it ("areas" → "area" on a plural card), for the two-box check. */
export function asListedEnglish(input: string, card: WordCard): string {
  if (!card.plural) return input;
  return singularGuesses(input).find((guess) => checkEnglish(guess, card.word)) ?? input;
}
