import React, { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from './AuthGate';
import { AppLanguage } from '../utils/translations';
import { LogOutButton } from './LogOutButton';

/**
 * Moving between the accounts signed in on this device, without Google.
 *
 * Only accounts whose session is still kept appear here; one that has been
 * logged out has to sign in properly again, which is what logging out is for.
 */
export const SwitchAccountButton: React.FC<{ appLanguage: AppLanguage }> = ({ appLanguage }) => {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const others = auth?.otherAccounts ?? [];
  const en = appLanguage === 'en';

  // No second account: just the way out, on its own.
  if (!auth) return null;
  if (auth.isSandbox || others.length === 0) return <LogOutButton appLanguage={appLanguage} />;

  return (
    <div className="space-y-2">
      {!open ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 py-3.5 bg-white dark:bg-[#252a35] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-sm rounded-2xl border-2 border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all"
          >
            <Users className="w-4 h-4" />
            <span>{en ? 'Switch' : 'Wechseln'}</span>
          </button>
          <div className="flex-1">
            <LogOutButton appLanguage={appLanguage} />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {others.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={!!busy}
              onClick={async () => {
                setBusy(account.email);
                setFailed(false);
                const ok = await auth.switchTo?.(account);
                if (!ok) {
                  setBusy(null);
                  setFailed(true);
                }
              }}
              className="w-full p-3 rounded-2xl bg-white dark:bg-[#252a35] border-2 border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-3 text-left cursor-pointer disabled:opacity-60"
            >
              {account.picture ? (
                <img src={account.picture} alt="" className="w-9 h-9 rounded-full shrink-0 object-cover" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 flex items-center justify-center font-black text-sm shrink-0">
                  {account.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">{account.name}</span>
                <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate">{account.email}</span>
              </span>
              {busy === account.email && <Loader2 className="w-4 h-4 animate-spin text-zinc-400 shrink-0" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-2.5 text-zinc-500 dark:text-zinc-400 font-black text-xs cursor-pointer"
          >
            {en ? 'Cancel' : 'Abbrechen'}
          </button>
        </div>
      )}

      {failed && (
        <p className="text-xs font-bold text-center text-rose-700 dark:text-rose-300">
          {en
            ? "Couldn't switch — your progress hasn't been saved yet. Try again once you're connected."
            : 'Wechsel nicht möglich – dein Fortschritt ist noch nicht gespeichert.'}
        </p>
      )}
    </div>
  );
};
