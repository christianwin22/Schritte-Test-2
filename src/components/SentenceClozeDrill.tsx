import React, { useState, useEffect, useRef } from 'react';
import { Volume2, BookOpen, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { WordEntry, EvaluationResult, SRSRating, SRSItemState, ClozeSentence } from '../types';
import { evaluateTypedAnswer } from '../utils/germanLinguistics';
import { UmlautHelper } from './UmlautHelper';
import { FeedbackSRSBar } from './FeedbackSRSBar';
import { speakGerman } from '../utils/speech';

interface SentenceClozeDrillProps {
  word: WordEntry;
  srsState: SRSItemState;
  onCompleteExercise: (evaluation: EvaluationResult, rating: SRSRating) => void;
}

export const SentenceClozeDrill: React.FC<SentenceClozeDrillProps> = ({
  word,
  srsState,
  onCompleteExercise,
}) => {
  const [userInput, setUserInput] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick sentence
  const sentenceList = word.exampleSentences || [];
  const currentSentence: ClozeSentence = sentenceList[selectedSentenceIndex] || {
    id: 'default',
    german: `Hier ist ein Beispielsatz für {{blank}}.`,
    english: `Here is an example sentence for ${word.translation}.`,
    targetWord: word.lemma,
  };

  useEffect(() => {
    setUserInput('');
    setEvaluation(null);
    setShowHint(false);
    // Pick random sentence if multiple
    if (sentenceList.length > 1) {
      setSelectedSentenceIndex(Math.floor(Math.random() * sentenceList.length));
    } else {
      setSelectedSentenceIndex(0);
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [word.id]);

  const handleUmlautInsert = (char: string) => {
    setUserInput((prev) => prev + char);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (evaluation || !userInput.trim()) return;

    // Check against targetWord and alternates
    let result = evaluateTypedAnswer(userInput, currentSentence.targetWord, {
      word,
      mode: 'cloze',
    });

    if (result.type === 'wrong' && currentSentence.alternateAcceptable?.length) {
      for (const alt of currentSentence.alternateAcceptable) {
        const altRes = evaluateTypedAnswer(userInput, alt, { word, mode: 'cloze' });
        if (altRes.type === 'exact' || altRes.score > result.score) {
          result = altRes;
          break;
        }
      }
    }

    setEvaluation(result);

    // Speak the full completed German sentence
    const completedGerman = currentSentence.german.replace(
      /\{\{blank\}\}/g,
      currentSentence.targetWord
    );
    speakGerman(completedGerman);
  };

  const handleSRSConfirm = (rating: SRSRating) => {
    if (!evaluation) return;
    onCompleteExercise(evaluation, rating);
  };

  // Render sentence with stylish blank placeholder
  const renderSentenceWithBlank = () => {
    const parts = currentSentence.german.split('{{blank}}');
    if (parts.length === 1) {
      return <span>{currentSentence.german}</span>;
    }

    return (
      <p className="text-xl sm:text-2xl font-bold leading-relaxed text-white">
        {parts[0]}
        <span className="inline-block mx-1.5 px-3 py-1 bg-blue-500/20 border-b-4 border-blue-400 text-blue-300 rounded font-black tracking-wide">
          {evaluation ? evaluation.expected : userInput || '_______'}
        </span>
        {parts[1]}
      </p>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6" id="sentence-cloze-drill">
      {/* Main Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/30 p-6 sm:p-10 space-y-8">
        {/* Decorative background ambient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              Sentence Cloze
            </span>
            <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-[10px] font-medium text-slate-300">
              {word.level} Level
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-medium">Lückentext</span>
          </div>
        </div>

        {/* Cloze Sentence Display */}
        <div className="space-y-4 py-2 text-center relative z-10">
          <span className="inline-block text-xs uppercase tracking-widest text-emerald-400 font-bold bg-emerald-500/15 px-3.5 py-1 rounded-full border border-emerald-500/30">
            Fill in the missing German word
          </span>

          <div className="py-4 px-6 rounded-2xl bg-slate-800/40 backdrop-blur-md border border-slate-700/60 text-center shadow-inner">
            {renderSentenceWithBlank()}
          </div>

          <div className="space-y-1">
            <p className="text-base sm:text-lg text-slate-300 italic font-medium">
              "{currentSentence.english}"
            </p>
            <p className="text-xs text-slate-400">
              Target meaning: <strong className="text-white">{word.translation}</strong> ({word.partOfSpeech})
            </p>
          </div>
        </div>

        {/* Form and Input */}
        {!evaluation ? (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                id="input-cloze-word"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type the missing German word..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full text-lg sm:text-xl font-semibold px-4 py-4 rounded-2xl border border-slate-700/80 bg-slate-800/60 backdrop-blur-md focus:bg-slate-800/90 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-hidden transition-all shadow-inner"
              />
            </div>

            {/* Umlauts toolbar & hint toggle */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <UmlautHelper onInsert={handleUmlautInsert} />

              <button
                type="button"
                id="btn-toggle-cloze-hint"
                onClick={() => setShowHint(!showHint)}
                className="text-xs font-medium text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showHint ? 'Hide Hint' : 'Need a hint?'}</span>
              </button>
            </div>

            {/* Hint Box */}
            {showHint && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 backdrop-blur-md">
                <strong className="text-amber-200">Clue:</strong> {currentSentence.hint || `Lemma: "${word.lemma}"`}
              </div>
            )}

            {/* Check Button */}
            <button
              type="submit"
              id="btn-submit-cloze"
              disabled={!userInput.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Verify Sentence</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Full Sentence Audio & Lemma Details */
          <div className="p-5 rounded-2xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-left space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                Full German Sentence:
              </span>
              <button
                type="button"
                onClick={() =>
                  speakGerman(currentSentence.german.replace(/\{\{blank\}\}/g, currentSentence.targetWord))
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-blue-400 border border-slate-700 transition-all cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen to Sentence</span>
              </button>
            </div>

            <p className="text-base font-semibold text-white">
              {currentSentence.german.replace(/\{\{blank\}\}/g, currentSentence.targetWord)}
            </p>

            {word.mnemonic && (
              <p className="text-xs text-slate-400 pt-1 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{word.mnemonic}</span>
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
