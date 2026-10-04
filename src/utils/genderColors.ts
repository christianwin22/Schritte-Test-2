/**
 * One colour per gender, everywhere an article is shown:
 * masculine blue, feminine red, neuter green.
 *
 * The case sets how deep the colour is — Nominative is the lightest, then each
 * case a step darker: Accusative, Dative, Genitive. So "der" (Nom.) is a light
 * blue and "den" (Acc.) the same blue, darker.
 *
 * The plural "die" belongs to no gender: it is orange, as the book marks it,
 * with the same steps by case.
 *
 * Tailwind only keeps classes it can see written out in full, so every one is
 * spelled out here rather than built from pieces.
 */

export type GrammarCase = 'nominative' | 'accusative' | 'dative' | 'genitive';
export type GenderKey = 'm' | 'f' | 'n';

const TEXT: Record<GenderKey, Record<GrammarCase, string>> = {
  m: {
    nominative: 'text-blue-500 dark:text-blue-300',
    accusative: 'text-blue-600 dark:text-blue-400',
    dative: 'text-blue-700 dark:text-blue-500',
    genitive: 'text-blue-900 dark:text-blue-600',
  },
  f: {
    nominative: 'text-red-500 dark:text-red-300',
    accusative: 'text-red-600 dark:text-red-400',
    dative: 'text-red-700 dark:text-red-500',
    genitive: 'text-red-900 dark:text-red-600',
  },
  n: {
    nominative: 'text-green-500 dark:text-green-300',
    accusative: 'text-green-600 dark:text-green-400',
    dative: 'text-green-700 dark:text-green-500',
    genitive: 'text-green-900 dark:text-green-600',
  },
};

/** Filled buttons (the der / die / das choices), same colour steps. */
const BUTTON: Record<GenderKey, Record<GrammarCase, string>> = {
  m: {
    nominative: 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300',
    accusative: 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-950/60 dark:border-blue-600 dark:text-blue-400',
    dative: 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/60 dark:border-blue-500 dark:text-blue-400',
    genitive: 'bg-blue-200 border-blue-700 text-blue-900 dark:bg-blue-900/80 dark:border-blue-400 dark:text-blue-300',
  },
  f: {
    nominative: 'bg-red-50 border-red-300 text-red-600 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300',
    accusative: 'bg-red-100 border-red-400 text-red-700 dark:bg-red-950/60 dark:border-red-600 dark:text-red-400',
    dative: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/60 dark:border-red-500 dark:text-red-400',
    genitive: 'bg-red-200 border-red-700 text-red-900 dark:bg-red-900/80 dark:border-red-400 dark:text-red-300',
  },
  n: {
    nominative: 'bg-green-50 border-green-300 text-green-600 dark:bg-green-950/40 dark:border-green-700 dark:text-green-300',
    accusative: 'bg-green-100 border-green-400 text-green-700 dark:bg-green-950/60 dark:border-green-600 dark:text-green-400',
    dative: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/60 dark:border-green-500 dark:text-green-400',
    genitive: 'bg-green-200 border-green-700 text-green-900 dark:bg-green-900/80 dark:border-green-400 dark:text-green-300',
  },
};

const PLURAL_TEXT: Record<GrammarCase, string> = {
  nominative: 'text-orange-500 dark:text-orange-300',
  accusative: 'text-orange-600 dark:text-orange-400',
  dative: 'text-orange-700 dark:text-orange-500',
  genitive: 'text-orange-900 dark:text-orange-600',
};

/** Text colour for a plural article ("die Studenten", "die Kenntnisse (Pl.)"). */
export function pluralText(kase: GrammarCase = 'nominative'): string {
  return PLURAL_TEXT[kase];
}

/** Button colours for the plural (the P of the S/P switch). */
export function pluralButton(): string {
  return 'bg-orange-50 border-orange-300 text-orange-600 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-300';
}

/** "der" / "die" / "das" (the noun's own gender) → m / f / n. */
export function genderKey(gender?: string | null): GenderKey | null {
  const g = (gender ?? '').trim().toLowerCase();
  if (g === 'der' || g === 'm') return 'm';
  if (g === 'die' || g === 'f') return 'f';
  if (g === 'das' || g === 'n') return 'n';
  return null;
}

/** Text colour for an article (or the noun's gender) in a case. */
export function genderText(gender?: string | null, kase: GrammarCase = 'nominative'): string {
  const key = genderKey(gender);
  return key ? TEXT[key][kase] : 'text-zinc-900 dark:text-zinc-100';
}

/** Button colours for a gender in a case. */
export function genderButton(gender?: string | null, kase: GrammarCase = 'nominative'): string {
  const key = genderKey(gender);
  return key ? BUTTON[key][kase] : 'bg-zinc-100 border-zinc-300 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white';
}

/** Which gender an accusative article belongs to: den → m, die → f, das → n. */
export function accusativeGender(article: string): GenderKey | null {
  const a = article.trim().toLowerCase();
  if (a === 'den') return 'm';
  if (a === 'die') return 'f';
  if (a === 'das') return 'n';
  return null;
}
