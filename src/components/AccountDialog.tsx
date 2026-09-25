import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { loadProfile, saveProfile, type Gender, type Profile } from '../lib/profile';
import { useAuth } from './AuthGate';
import { AppLanguage } from '../utils/translations';

const GENDERS: { value: Gender; en: string; de: string }[] = [
  { value: 'female', en: 'Female', de: 'Weiblich' },
  { value: 'male', en: 'Male', de: 'Männlich' },
  { value: 'other', en: 'Other', de: 'Divers' },
  { value: 'unsaid', en: 'Prefer not to say', de: 'Keine Angabe' },
];

const field =
  'w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-white outline-none font-bold text-sm';
const label = 'block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5';

/** Name, email, gender and birthday — the usual set, in a dialog of its own. */
export const AccountDialog: React.FC<{ appLanguage: AppLanguage; onClose: () => void }> = ({
  appLanguage,
  onClose,
}) => {
  const auth = useAuth();
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const en = appLanguage === 'en';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    if (!profile.name.trim()) return;
    saveProfile({ ...profile, name: profile.name.trim(), setUp: true });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-3 pb-3 sm:pb-0">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl p-5 space-y-4 animate-fadeIn max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base text-zinc-900 dark:text-zinc-100">
            {en ? 'My account' : 'Mein Konto'}
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

        <div>
          <span className={label}>{en ? 'Name' : 'Name'}</span>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className={field}
          />
        </div>

        <div>
          <span className={label}>{en ? 'Email' : 'E-Mail'}</span>
          <p className="px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-zinc-500 dark:text-zinc-400 break-all">
            {auth?.email ?? '—'}
          </p>
        </div>

        <div>
          <span className={label}>{en ? 'Gender' : 'Geschlecht'}</span>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setProfile({ ...profile, gender: option.value })}
                className={`px-3 py-2.5 rounded-2xl border-2 font-black text-xs cursor-pointer transition-all ${
                  profile.gender === option.value
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
                }`}
              >
                {en ? option.en : option.de}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={label}>{en ? 'Date of birth' : 'Geburtsdatum'}</span>
          <input
            type="date"
            value={profile.birthday}
            onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
            className={field}
          />
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!profile.name.trim()}
          className="w-full py-3 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {en ? 'Save' : 'Speichern'}
        </button>
      </div>
    </div>,
    document.body
  );
};
