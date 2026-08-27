import React from 'react';
import {
  X,
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { speakGerman } from '../utils/speech';
import { AppLanguage, getTranslation } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  soundEnabled: boolean;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onResetProgress: () => void;
  appLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  soundEnabled,
  onToggleTheme,
  onToggleSound,
  onResetProgress,
  appLanguage,
  onSelectLanguage,
}) => {
  const t = getTranslation(appLanguage);

  if (!isOpen) return null;

  const handleClose = () => {
    playSound('tap');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Modal Container */}
      <div
        className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-zinc-200 dark:border-zinc-800 space-y-4 animate-fadeIn"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t.settingsTitle}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings List */}
        <div className="space-y-3 py-1">
          {/* Setting 1: Language Switcher (Deutsch / English) */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.appLanguage}</div>
                  <div className="text-xs text-zinc-400 font-medium">
                    {appLanguage === 'en' ? 'English' : 'Deutsch'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-700 p-1 rounded-xl">
                <button
                  onClick={() => {
                    playSound('tap');
                    onSelectLanguage('en');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    appLanguage === 'en'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => {
                    playSound('tap');
                    onSelectLanguage('de');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    appLanguage === 'de'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  DE
                </button>
              </div>
            </div>
          </div>

          {/* Setting 2: Theme / Appearance */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.appearance}</div>
                <div className="text-xs text-zinc-400 font-medium">
                  {isDark ? t.darkMode : t.lightMode}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                playSound('tap');
                onToggleTheme();
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                isDark
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
              }`}
            >
              {isDark ? 'Dark 🌙' : 'Light ☀️'}
            </button>
          </div>

          {/* Setting 3: Sound Effects */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.soundEffects}</div>
                <div className="text-xs text-zinc-400 font-medium">
                  {soundEnabled ? t.soundOn : t.soundMuted}
                </div>
              </div>
            </div>
            <button
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

          {/* Setting 4: Audio TTS Voice Test */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center text-xs font-black">
                DE
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.germanTts}</div>
                <div className="text-xs text-zinc-400 font-medium">{t.nativeVoice}</div>
              </div>
            </div>
            <button
              onClick={() => {
                speakGerman('Willkommen bei DeutschMeister Schritte International Neu!');
              }}
              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 font-bold text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 cursor-pointer"
            >
              {t.testVoice} 🔊
            </button>
          </div>

          {/* Setting 5: Reset Progress */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-300 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.resetProgress}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.resetProgressDesc}</div>
              </div>
              <button
                onClick={() => {
                  onResetProgress();
                  handleClose();
                }}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl active:scale-95 shadow-xs transition-all flex items-center gap-1 cursor-pointer dark:bg-white dark:text-zinc-950"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.resetBtn}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Done button */}
        <div className="pt-2">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-black text-sm rounded-xl transition-all shadow-xs active:scale-[0.99] cursor-pointer"
          >
            {appLanguage === 'en' ? 'Done' : 'Fertig'}
          </button>
        </div>
      </div>
    </div>
  );
};
