import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X, Check } from 'lucide-react';
import { addSuggestion } from '../lib/suggestions';
import { AppLanguage } from '../utils/translations';

interface SuggestionButtonProps {
  /** Where you are, e.g. "Vocabulary · Flashcard". Saved with the note. */
  where: string;
  appLanguage?: AppLanguage;
}

/** Grabs the headline of whatever card is on screen, so a note has context later. */
function whatIsOnScreen(): string | undefined {
  const main = document.querySelector('main');
  if (!main) return undefined;
  const text = (main as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 120) : undefined;
}

/**
 * A floating button, on every screen inside the app: tap it, type the idea, done.
 * Notes are kept on this device and listed in Settings.
 */
export const SuggestionButton: React.FC<SuggestionButtonProps> = ({ where, appLanguage = 'en' }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [onScreen, setOnScreen] = useState<string | undefined>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const en = appLanguage === 'en';

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      // ⌘/Ctrl + Enter saves, so you can stay on the keyboard
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const submit = () => {
    const note = text.trim();
    if (!note) return;
    addSuggestion(note, where, onScreen);
    setText('');
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 900);
  };

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
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500 shadow-2xs flex items-center justify-center active:scale-95 transition-all cursor-pointer"
      >
        <Lightbulb className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
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
              placeholder={en ? 'What would you change, add or remove?' : 'Was möchtest du ändern, ergänzen oder entfernen?'}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-white outline-none font-bold text-sm resize-none"
            />

            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || saved}
              className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{en ? 'Saved' : 'Gespeichert'}</span>
                </>
              ) : (
                <span>{en ? 'Save idea' : 'Idee speichern'}</span>
              )}
            </button>

            <p className="text-[11px] text-center font-medium text-zinc-400">
              {en ? 'Kept on this device — see them all in Settings' : 'Nur auf diesem Gerät – alle in den Einstellungen'}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
