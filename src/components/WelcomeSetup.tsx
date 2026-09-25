import React, { useState } from 'react';
import { loadProfile, saveProfile } from '../lib/profile';
import { AppLogo } from './AppLogo';

/**
 * Asked once, the first time an account opens the app.
 *
 * Only what the app actually uses: a name to greet you by. Everything else can
 * wait for Settings, and Skip is a real answer — the app works the same either
 * way, it just calls you by the front of your email instead.
 */
export const WelcomeSetup: React.FC<{ email: string | null; onDone: () => void }> = ({ email, onDone }) => {
  const [name, setName] = useState(() => loadProfile().name);

  const finish = (withName: string) => {
    saveProfile({ ...loadProfile(), name: withName.trim(), setUp: true });
    onDone();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#fafafa] text-zinc-900 flex items-center justify-center px-4 py-6 font-sans">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          finish(name);
        }}
        className="w-full max-w-sm bg-white rounded-3xl border-2 border-zinc-200 shadow-sm p-6 space-y-5"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <AppLogo size="xl" />
          <h1 className="text-xl font-black tracking-tight">Welcome</h1>
          <p className="text-xs font-bold text-zinc-500 break-all">{email}</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            What should we call you?
          </span>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border-2 border-zinc-200 focus:border-zinc-950 outline-none font-bold text-sm"
          />
        </label>

        <div className="space-y-2">
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3.5 bg-zinc-950 text-white font-black text-sm rounded-2xl cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Start learning
          </button>
          <button
            type="button"
            onClick={() => finish('')}
            className="w-full py-3 text-zinc-500 font-black text-xs cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        <p className="text-[11px] font-semibold text-zinc-400 text-center">
          You can change this any time in Settings.
        </p>
      </form>
    </div>
  );
};
