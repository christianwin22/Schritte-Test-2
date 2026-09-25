import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { AppLanguage } from '../utils/translations';

/**
 * Which language the app speaks to you in.
 *
 * Three choices, two languages: the app itself has English and German, and the
 * two Englishes pick which flag you see rather than changing any wording.
 */
export type Locale = 'en-US' | 'en-GB' | 'de';

const LOCALE_KEY = 'deutschmeister_locale_v1';

export const LOCALES: { value: Locale; flag: string; label: string; language: AppLanguage }[] = [
  { value: 'en-US', flag: '🇺🇸', label: 'English (US)', language: 'en' },
  { value: 'en-GB', flag: '🇬🇧', label: 'English (UK)', language: 'en' },
  { value: 'de', flag: '🇩🇪', label: 'Deutsch', language: 'de' },
];

export function loadLocale(appLanguage: AppLanguage): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === 'en-US' || saved === 'en-GB' || saved === 'de') return saved;
  } catch {
    // nothing saved
  }
  return appLanguage === 'de' ? 'de' : 'en-US';
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // the flag just won't stick
  }
}

export const LanguageDialog: React.FC<{
  appLanguage: AppLanguage;
  onPick: (locale: Locale) => void;
  onClose: () => void;
}> = ({ appLanguage, onPick, onClose }) => {
  const current = loadLocale(appLanguage);
  const en = appLanguage === 'en';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-3 pb-3 sm:pb-0">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl p-5 space-y-4 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base text-zinc-900 dark:text-zinc-100">
            {en ? 'App language' : 'App-Sprache'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={en ? 'Close' : 'Schließen'}
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {LOCALES.map((option, i) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                saveLocale(option.value);
                onPick(option.value);
                onClose();
              }}
              className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                i ? 'border-t border-zinc-200 dark:border-zinc-700' : ''
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-xl leading-none">{option.flag}</span>
                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{option.label}</span>
              </span>
              {current === option.value && <Check className="w-4 h-4 stroke-[3] text-zinc-900 dark:text-zinc-100" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
