/**
 * How the chosen levels are written in one short line.
 *
 * Listing them ("A1 · A2 · B1") stops working the moment there are more than a
 * few, so a run of neighbouring levels is written as a range instead. Levels
 * with a gap in them are still listed, because calling that a range would be
 * a lie.
 */

export const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export type RangeStyle = 'arrow' | 'to' | 'endash' | 'ellipsis' | 'chevron';

/** What sits between the first level and the last one. */
export const RANGE_JOINERS: Record<RangeStyle, string> = {
  arrow: '→',
  to: 'to',
  endash: '–',
  ellipsis: '…',
  chevron: '›',
};

/** Change this one word to change it everywhere. */
export const LEVEL_RANGE_STYLE: RangeStyle = 'arrow';

export function sortLevels(levels: string[]): string[] {
  return LEVEL_ORDER.filter((l) => levels.includes(l));
}

export function formatLevels(levels: string[], style: RangeStyle = LEVEL_RANGE_STYLE): string {
  const sorted = sortLevels(levels);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return sorted[0];

  const first = LEVEL_ORDER.indexOf(sorted[0]);
  const last = LEVEL_ORDER.indexOf(sorted[sorted.length - 1]);
  const unbroken = last - first + 1 === sorted.length;
  if (!unbroken) return sorted.join(' · ');

  return `${sorted[0]} ${RANGE_JOINERS[style]} ${sorted[sorted.length - 1]}`;
}
