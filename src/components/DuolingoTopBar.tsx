import React from 'react';
import { ArrowLeft, Menu, Settings, User } from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';
import { AppLogo } from './AppLogo';

interface DuolingoTopBarProps {
  onOpenProfile: () => void;
  onOpenSettings?: () => void;
  canGoBack?: boolean;
  onBack?: () => void;
  onGoHome?: () => void;
  title?: string;
  appLanguage?: AppLanguage;
  currentTab?: string;
}

export const DuolingoTopBar: React.FC<DuolingoTopBarProps> = ({
  onOpenProfile,
  onOpenSettings,
  canGoBack,
  onBack,
  onGoHome,
  title,
  appLanguage = 'en',
  currentTab,
}) => {
  const t = getTranslation(appLanguage);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1f232c]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-700/80 transition-colors">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: App Logo (always clickable to jump Home) + Dedicated Back button when inside a section */}
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

          {canGoBack && onBack && (
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                onBack();
              }}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-700/90 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 active:scale-95 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer text-xs font-black"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-900 dark:text-zinc-100 stroke-[2.5] shrink-0" />
              <span className="hidden sm:inline">{appLanguage === 'en' ? 'Back' : 'Zurück'}</span>
            </button>
          )}
        </div>

        {/* Center: Title or Schritte International Neu */}
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

        {/* Right: Quick Settings + Profile Navigation buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 justify-end">
          {currentTab === 'profile' ? (
            /* When on Profile page, the top-right corner button leads directly to Full Settings Page */
            <button
              id="topbar-settings-button"
              type="button"
              onClick={() => {
                playSound('tap');
                if (onOpenSettings) {
                  onOpenSettings();
                }
              }}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700/80 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95 shadow-2xs flex items-center gap-2 cursor-pointer font-black text-xs"
              title={t.settingsTitle}
              aria-label={t.settingsTitle}
            >
              <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              <span className="hidden sm:inline">{t.settingsTitle}</span>
            </button>
          ) : currentTab === 'settings' ? (
            /* When on Settings page, top-right button allows quick switch to Profile */
            <button
              id="topbar-profile-menu"
              type="button"
              onClick={() => {
                playSound('tap');
                onOpenProfile();
              }}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700/80 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95 shadow-2xs flex items-center gap-2 cursor-pointer font-black text-xs"
              title={t.myProfileTitle || 'My Profile'}
              aria-label="Go to profile"
            >
              <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              <span className="hidden sm:inline">{t.myProfileTitle || 'Profile'}</span>
            </button>
          ) : (
            /* Default Home/Exercises: show both Settings and Profile */
            <>
              <button
                id="topbar-settings-button"
                type="button"
                onClick={() => {
                  playSound('tap');
                  if (onOpenSettings) {
                    onOpenSettings();
                  } else {
                    onOpenProfile();
                  }
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700/80 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95 shadow-2xs flex items-center justify-center cursor-pointer"
                title={t.settingsTitle}
                aria-label={t.settingsTitle}
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>

              <button
                id="topbar-profile-menu"
                type="button"
                onClick={() => {
                  playSound('tap');
                  onOpenProfile();
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700/80 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95 shadow-2xs flex items-center justify-center cursor-pointer"
                title={t.myProfileTitle || 'Profile & Stats'}
                aria-label="Open profile and stats"
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};


