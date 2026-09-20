import React from 'react';
import { ShieldCheck, Zap, Split, Sparkles } from 'lucide-react';
import { ExerciseMode } from '../types';

interface ModeSelectorProps {
  currentMode: ExerciseMode;
  onSelectMode: (mode: ExerciseMode) => void;
  nounCount: number;
  verbCount: number;
  clozeCount: number;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  nounCount,
  verbCount,
  clozeCount,
}) => {
  const modes: { id: ExerciseMode; label: string; sub: string; count: number; icon: React.ReactNode; color: string }[] = [
    {
      id: 'gender',
      label: 'Gender Master',
      sub: 'der / die / das drill',
      count: nounCount,
      icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
      color: 'blue',
    },
    {
      id: 'conjugator',
      label: 'Verb Conjugator',
      sub: 'Partizip II & Stammformen',
      count: verbCount,
      icon: <Zap className="w-4 h-4 text-purple-500" />,
      color: 'purple',
    },
    {
      id: 'cloze',
      label: 'Sentence Cloze',
      sub: 'Contextual Lückentext',
      count: clozeCount,
      icon: <Split className="w-4 h-4 text-emerald-500" />,
      color: 'emerald',
    },
    {
      id: 'mixed',
      label: 'Smart SRS Mixed',
      sub: 'Due words auto-rotation',
      count: nounCount + verbCount,
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      color: 'amber',
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto" id="exercise-mode-selector">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/40 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-700/50 shadow-lg shadow-black/20">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              id={`btn-mode-${m.id}`}
              onClick={() => onSelectMode(m.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all cursor-pointer text-center ${
                isActive
                  ? 'bg-slate-800/80 border border-slate-600/60 shadow-md text-white'
                  : 'hover:bg-slate-800/40 border border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {m.icon}
                <span
                  className={`text-xs font-bold ${
                    isActive ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {m.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 font-medium line-clamp-1">
                {m.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
