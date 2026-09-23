/**
 * Ideas jotted down while using the app.
 *
 * Kept under a "cpa_" key on purpose: outside the synced progress keys, and
 * outside the sandbox swap, so a note written in the Sandbox is still there in
 * the real app and the other way round. Per device, never uploaded.
 */

const KEY = 'cpa_suggestions_v1';

export interface Suggestion {
  id: string;
  text: string;
  /** ISO timestamp */
  at: string;
  /** Where you were when you wrote it, e.g. "Vocabulary · Flashcard · review" */
  where: string;
  /** What was on screen, to jog your memory later */
  onScreen?: string;
}

export function listSuggestions(): Suggestion[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: Suggestion[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function addSuggestion(text: string, where: string, onScreen?: string): Suggestion {
  const note: Suggestion = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    at: new Date().toISOString(),
    where,
    onScreen: onScreen?.slice(0, 120),
  };
  save([note, ...listSuggestions()]);
  return note;
}

export function removeSuggestion(id: string): void {
  save(listSuggestions().filter((s) => s.id !== id));
}

export function clearSuggestions(): void {
  save([]);
}

/** Everything as plain text, for pasting into a chat or a file. */
export function suggestionsAsText(): string {
  return listSuggestions()
    .map((s) => {
      const when = new Date(s.at).toLocaleString();
      const screen = s.onScreen ? `\n  on screen: ${s.onScreen}` : '';
      return `- [${when}] (${s.where})${screen}\n  ${s.text}`;
    })
    .join('\n\n');
}
