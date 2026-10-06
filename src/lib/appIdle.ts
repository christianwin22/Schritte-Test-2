/**
 * Is the user on the home screen, or busy inside a section or exercise?
 *
 * A reload (new version out) or a screen rebuild (another device's progress
 * merged in) both land you back on home. In the middle of an exercise that
 * looks like being thrown out, so those wait here until you are home again.
 */

let busy = false;
const waiting: Array<() => void> = [];

export function setAppBusy(next: boolean): void {
  busy = next;
  if (!busy) for (const run of waiting.splice(0)) run();
}

export function isAppBusy(): boolean {
  return busy;
}

/** Runs `run` now if the user is on home, otherwise as soon as they get there. */
export function whenAppIdle(run: () => void): void {
  if (busy) waiting.push(run);
  else run();
}
