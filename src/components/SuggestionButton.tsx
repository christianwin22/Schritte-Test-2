import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X, Check, ImagePlus, Trash2, CloudOff } from 'lucide-react';
import { PendingMedia, readFileAsMedia, saveSuggestion } from '../lib/suggestions';
import { AppLanguage } from '../utils/translations';

interface SuggestionButtonProps {
  /** Where you are, e.g. "Vocabulary · Flashcard". Saved with the note. */
  where: string;
  appLanguage?: AppLanguage;
  /** 'inline' sits in the top bar; 'floating' sits in the bottom-right corner. */
  variant?: 'inline' | 'floating';
}

/** Grabs the headline of whatever card is on screen, so a note has context later. */
function whatIsOnScreen(): string | undefined {
  const main = document.querySelector('main');
  if (!main) return undefined;
  const text = (main as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 120) : undefined;
}

/**
 * On every screen: tap it, type the idea, attach a screenshot, done.
 * Notes go to your account. Without a login (Sandbox) or offline they wait on
 * this device and go up the next time you are signed in.
 */
export const SuggestionButton: React.FC<SuggestionButtonProps> = ({ where, appLanguage = 'en', variant = 'inline' }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'queued'>('idle');
  const [onScreen, setOnScreen] = useState<string | undefined>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const en = appLanguage === 'en';

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const addFiles = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    const read = await Promise.all(images.map(readFileAsMedia));
    setMedia((current) => [...current, ...read].slice(0, 4)); // four is plenty for one idea
  }, []);

  const submit = useCallback(async () => {
    const note = text.trim();
    if (!note || status === 'saving') return;
    setStatus('saving');
    const result = await saveSuggestion(note, where, onScreen, media);
    setStatus(result);
    setText('');
    setMedia([]);
    setTimeout(() => {
      setStatus('idle');
      setOpen(false);
    }, result === 'saved' ? 900 : 1600);
  }, [text, status, where, onScreen, media]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      // ⌘/Ctrl + Enter saves, so you can stay on the keyboard
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
    };
    // ⌘/Ctrl + V anywhere in the dialog attaches a copied screenshot
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.some((f) => f.type.startsWith('image/'))) {
        e.preventDefault();
        void addFiles(files);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('paste', onPaste);
    };
  }, [open, submit, addFiles]);

  return (
    <>
      <button
        type="button"
        id="suggestion-button"
        onClick={() => {
          setOnScreen(whatIsOnScreen()); // capture before the dialog covers it
          setOpen(true);
        }}
        title={en ? 'Note an idea' : 'Idee notieren'}
        aria-label={en ? 'Note an idea' : 'Idee notieren'}
        className={
          variant === 'floating'
            ? 'fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer'
            : 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-2xs flex items-center justify-center active:scale-95 transition-all cursor-pointer'
        }
      >
        <Lightbulb className={variant === 'floating' ? 'w-5 h-5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'} />
      </button>

      {/* Into <body>: the top bar's blur would otherwise trap this overlay inside the bar */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-3 pb-3 sm:pb-0">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl p-5 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base text-zinc-900 dark:text-zinc-100">
                {en ? 'Note an idea' : 'Idee notieren'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={en ? 'Close' : 'Schließen'}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] font-bold text-zinc-400">{where}</p>

            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={
                en
                  ? 'What would you change, add or remove?\nYou can paste a screenshot straight in here.'
                  : 'Was möchtest du ändern, ergänzen oder entfernen?\nDu kannst hier direkt einen Screenshot einfügen.'
              }
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-white outline-none font-bold text-sm resize-none"
            />

            {media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {media.map((shot, i) => (
                  <div key={`${shot.name}-${i}`} className="relative">
                    <img
                      src={shot.dataUrl}
                      alt={shot.name}
                      className="w-16 h-16 object-cover rounded-xl border-2 border-zinc-200 dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => setMedia((current) => current.filter((_, j) => j !== i))}
                      aria-label={en ? 'Remove screenshot' : 'Screenshot entfernen'}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-500 hover:text-rose-600 flex items-center justify-center shadow-2xs cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(Array.from(e.target.files ?? []));
                e.target.value = ''; // so the same file can be picked again
              }}
            />
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={media.length >= 4}
                title={
                  media.length >= 4
                    ? en ? 'Four screenshots is the limit' : 'Maximal vier Screenshots'
                    : en ? 'Add a screenshot — or paste one into the box' : 'Screenshot hinzufügen — oder oben einfügen'
                }
                aria-label={en ? 'Add a screenshot' : 'Screenshot hinzufügen'}
                className="w-12 shrink-0 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={!text.trim() || status !== 'idle'}
                className={`flex-1 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                  status === 'saved'
                    ? 'bg-emerald-600 text-white'
                    : status === 'queued'
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
                }`}
              >
                {status === 'saved' && (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{en ? 'Saved to your account' : 'In deinem Konto gespeichert'}</span>
                  </>
                )}
                {status === 'queued' && (
                  <>
                    <CloudOff className="w-4 h-4" />
                    <span>{en ? 'Kept here until you sign in' : 'Bleibt hier bis zur Anmeldung'}</span>
                  </>
                )}
                {status === 'saving' && <span>{en ? 'Saving…' : 'Speichern…'}</span>}
                {status === 'idle' && <span>{en ? 'Save' : 'Speichern'}</span>}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};
