import framesText from './sentenceFrames.txt?raw';
import { INITIAL_VOCABULARY } from './vocabulary';
import { buildSentences, SentenceItem } from './sentenceBuilder';

export type { SentenceItem, SentenceTense } from './sentenceBuilder';
export { sentenceAnswer, sentenceText } from './sentenceBuilder';

/** Every verb of every lesson, in Present, Simple Past and Present Perfect. */
export const SENTENCES: SentenceItem[] = buildSentences(framesText, INITIAL_VOCABULARY);
