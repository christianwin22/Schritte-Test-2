import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';
import { AppLogo } from './AppLogo';

interface DuolingoTopBarProps {
  onOpenProfile: () => void;
  canGoBack?: boolean;
  onBack?: () => void;
  title?: string;
  appLanguage?: AppLanguage;
}

export const DuolingoTopBar: React.FC<DuolingoTopBarProps> = ({
  onOpenProfile,
  canGoBack,
  onBack,
  title,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Back Button when applicable or App Logo (icon only) */}
        <div className="flex items-center shrink-0 min-w-[40px]">
          {canGoBack && onBack ? (
            <button
              onClick={() => {
                playSound('tap');
                onBack();
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-900 dark:text-zinc-100 stroke-[2.5]" />
            </button>
          ) : (
            <AppLogo size="md" showText={false} />
          )}
        </div>

        {/* Center: Title (if viewing a section or active exercise) or Schritte International Neu A1-B1 */}
        {title ? (
          <div className="text-center truncate px-2">
            <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">
              {title}
            </span>
          </div>
        ) : (
          <div className="text-center px-1">
            <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              Schritte International Neu A1–B1
            </span>
          </div>
        )}

        {/* Right: 3-bar Hamburger Menu icon leading to Profile & Settings */}
        <div className="flex items-center shrink-0 min-w-[40px] justify-end">
          <button
            id="topbar-hamburger-menu"
            onClick={() => {
              playSound('tap');
              onOpenProfile();
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
            title={t.myProfileTitle || 'Profile & Settings'}
            aria-label="Open profile and settings"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-900 dark:text-zinc-100 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </header>
  );
};

