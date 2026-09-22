import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from './AuthGate';
import { AppLanguage } from '../utils/translations';

/** Log out (or Exit sandbox) — both return to the login home page. */
export const LogOutButton: React.FC<{ appLanguage: AppLanguage }> = ({ appLanguage }) => {
  const auth = useAuth();
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle');
  if (!auth) return null;

  const en = appLanguage === 'en';

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={state === 'working'}
        onClick={async () => {
          setState('working');
          const ok = await auth.leave();
          if (!ok) setState('failed');
        }}
        className="w-full py-3.5 bg-white dark:bg-[#252a35] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-sm rounded-2xl border-2 border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99] transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span>{auth.isSandbox ? (en ? 'Exit sandbox' : 'Sandbox verlassen') : en ? 'Log out' : 'Abmelden'}</span>
      </button>
      {state === 'failed' && (
        <p className="text-xs font-bold text-center text-rose-700 dark:text-rose-300">
          {en
            ? "Couldn't save your latest progress — you're probably offline. You're still logged in; try again once you're connected."
            : 'Dein Fortschritt konnte nicht gespeichert werden – vermutlich bist du offline. Du bist weiterhin angemeldet.'}
        </p>
      )}
    </div>
  );
};
