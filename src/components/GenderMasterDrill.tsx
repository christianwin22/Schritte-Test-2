import React, { useState, useEffect } from 'react';
import { Volume2, BookOpen, Sparkles, Lightbulb } from 'lucide-react';
import { WordEntry, Gender, EvaluationResult, SRSRating, SRSItemState } from '../types';
import { evaluateGenderAnswer } from '../utils/germanLinguistics';
import { FeedbackSRSBar } from './FeedbackSRSBar';
import { speakGerman } from '../utils/speech';

interface GenderMasterDrillProps {
  word: WordEntry;
  srsState: SRSItemState;
  onCompleteExercise: (evaluation: EvaluationResult, rating: SRSRating) => void;
}

export const GenderMasterDrill: React.FC<GenderMasterDrillProps> = ({
  word,
  srsState,
  onCompleteExercise,
}) => {
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showMnemonic, setShowMnemonic] = useState<boolean>(false);

  const noun = word.nounDetails;
  const correctGender = noun?.gender || 'das';

  // Reset state when word changes
  useEffect(() => {
    setSelectedGender(null);
    setEvaluation(null);
    setShowMnemonic(false);
  }, [word.id]);

  // Keyboard shortcut listener for Der (1 or D), Die (2 or E), Das (3 or A)
  useEffect(() => {
    if (evaluation) return; // Rating shortcuts handled by FeedbackSRSBar

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'd') {
        e.preventDefault();
        handleSelectGender('der');
      } else if (key === '2' || key === 'e' || key === 'i') {
        e.preventDefault();
        handleSelectGender('die');
      } else if (key === '3' || key === 'a' || key === 's') {
        e.preventDefault();
        handleSelectGender('das');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [evaluation, word]);

  const handleSelectGender = (gender: Gender) => {
    if (evaluation) return;
    setSelectedGender(gender);
    const result = evaluateGenderAnswer(gender, correctGender, word);
    setEvaluation(result);
    // Auto speak correct full noun phrase
    speakGerman(`${correctGender} ${word.lemma}`);
  };

  const handleSRSConfirm = (rating: SRSRating) => {
    if (!evaluation) return;
    onCompleteExercise(evaluation, rating);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6" id="gender-master-drill">
      {/* Main Noun Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/30 p-6 sm:p-10 text-center space-y-8">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Level & Category Header */}
        <div className="flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider">
              Gender Master
            </span>
            <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-[10px] font-medium text-slate-300">
              {word.level} Level
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-medium capitalize">{word.partOfSpeech}</span>
          </div>
        </div>

        {/* Target Lemma & Audio */}
        <div className="space-y-3 py-2 relative z-10">
          <p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
            Select the correct definite article
          </p>
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white">
              {word.lemma}
            </h2>
            <button
              type="button"
              id="btn-pronounce-lemma"
              onClick={() => speakGerman(word.lemma)}
              title="Hear German pronunciation"
              className="p-3 rounded-full bg-slate-800/60 border border-slate-700/80 text-slate-300 hover:text-blue-400 hover:border-blue-500/50 hover:bg-slate-700/60 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-lg sm:text-xl text-slate-300 font-medium italic">
            "{word.translation}"
          </p>
        </div>

        {/* 3 Color-Coded Article Selection Buttons */}
        {!evaluation ? (
          <div className="space-y-4 relative z-10">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* DER (Masculine / Blue) */}
              <button
                type="button"
                id="btn-article-der"
                onClick={() => handleSelectGender('der')}
                className="group relative flex flex-col items-center justify-center py-4 sm:py-5 px-4 rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-md hover:border-blue-500 hover:bg-blue-500/15 text-blue-400 hover:text-blue-300 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">der</span>
                <span className="text-[11px] font-medium text-slate-400 group-hover:text-blue-300 mt-1">Maskulin [1]</span>
              </button>

              {/* DIE (Feminine / Pink) */}
              <button
                type="button"
                id="btn-article-die"
                onClick={() => handleSelectGender('die')}
                className="group relative flex flex-col items-center justify-center py-4 sm:py-5 px-4 rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-md hover:border-pink-500 hover:bg-pink-500/15 text-pink-400 hover:text-pink-300 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">die</span>
                <span className="text-[11px] font-medium text-slate-400 group-hover:text-pink-300 mt-1">Feminin [2]</span>
              </button>

              {/* DAS (Neuter / Emerald Green) */}
              <button
                type="button"
                id="btn-article-das"
                onClick={() => handleSelectGender('das')}
                className="group relative flex flex-col items-center justify-center py-4 sm:py-5 px-4 rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-md hover:border-emerald-500 hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">das</span>
                <span className="text-[11px] font-medium text-slate-400 group-hover:text-emerald-300 mt-1">Neutrum [3]</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Shortcuts: Press <strong>1</strong> (der), <strong>2</strong> (die), <strong>3</strong> (das) on your keyboard.
            </p>
          </div>
        ) : (
          /* Revealed Plural & Linguistic Breakdown */
          <div className="p-5 rounded-2xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-left space-y-3 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Singular:
                </span>
                <p className="text-lg font-bold text-white flex items-center gap-1.5">
                  <span
                    className={`font-black ${
                      correctGender === 'der'
                        ? 'text-blue-400'
                        : correctGender === 'die'
                        ? 'text-pink-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {correctGender}
                  </span>{' '}
                  {word.lemma}
                </p>
              </div>

              {noun?.plural && (
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Plural form:
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-white">
                      {noun.plural}
                    </p>
                    <button
                      type="button"
                      onClick={() => speakGerman(noun.plural)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  {noun.pluralEndingHint && (
                    <span className="text-xs text-slate-400">
                      Pattern: {noun.pluralEndingHint}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Gender Rule / Suffix Hint */}
            {noun?.genderRuleHint && (
              <div className="pt-2 border-t border-slate-700/60 flex items-start gap-2 text-xs text-slate-300">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Grammar Rule:</strong>{' '}
                  {noun.genderRuleHint}
                </p>
              </div>
            )}

            {/* Memory Mnemonic */}
            {word.mnemonic && (
              <div className="pt-1 flex items-start gap-2 text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Mnemonic:</strong>{' '}
                  {word.mnemonic}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SRS Feedback Bar */}
      {evaluation && (
        <FeedbackSRSBar
          evaluation={evaluation}
          word={word}
          srsState={srsState}
          onRate={handleSRSConfirm}
          onNext={() => handleSRSConfirm(evaluation.suggestedRating)}
        />
      )}
    </div>
  );
};
