import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, PanelRightClose } from 'lucide-react';

/**
 * Desktop only: a picture of the current word, beside the card. On desktop the
 * Words page uses the full width (Chris, 2026-11-27), so the picture takes its
 * own column right of the card. Folds into a small tab, and remembers that on this device.
 * iPad and iPhone never show it (it needs a mouse and a wide window), so their
 * layout is untouched. Pictures live in public/word-pictures (made by
 * scripts/wordPictures.py); src/data/wordPictures.json says which word shows which.
 */

const DESKTOP_QUERY = '(min-width: 1200px) and (hover: hover) and (pointer: fine)';
const OPEN_KEY = 'dm_picture_panel_open';

export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setDesktop(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

let manifestPromise: Promise<Record<string, string>> | null = null;
function loadManifest() {
  manifestPromise ??= import('../data/wordPictures.json').then(
    (m) => (m.default ?? m) as Record<string, string>
  );
  return manifestPromise;
}

// Pictures of the example sentences (scripts/sentencePicturePrompts.py), by card key.
let sentencePromise: Promise<Record<string, string>> | null = null;
function loadSentenceManifest() {
  sentencePromise ??= import('../data/sentencePictures.json').then(
    (m) => (m.default ?? m) as Record<string, string>
  );
  return sentencePromise;
}

interface Props {
  /** The word on screen, or null when there is none (Start page, round end). */
  wordId: string | null;
  /** That card's key ("wpl:<id>" for a plural card): its sentence picture comes first. */
  cardKey?: string | null;
  /** False while the picture would give the answer away. */
  reveal: boolean;
  appLanguage: string;
}

export const WordPicturePanel: React.FC<Props> = ({ wordId, cardKey, reveal, appLanguage }) => {
  const desktop = useIsDesktop();
  const en = appLanguage === 'en';
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [manifest, setManifest] = useState<Record<string, string> | null>(null);
  const [sentences, setSentences] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!desktop) return;
    loadManifest().then(setManifest).catch(() => setManifest({}));
    loadSentenceManifest().then(setSentences).catch(() => setSentences({}));
  }, [desktop]);

  if (!desktop || !wordId) return null;

  const toggle = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {
      /* private window: just don't remember */
    }
  };

  // The sentence's picture when there is one, else the word's.
  const sentenceKey = cardKey ? sentences?.[cardKey] : undefined;
  const wordKey = manifest?.[wordId];
  const sentenceSrc = sentenceKey ? `/word-pictures/${sentenceKey}.webp` : null;
  const src = sentenceSrc && failed !== sentenceSrc ? sentenceSrc : wordKey ? `/word-pictures/${wordKey}.webp` : null;
  const hasPicture = !!src && failed !== src;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => toggle(true)}
        title={en ? 'Show picture' : 'Bild zeigen'}
        className="self-center shrink-0 flex flex-col items-center gap-1 px-2 py-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
      >
        <ImageIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <aside className="self-center shrink-0 w-80 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-sm p-3 animate-fadeIn">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          {en ? 'Picture' : 'Bild'}
        </span>
        <button
          type="button"
          onClick={() => toggle(false)}
          title={en ? 'Hide picture' : 'Bild ausblenden'}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>
      <div className="aspect-square w-full rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
        {!reveal ? (
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 px-4 text-center">
            {en ? 'Shows after you answer' : 'Erscheint nach der Antwort'}
          </span>
        ) : hasPicture ? (
          <img
            key={src}
            src={src!}
            alt=""
            draggable={false}
            onError={() => setFailed(src)}
            className="w-full h-full object-cover animate-fadeIn select-none"
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
        )}
      </div>
    </aside>
  );
};
