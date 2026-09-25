import React, { useState } from 'react';
import { Check, UserCircle2 } from 'lucide-react';
import { loadProfile, saveProfile, type Profile } from '../lib/profile';
import { useAuth } from './AuthGate';
import { AppLanguage } from '../utils/translations';

/**
 * Your name and a line about yourself, edited in place.
 *
 * The email is shown but not editable: it is the account you signed in with,
 * so changing it here would only make the two disagree.
 */
export const ProfileDetailsCard: React.FC<{ appLanguage: AppLanguage }> = ({ appLanguage }) => {
  const auth = useAuth();
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [saved, setSaved] = useState(false);
  const en = appLanguage === 'en';

  const commit = (next: Profile) => {
    setProfile(next);
    saveProfile({ ...next, setUp: true });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
          <UserCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
            {en ? 'Your details' : 'Deine Angaben'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">
            {auth?.email ?? (en ? 'Sandbox — nothing is saved' : 'Sandbox – nichts wird gespeichert')}
          </p>
        </div>
        {saved && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
      </div>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
          {en ? 'Name' : 'Name'}
        </span>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          onBlur={() => commit(profile)}
          placeholder={en ? 'What should the app call you?' : 'Wie soll die App dich nennen?'}
          className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-white outline-none font-bold text-sm"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
          {en ? 'About you' : 'Über dich'}
        </span>
        <input
          type="text"
          value={profile.about}
          onChange={(e) => setProfile({ ...profile, about: e.target.value })}
          onBlur={() => commit(profile)}
          placeholder={en ? 'Optional — a line about why you are learning' : 'Optional – warum du Deutsch lernst'}
          className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-white outline-none font-bold text-sm"
        />
      </label>

      <p className="text-[11px] font-semibold text-zinc-400">
        {en
          ? 'Your email comes from the account you signed in with and cannot be changed here.'
          : 'Deine E-Mail stammt aus deinem Konto und kann hier nicht geändert werden.'}
      </p>
    </div>
  );
};
