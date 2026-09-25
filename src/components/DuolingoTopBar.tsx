import React, { useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';
import { AppLogo } from './AppLogo';
import { useAuth } from './AuthGate';

interface DuolingoTopBarProps {
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
  canGoBack?: boolean;
  onBack?: () => void;
  onGoHome?: () => void;
  title?: string;
  appLanguage?: AppLanguage;
  currentTab?: string;
  /** Rendered on the right, before Back/Profile (the 'note an idea' button). */
  extraAction?: React.ReactNode;
}

/**
 * In the sandbox, a way out that sits in the bar itself.
 *
 * The tag at the foot of the screen can end up under the home indicator on a
 * phone, and the button on the Profile page is a scroll away. The bar is on
 * every screen and never moves, so the way out belongs here too.
 */
const SandboxExit: React.FC = () => {
  const auth = useAuth();
  const [asking, setAsking] = useState(false);
  if (!auth?.isSandbox) return null;

  if (asking) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void auth.leave()}
          className="px-2.5 h-8 sm:h-9 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-[11px] cursor-pointer"
        >
          Exit
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="px-2.5 h-8 sm:h-9 rounded-xl bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-100 font-black text-[11px] cursor-pointer"
        >
          Stay
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAsking(true)}
      title="Leave the sandbox"
      className="px-2.5 h-8 sm:h-9 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[11px] uppercase tracking-wider shadow-2xs active:scale-95 transition-all cursor-pointer"
    >
      Sandbox
    </button>
  );
};

export const DuolingoTopBar: React.FC<DuolingoTopBarProps> = ({
  onOpenProfile,
  canGoBack,
  onBack,
  onGoHome,
  title,
  appLanguage = 'en',
  currentTab = 'home',
  extraAction,
}) => {
  const t = getTranslation(appLanguage);
  const isInsideSection = Boolean(canGoBack || currentTab !== 'home');

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1f232c]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700/80 transition-colors">
      <div className="relative max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: App Logo (always clickable to jump Home) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              if (onGoHome) {
                onGoHome();
              }
            }}
            className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700/80 active:scale-95 transition-all cursor-pointer group"
            title="Go to Home"
            aria-label="Go to Home screen"
          >
            <AppLogo size="md" showText={false} />
          </button>
        </div>

        {/* Center: the title sits in the middle of the bar, whatever is beside it */}
        <div className="absolute left-1/2 -translate-x-1/2 max-w-[55%] px-2 text-center pointer-events-none">
          <span className="block truncate text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            {title || 'Deutsche Meister'}
          </span>
        </div>

        {/* Right: Profile on Main Home page; Back button inside any section */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          <SandboxExit />
          {extraAction}
          {isInsideSection ? (
            <button
              id="topbar-back-button"
              type="button"
              onClick={() => {
                playSound('tap');
                if (onBack) {
                  onBack();
                } else if (onGoHome) {
                  onGoHome();
                }
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white text-zinc-950 border border-zinc-300 dark:border-zinc-200 shadow-xs hover:bg-zinc-100 dark:hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title={appLanguage === 'en' ? 'Back' : 'Zurück'}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-zinc-950 stroke-[2.5]" />
            </button>
          ) : (
            <button
              id="topbar-profile-button"
              type="button"
              onClick={() => {
                playSound('tap');
                onOpenProfile();
              }}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-700/80 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer font-black text-xs"
              title={t.myProfileTitle || 'Profile'}
              aria-label="Open profile"
            >
              <User className="w-4 h-4 text-zinc-900 dark:text-zinc-100 stroke-[2.2] shrink-0" />
              <span className="hidden sm:inline">{t.myProfileTitle || 'Profile'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


