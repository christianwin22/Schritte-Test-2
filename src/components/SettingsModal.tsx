import React from 'react';
import {
  X,
  Settings,
  Moon,
  Sun,
  Laptop,
  Volume2,
  VolumeX,
  Music,
  Bell,
  BellOff,
  Globe,
  RotateCcw,
  Volume1,
  Check,
} from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { speakGerman } from '../utils/speech';
import { AppLanguage, getTranslation } from '../utils/translations';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  themeMode?: ThemeMode;
  onSetThemeMode?: (mode: ThemeMode) => void;
  soundEnabled: boolean;
  musicEnabled?: boolean;
  notificationEnabled?: boolean;
  onToggleTheme?: () => void;
  onToggleSound: () => void;
  onToggleMusic?: () => void;
  onToggleNotification?: () => void;
  onResetProgress: () => void;
  appLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  themeMode = 'system',
  onSetThemeMode,
  soundEnabled,
  musicEnabled = false,
  notificationEnabled = true,
  onToggleTheme,
  onToggleSound,
  onToggleMusic,
  onToggleNotification,
  onResetProgress,
  appLanguage = 'en',
  onSelectLanguage,
}) => {
  const t = getTranslation(appLanguage);

  if (!isOpen) return null;

  const handleClose = () => {
    playSound('tap');
    onClose();
  };

  const handleSelectTheme = (mode: ThemeMode) => {
    playSound('tap');
    if (onSetThemeMode) {
      onSetThemeMode(mode);
    } else if (onToggleTheme) {
      onToggleTheme();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md bg-white dark:bg-[#2b303a] rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-zinc-200 dark:border-zinc-700 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-700/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-2xs">
              <Settings className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3
                id="settings-dialog-title"
                className="font-black text-lg text-zinc-900 dark:text-zinc-100 tracking-tight"
              >
                {t.settingsTitle}
              </h3>
              <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-400">
                {appLanguage === 'en' ? 'App preferences and audio' : 'App-Optionen und Audio'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Settings List */}
        <div className="space-y-3 py-1">
          {/* Setting 1: Language Switcher (Deutsch / English) */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.appLanguage}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {appLanguage === 'en' ? 'English (Default)' : 'Deutsch'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    playSound('tap');
                    onSelectLanguage('en');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    appLanguage === 'en'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {appLanguage === 'en' && <Check className="w-3 h-3" />}
                  <span>EN</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound('tap');
                    onSelectLanguage('de');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    appLanguage === 'de'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {appLanguage === 'de' && <Check className="w-3 h-3" />}
                  <span>DE</span>
                </button>
              </div>
            </div>
          </div>

          {/* Setting 2: Theme / Appearance (Light / Dark / System 3-way toggle) */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  {themeMode === 'system' ? (
                    <Laptop className="w-4 h-4" />
                  ) : isDark ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.appearance}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {themeMode === 'system'
                      ? (appLanguage === 'en' ? 'System Match (Auto)' : 'Systemstandard')
                      : isDark
                      ? (appLanguage === 'en' ? 'Slate Graphite Dark' : 'Dunkelmodus')
                      : t.lightMode}
                  </div>
                </div>
              </div>
            </div>

            {/* 3-way Selector: Light, Dark, System */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-200 dark:bg-zinc-700 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectTheme('light')}
                className={`py-1.5 px-2 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{appLanguage === 'en' ? 'Light' : 'Hell'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme('dark')}
                className={`py-1.5 px-2 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{appLanguage === 'en' ? 'Dark' : 'Dunkel'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme('system')}
                className={`py-1.5 px-2 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === 'system'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>{appLanguage === 'en' ? 'Auto' : 'Auto'}</span>
              </button>
            </div>
          </div>

          {/* Setting 3: Sound Effects */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.soundEffects}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {soundEnabled ? t.soundOn : t.soundMuted}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onToggleSound();
                if (!soundEnabled) playSound('correct');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                soundEnabled
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs dark:bg-white dark:text-zinc-950 dark:border-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Setting 4: Ambient Music / Lo-Fi Study Tone */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {appLanguage === 'en' ? 'Study Music' : 'Lernmusik'}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {musicEnabled
                    ? (appLanguage === 'en' ? 'Lo-Fi Ambient Drone ON' : 'Hintergrundmusik AN')
                    : (appLanguage === 'en' ? 'Music Off' : 'Musik AUS')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                if (onToggleMusic) {
                  onToggleMusic();
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                musicEnabled
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs dark:bg-white dark:text-zinc-950 dark:border-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
              }`}
            >
              {musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Setting 5: Notifications */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                {notificationEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {appLanguage === 'en' ? 'Daily Reminders' : 'Tages-Erinnerung'}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {notificationEnabled
                    ? (appLanguage === 'en' ? 'Active daily review alerts' : 'Tägliche Wiederholungen aktiv')
                    : (appLanguage === 'en' ? 'Alerts muted' : 'Stumm')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                if (onToggleNotification) {
                  onToggleNotification();
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                notificationEnabled
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs dark:bg-white dark:text-zinc-950 dark:border-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
              }`}
            >
              {notificationEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Setting 6: Audio TTS Voice Test */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center text-xs font-black">
                DE
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.germanTts}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t.nativeVoice}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                speakGerman('Willkommen bei Schritte International Neu!');
              }}
              className="px-3.5 py-1.5 bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 font-bold text-xs rounded-xl border border-zinc-300 dark:border-zinc-600 cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Volume1 className="w-3.5 h-3.5" />
              <span>{t.testVoice}</span>
            </button>
          </div>

          {/* Setting 7: Reset Progress */}
          <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-rose-900 dark:text-rose-200">{t.resetProgress}</div>
                <div className="text-xs text-rose-700/80 dark:text-rose-300/70 font-medium">
                  {t.resetProgressDesc}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  handleClose();
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.resetBtn}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Done button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3 bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-black text-sm rounded-2xl transition-all shadow-xs active:scale-[0.99] cursor-pointer"
          >
            {appLanguage === 'en' ? 'Done' : 'Fertig'}
          </button>
        </div>
      </div>
    </div>
  );
};
