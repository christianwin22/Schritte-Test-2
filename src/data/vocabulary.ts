import { WordEntry } from '../types';
import generated from './vocabulary.generated.json';

/**
 * Every word from Chris's Deutsche_Meister_Vocabulary.md — A1.1 through B1.2.
 *
 * Generated: run `python3 scripts/importVocabulary.py` after editing the .md.
 * Do not edit vocabulary.generated.json by hand.
 */
export const INITIAL_VOCABULARY = generated as unknown as WordEntry[];
