import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { loadProfile, saveProfile, type Gender, type Profile } from '../lib/profile';

import { useAuth } from './AuthGate';
import { AppLanguage } from '../utils/translations';

type Editing = null | 'name' | 'gender' | 'birthday';

const GENDERS: { value: Gender; en: string; de: string }[] = [
  { value: 'female', en: 'Female', de: 'Weiblich' },
  { value: 'male', en: 'Male', de: 'Männlich' },
];

/**
 * My account: a list of what is known about you, each line opening to be
 * changed. Nothing is typed until a line is tapped, which is how phones
 * normally handle this.
 */
export const AccountDialog: React.FC<{ appLanguage: AppLanguage; onClose: () => void }> = ({
  appLanguage,
  onClose,
}) => {
  const auth = useAuth();
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [editing, setEditing] = useState<Editing>(null);
  const en = appLanguage === 'en';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (editing ? setEditing(null) : onClose());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editing]);

  const commit = (next: Profile) => {
    setProfile(next);
    saveProfile({ ...next, setUp: true });
  };

  const genderLabel = GENDERS.find((g) => g.value === profile.gender);
  const rows: { key: Editing; label: string; value: string }[] = [
    { key: 'name', label: en ? 'Name' : 'Name', value: profile.name || (en ? 'Add' : 'Hinzufügen') },
    {
      key: 'gender',
      label: en ? 'Gender' : 'Geschlecht',
      value: genderLabel ? (en ? genderLabel.en : genderLabel.de) : en ? 'Add' : 'Hinzufügen',
    },
    {
      key: 'birthday',
      label: en ? 'Date of birth' : 'Geburtsdatum',
      value: profile.birthday || (en ? 'Add' : 'Hinzufügen'),
    },
  ];

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

        {/* The rows */}
        <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {rows.map((row, i) => (
            <button
              key={row.key}
              type="button"
              onClick={() => setEditing(row.key)}
              className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                i ? 'border-t border-zinc-200 dark:border-zinc-700' : ''
              }`}
            >
              <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">{row.label}</span>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={`text-sm font-black truncate ${row.value === 'Add' || row.value === 'Hinzufügen' ? 'text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {row.value}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
              </span>
            </button>
          ))}
          <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">
              {en ? 'Email' : 'E-Mail'}
            </span>
            <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 truncate">{auth?.email ?? '—'}</span>
          </div>
        </div>

        {/* Whichever line is open */}
        {editing === 'name' && (
          <input
            type="text"
            autoFocus
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            onBlur={() => {
              commit(profile);
              setEditing(null);
            }}
            className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-950 dark:border-white outline-none font-bold text-sm"
          />
        )}

        {editing === 'gender' && (
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  commit({ ...profile, gender: option.value });
                  setEditing(null);
                }}
                className={`px-3 py-3 rounded-2xl border-2 font-black text-sm cursor-pointer ${
                  profile.gender === option.value
                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
                }`}
              >
                {en ? option.en : option.de}
              </button>
            ))}
          </div>
        )}

        {editing === 'birthday' && (
          <input
            type="date"
            autoFocus
            value={profile.birthday}
            onChange={(e) => commit({ ...profile, birthday: e.target.value })}
            onBlur={() => setEditing(null)}
            className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-950 dark:border-white outline-none font-bold text-sm"
          />
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm cursor-pointer active:scale-[0.98] transition-all"
        >
          {en ? 'Done' : 'Fertig'}
        </button>
      </div>
    </div>,
    document.body
  );
};
