import React, { useState, useEffect, useRef } from 'react';
import { Volume2, BookOpen, Layers, Check, ArrowRight, HelpCircle } from 'lucide-react';
import { WordEntry, EvaluationResult, SRSRating, SRSItemState } from '../types';
import { evaluateTypedAnswer } from '../utils/germanLinguistics';
import { UmlautHelper } from './UmlautHelper';
import { FeedbackSRSBar } from './FeedbackSRSBar';
import { speakGerman } from '../utils/speech';

interface VerbConjugatorDrillProps {
  word: WordEntry;
  srsState: SRSItemState;
  onCompleteExercise: (evaluation: EvaluationResult, rating: SRSRating) => void;
}

type DrillTarget = 'participle' | 'present3rd' | 'preterite';

export const VerbConjugatorDrill: React.FC<VerbConjugatorDrillProps> = ({
  word,
  srsState,
  onCompleteExercise,
}) => {
  const [userInput, setUserInput] = useState('');
  const [drillTarget, setDrillTarget] = useState<DrillTarget>('participle');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const verb = word.verbDetails;

  // Determine target prompt based on available verb details
  useEffect(() => {
    setUserInput('');
    setEvaluation(null);
    setShowHint(false);

    // Randomize or pick participle as default
    if (verb?.pastParticiple) {
      setDrillTarget('participle');
    } else if (verb?.present3rd) {
      setDrillTarget('present3rd');
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [word.id]);

  const getTargetPrompt = () => {
    switch (drillTarget) {
      case 'participle':
        return {
          title: 'Partizip II (Past Participle)',
          instruction: `Type the Partizip II form of "${word.lemma}" (e.g. with ge- / prefix)`,
          expected: verb?.pastParticiple || '',
          hint: `Auxiliary: "${verb?.auxiliary || 'haben'}" + participle. ${verb?.isSeparable ? `Separable prefix: "${verb.separablePrefix}-"` : ''}`,
        };
      case 'present3rd':
        return {
          title: 'Präsens (3. Person Singular)',
          instruction: `Type the present form for "er / sie / es" for "${word.lemma}"`,
          expected: verb?.present3rd || '',
          hint: verb?.isSeparable ? `Remember separable prefix separates: "er ... ${verb.separablePrefix}"` : 'Watch for stem vowel shifts',
        };
      case 'preterite':
        return {
          title: 'Präteritum (Simple Past)',
          instruction: `Type the Präteritum (3. Person) for "${word.lemma}"`,
          expected: verb?.preterite || '',
          hint: 'Simple past stem',
        };
    }
  };

  const targetInfo = getTargetPrompt();

  const handleUmlautInsert = (char: string) => {
    setUserInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (evaluation || !userInput.trim()) return;

    const result = evaluateTypedAnswer(userInput, targetInfo.expected, {
      word,
      mode: 'verb',
      expectedAuxiliary: verb?.auxiliary,
    });

    setEvaluation(result);
    speakGerman(targetInfo.expected);
  };

  const handleSRSConfirm = (rating: SRSRating) => {
    if (!evaluation) return;
    onCompleteExercise(evaluation, rating);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6" id="verb-conjugator-drill">
      {/* Main Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/30 p-6 sm:p-10 space-y-8">
        {/* Decorative background ambient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-300 uppercase tracking-wider">
              Verb Conjugator
            </span>
            <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-[10px] font-medium text-slate-300">
              {word.level} Level
            </span>
            {verb?.isSeparable && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Trennbar ({verb.separablePrefix}-)
              </span>
            )}
            {verb?.auxiliary && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Perfekt: {verb.auxiliary}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-medium">Stammformen</span>
          </div>
        </div>

        {/* Lemma and Prompt */}
        <div className="text-center space-y-3 py-2 relative z-10">
          <span className="inline-block text-xs uppercase tracking-widest text-blue-400 font-bold bg-blue-500/15 px-3.5 py-1 rounded-full border border-blue-500/30">
            {targetInfo.title}
          </span>
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white">
              {word.lemma}
            </h2>
            <button
              type="button"
              id="btn-speak-verb-lemma"
              onClick={() => speakGerman(word.lemma)}
              title="Hear pronunciation"
              className="p-3 rounded-full bg-slate-800/60 border border-slate-700/80 text-slate-300 hover:text-blue-400 hover:border-blue-500/50 hover:bg-slate-700/60 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-lg sm:text-xl text-slate-300 font-medium italic">
            "{word.translation}"
          </p>
          <p className="text-sm text-slate-400 pt-1 font-medium">
            {targetInfo.instruction}
          </p>
        </div>

        {/* Input Form */}
        {!evaluation ? (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                id="input-verb-conjugation"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type the conjugated German form..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full text-lg sm:text-xl font-semibold px-4 py-4 rounded-2xl border border-slate-700/80 bg-slate-800/60 backdrop-blur-md focus:bg-slate-800/90 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-hidden transition-all shadow-inner"
              />
            </div>

            {/* Umlaut Helper Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <UmlautHelper onInsert={handleUmlautInsert} />

              <button
                type="button"
                id="btn-toggle-verb-hint"
                onClick={() => setShowHint(!showHint)}
                className="text-xs font-medium text-slate-400 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
              </button>
            </div>

            {/* Hint Box */}
            {showHint && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 backdrop-blur-md">
                <strong className="text-amber-200">Grammar Cue:</strong> {targetInfo.hint}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-verb-conjugation"
              disabled={!userInput.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Check Conjugation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Verb Details Summary */
          <div className="p-5 rounded-2xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-left space-y-3 relative z-10">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Verb Principal Forms (Stammformen):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block font-semibold">Präsens (3. P.):</span>
                <span className="font-bold text-white">
                  {verb?.present3rd || word.lemma}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block font-semibold">Präteritum:</span>
                <span className="font-bold text-white">
                  {verb?.preterite || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block font-semibold">Perfekt:</span>
                <span className="font-bold text-white">
                  {verb?.auxiliary} {verb?.pastParticiple}
                </span>
              </div>
            </div>

            {verb?.conjugationNotes && (
              <p className="text-xs text-slate-300 pt-1">
                <strong className="text-white">Notes:</strong> {verb.conjugationNotes}
              </p>
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
