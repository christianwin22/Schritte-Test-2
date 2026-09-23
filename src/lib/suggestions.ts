import { supabase } from './supabase';

/**
 * Ideas noted with the bulb button.
 *
 * Signed in: the note and any screenshots go to your account — the
 * `suggestions` table and the private `idea-media` bucket — so they are on
 * every device and readable outside the app.
 *
 * Not signed in (Sandbox, or before login is set up), or offline: the note
 * waits in a local queue under a "cpa_" key, outside the synced progress keys
 * and outside the sandbox swap, and is sent the next time you are signed in.
 */

const QUEUE_KEY = 'cpa_suggestion_queue_v1';
const BUCKET = 'idea-media';

export interface PendingMedia {
  name: string;
  type: string;
  /** data: URL — only used while a note is waiting in the queue */
  dataUrl: string;
}

export interface PendingSuggestion {
  id: string;
  text: string;
  at: string;
  where: string;
  onScreen?: string;
  media: PendingMedia[];
}

function readQueue(): PendingSuggestion[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeQueue(list: PendingSuggestion[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  } catch {
    // out of space: drop the oldest and try once more
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(0, 5)));
    } catch {
      // give up quietly; the note is still on screen
    }
  }
}

export function pendingCount(): number {
  return readQueue().length;
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function fileFromDataUrl(dataUrl: string, name: string, type: string): File {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}

async function uploadOne(userId: string, media: PendingMedia): Promise<string | null> {
  if (!supabase) return null;
  const safeName = media.name.replace(/[^\w.-]+/g, '_');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileFromDataUrl(media.dataUrl, safeName, media.type), { contentType: media.type });
  if (error) {
    console.warn('Screenshot upload failed', error.message);
    return null;
  }
  return path;
}

/** Sends one note to the account. Returns false if it could not be saved. */
async function send(note: PendingSuggestion, userId: string): Promise<boolean> {
  if (!supabase) return false;
  const paths: string[] = [];
  for (const media of note.media) {
    const path = await uploadOne(userId, media);
    if (path) paths.push(path);
  }
  const { error } = await supabase.from('suggestions').insert({
    user_id: userId,
    text: note.text,
    context: note.where,
    on_screen: note.onScreen ?? null,
    media: paths,
  });
  if (error) {
    console.warn('Saving the idea failed; it stays queued', error.message);
    return false;
  }
  return true;
}

/** Tries to send everything waiting. Safe to call on sign-in and after saving. */
export async function flushQueue(): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return 0;
  let sent = 0;
  for (const note of [...readQueue()].reverse()) {
    // eslint-disable-next-line no-await-in-loop
    if (await send(note, userId)) {
      sent++;
      writeQueue(readQueue().filter((n) => n.id !== note.id));
    }
  }
  return sent;
}

export type SaveResult = 'saved' | 'queued';

/** Saves an idea: straight to the account when possible, otherwise queued. */
export async function saveSuggestion(
  text: string,
  where: string,
  onScreen: string | undefined,
  media: PendingMedia[]
): Promise<SaveResult> {
  const note: PendingSuggestion = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    at: new Date().toISOString(),
    where,
    onScreen: onScreen?.slice(0, 200),
    media,
  };

  const userId = await currentUserId();
  if (userId && (await send(note, userId))) {
    void flushQueue(); // anything older goes up too
    return 'saved';
  }

  writeQueue([note, ...readQueue()]);
  return 'queued';
}

/** Reads a file (or a pasted image) into the shape the queue and uploader use. */
export function readFileAsMedia(file: File): Promise<PendingMedia> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () =>
      resolve({
        name: file.name || `screenshot-${Date.now()}.png`,
        type: file.type || 'image/png',
        dataUrl: String(reader.result),
      });
    reader.readAsDataURL(file);
  });
}
