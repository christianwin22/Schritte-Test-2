import { EvaluationResult, Gender, WordEntry } from '../types';

/**
 * Standardize German text for comparison
 */
export function cleanGermanText(text: string): string {
  return text
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Strips umlauts to base ASCII vowels for fuzzy checking
 */
export function stripUmlauts(text: string): string {
  return text
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/Ä/g, 'A')
    .replace(/Ö/g, 'O')
    .replace(/Ü/g, 'U')
    .replace(/ß/g, 'ss');
}

/**
 * Replaces digraphs (ae -> ä, oe -> ö, ue -> ü, ss -> ß)
 */
export function expandDigraphs(text: string): string {
  return text
    .replace(/ae/gi, 'ä')
    .replace(/oe/gi, 'ö')
    .replace(/ue/gi, 'ü')
    .replace(/ss/gi, 'ß');
}

/**
 * Calculate Levenshtein Distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let i = 0; i <= bn; ++i) matrix[i][0] = i;

  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Evaluates an answer for Gender Master drill
 */
export function evaluateGenderAnswer(selectedGender: Gender, correctGender: Gender, word: WordEntry): EvaluationResult {
  const isCorrect = selectedGender.toLowerCase() === correctGender.toLowerCase();
  if (isCorrect) {
    return {
      type: 'exact',
      score: 100,
      title: 'Perfekt! Ausgezeichnet',
      message: `"${correctGender} ${word.lemma}" is correct!`,
      expected: `${correctGender} ${word.lemma}`,
      userAnswer: selectedGender,
      suggestedRating: 'good',
    };
  }

  return {
    type: 'wrong',
    score: 0,
    title: 'Nicht ganz!',
    message: `"${word.lemma}" takes the article "${correctGender}", not "${selectedGender}".`,
    expected: `${correctGender} ${word.lemma}`,
    userAnswer: selectedGender,
    slipType: 'wrong_article',
    suggestedRating: 'again',
  };
}

/**
 * Evaluates a typed German answer with intelligent partial credit and spelling tolerances
 */
export function evaluateTypedAnswer(
  rawInput: string,
  rawExpected: string,
  context?: {
    word?: WordEntry;
    mode?: 'verb' | 'cloze' | 'general';
    expectedAuxiliary?: 'haben' | 'sein';
  }
): EvaluationResult {
  const input = cleanGermanText(rawInput);
  const expected = cleanGermanText(rawExpected);

  if (!input) {
    return {
      type: 'wrong',
      score: 0,
      title: 'Keine Antwort',
      message: `The correct answer is: "${rawExpected}".`,
      expected: rawExpected,
      userAnswer: '',
      suggestedRating: 'again',
    };
  }

  // 1. Exact match
  if (input === expected) {
    return {
      type: 'exact',
      score: 100,
      title: 'Hervorragend!',
      message: 'Spot on! 100% accurate German.',
      expected: rawExpected,
      userAnswer: rawInput,
      suggestedRating: 'good',
    };
  }

  if (input.toLowerCase() === expected.toLowerCase()) {
    // Only capitalization difference (e.g. noun capitalization in German)
    const isNoun = context?.word?.partOfSpeech === 'noun';
    return {
      type: 'umlaut_warning',
      score: 90,
      title: 'Fast perfekt! (Großschreibung)',
      message: isNoun
        ? `Remember: German nouns are always capitalized (${rawExpected}).`
        : `Check capitalization: "${rawExpected}".`,
      expected: rawExpected,
      userAnswer: rawInput,
      slipType: 'case_slip',
      suggestedRating: 'good',
    };
  }

  // 2. Check for Noun with wrong article (e.g. "der Haus" when expected is "das Haus")
  const articles: Gender[] = ['der', 'die', 'das'];
  const inputParts = input.split(' ');
  const expectedParts = expected.split(' ');

  if (
    inputParts.length >= 2 &&
    expectedParts.length >= 2 &&
    articles.includes(inputParts[0].toLowerCase() as Gender) &&
    articles.includes(expectedParts[0].toLowerCase() as Gender)
  ) {
    const inputArticle = inputParts[0].toLowerCase() as Gender;
    const expectedArticle = expectedParts[0].toLowerCase() as Gender;
    const inputNoun = inputParts.slice(1).join(' ');
    const expectedNoun = expectedParts.slice(1).join(' ');

    if (inputNoun.toLowerCase() === expectedNoun.toLowerCase()) {
      if (inputArticle !== expectedArticle) {
        return {
          type: 'partial_slip',
          score: 70,
          title: 'Guter Versuch! Artikelfehler',
          message: `You got the noun lemma "${expectedNoun}" right, but the gender is "${expectedArticle}", not "${inputArticle}". Rescheduled for quick reinforcement.`,
          expected: rawExpected,
          userAnswer: rawInput,
          slipType: 'wrong_article',
          suggestedRating: 'hard',
        };
      }
    }
  }

  // 3. Check for Missing Umlauts (e.g. "Hauser" vs "Häuser", "schon" vs "schön", "Apfel" vs "Äpfel")
  const inputNoUmlauts = stripUmlauts(input).toLowerCase();
  const expectedNoUmlauts = stripUmlauts(expected).toLowerCase();

  if (inputNoUmlauts === expectedNoUmlauts) {
    return {
      type: 'umlaut_warning',
      score: 85,
      title: 'Fast richtig! Achte auf die Umlaute',
      message: `You missed the umlaut (ä/ö/ü/ß). The correct spelling is "${rawExpected}".`,
      expected: rawExpected,
      userAnswer: rawInput,
      slipType: 'missing_umlaut',
      suggestedRating: 'hard',
    };
  }

  // 4. Digraph check (e.g., user typed "ae" instead of "ä" like "Haeuser")
  const inputExpanded = expandDigraphs(input).toLowerCase();
  if (inputExpanded === expected.toLowerCase()) {
    return {
      type: 'umlaut_warning',
      score: 88,
      title: 'Guter Versuch! Verwende echte Umlaute',
      message: `In standard German, write "${rawExpected}" with proper umlauts (ä, ö, ü) rather than digraphs (ae, oe, ue).`,
      expected: rawExpected,
      userAnswer: rawInput,
      slipType: 'missing_umlaut',
      suggestedRating: 'hard',
    };
  }

  // 5. Verb Conjugator auxiliary slip (e.g. "hat angekommen" instead of "ist angekommen")
  if (context?.mode === 'verb') {
    const inputTokens = input.toLowerCase().split(' ');
    const expectedTokens = expected.toLowerCase().split(' ');

    if (inputTokens.length === 2 && expectedTokens.length === 2) {
      const isInputAux = ['hat', 'haben', 'ist', 'sein', 'sind'].includes(inputTokens[0]);
      const isExpAux = ['hat', 'haben', 'ist', 'sein', 'sind'].includes(expectedTokens[0]);

      if (isInputAux && isExpAux && inputTokens[1] === expectedTokens[1] && inputTokens[0] !== expectedTokens[0]) {
        return {
          type: 'partial_slip',
          score: 65,
          title: 'Teilweise richtig! Hilfsverb-Fehler',
          message: `Participle "${expectedTokens[1]}" is correct, but this verb forms Perfekt with "${expectedTokens[0]}", not "${inputTokens[0]}".`,
          expected: rawExpected,
          userAnswer: rawInput,
          slipType: 'wrong_auxiliary',
          suggestedRating: 'hard',
        };
      }
    }
  }

  // 6. Minor Levenshtein Typo (tolerance for <= 1 edit on words length >= 4)
  const dist = levenshteinDistance(input.toLowerCase(), expected.toLowerCase());
  if (dist === 1 && expected.length >= 4) {
    return {
      type: 'typo_minor',
      score: 80,
      title: 'Kleiner Tippfehler!',
      message: `Close! You wrote "${rawInput}", but correct is "${rawExpected}".`,
      expected: rawExpected,
      userAnswer: rawInput,
      slipType: 'minor_typo',
      suggestedRating: 'hard',
    };
  }

  // 7. Incorrect Answer
  return {
    type: 'wrong',
    score: 0,
    title: 'Leider falsch',
    message: `The correct form is "${rawExpected}".`,
    expected: rawExpected,
    userAnswer: rawInput,
    suggestedRating: 'again',
  };
}
