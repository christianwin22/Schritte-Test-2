import { DuolingoTab } from '../types';

/**
 * Areas that are visible but not open yet in the real app.
 *
 * They render faded and unclickable on the home screen, and App.tsx refuses the
 * tab as well, so a locked area cannot be reached another way.
 *
 * The Sandbox ignores this list: everything stays open there for testing.
 *
 * To open an area, delete its line — nothing else needs to change.
 */
export const LOCKED_TABS: DuolingoTab[] = ['listening', 'speaking', 'reading'];

export function isTabLocked(tab: 'home' | DuolingoTab, isSandbox = false): boolean {
  if (isSandbox) return false;
  return LOCKED_TABS.includes(tab as DuolingoTab);
}
