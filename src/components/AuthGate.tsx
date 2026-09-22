import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { restoreForUser, signOutAndClear, startAutoSync } from '../lib/progressSync';
import { LoginScreen, friendlyAuthError } from './LoginScreen';

interface AuthContextValue {
  email: string | null;
  /** Using the app without an account: progress lives in this browser only. */
  isGuest: boolean;
  /** Saves, clears this browser and signs out. Resolves false if the final save failed. */
  signOut: () => Promise<boolean>;
  /** Guest only: back to the sign-in screen. This browser's progress is kept. */
  logInInstead: () => void;
}

// Remembers "continue as guest" so reopening the app doesn't ask again.
// Outside the synced key families on purpose.
const GUEST_KEY = 'cpa_guest';

function readGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** The signed-in account, for screens that show it (Settings). Null outside the gate. */
export const useAuth = () => useContext(AuthContext);

type Phase = 'checking' | 'signed-out' | 'restoring' | 'ready' | 'restore-failed';

/** A refused Google sign-in or an expired email link comes back as ?error_description=… — read it once, then tidy the URL. */
function takeAuthErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = params.get('error_description') || hash.get('error_description');
  if (!description) return null;
  window.history.replaceState(null, '', window.location.pathname);
  return friendlyAuthError(description);
}

const Splash: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-[100dvh] w-full bg-[#fafafa] dark:bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400 font-sans">
    <Loader2 className="w-6 h-6 animate-spin" />
    <p className="text-xs font-bold">{label}</p>
  </div>
);

/**
 * Nothing inside renders until someone is signed in and their saved progress
 * has been copied into this browser. The app's screens read that progress on
 * mount, so restoring first means they start with the right data.
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>('checking');
  const [urlError] = useState(takeAuthErrorFromUrl);
  const [isGuest, setIsGuest] = useState(readGuestFlag);
  const restoredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setPhase('signed-out');
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase asks that no other Supabase call runs inside this callback, so defer.
      setTimeout(() => {
        setSession(next);
        if (!next) {
          restoredFor.current = null;
          setPhase('signed-out');
          return;
        }
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
        if (restoredFor.current === next.user.id) return; // token refresh, same person
        restoredFor.current = next.user.id;
        setPhase('restoring');
        restoreForUser(next.user.id)
          .then(() => setPhase('ready'))
          .catch((err) => {
            console.error('Could not load saved progress', err);
            restoredFor.current = null;
            setPhase('restore-failed');
          });
      }, 0);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (phase !== 'ready' || !userId) return;
    return startAutoSync(userId);
  }, [phase, userId]);

  if (phase === 'checking') return <Splash label="Loading…" />;
  if (phase === 'restoring') return <Splash label="Loading your progress…" />;

  if (!userId && isGuest) {
    const guest: AuthContextValue = {
      email: null,
      isGuest: true,
      signOut: async () => true,
      logInInstead: () => {
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
      },
    };
    return <AuthContext.Provider value={guest}>{children}</AuthContext.Provider>;
  }

  if (phase === 'signed-out' || !userId) {
    return (
      <LoginScreen
        initialError={urlError}
        onContinueAsGuest={() => {
          localStorage.setItem(GUEST_KEY, '1');
          setIsGuest(true);
        }}
      />
    );
  }

  if (phase === 'restore-failed') {
    return (
      <div className="min-h-[100dvh] w-full bg-[#fafafa] dark:bg-zinc-950 flex items-center justify-center px-4 font-sans">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 p-6 text-center space-y-3">
          <WifiOff className="w-6 h-6 mx-auto text-zinc-500" />
          <p className="font-black text-zinc-900 dark:text-zinc-100">Couldn't load your progress</p>
          <p className="text-xs font-medium text-zinc-500">Check your internet connection, then try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const value: AuthContextValue = {
    email: session?.user.email ?? null,
    isGuest: false,
    logInInstead: () => {},
    signOut: async () => {
      const ok = await signOutAndClear(userId);
      if (ok) window.location.reload();
      return ok;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
