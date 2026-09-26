import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Volume2 } from 'lucide-react';
import { WordEntry } from '../types';
import { BLANK, fillBlank, weakAnswer, weakForm, weakSentence } from '../data/nounDrillSentences';
import { speakGerman } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { AppLanguage } from '../utils/translations';
import { LearnPager } from './LearnPager';

/**
 * Learn: only the nouns that change in the accusative — the article becomes
 * "den" and the noun itself takes an ending (der Kollege → den Kollegen).
 * One page per noun, turned with ← → on a Mac, or a tap / swipe on iPad and iPhone.
 */
interface NounChangeLearnProps {
  nouns: WordEntry[];
  where: string; // "A1 · L1"
  onGoToPractice: () => void;
  appLanguage?: AppLanguage;
}

export const NounChangeLearn: React.FC<NounChangeLearnProps> = ({ nouns, where, onGoToPractice, appLanguage = 'en' }) => {
  const en = appLanguage === 'en';
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const idsKey = nouns.map((n) => n.id).join(',');
  useEffect(() => {
    setIndex(0);
    setDone(false);
  }, [idsKey]);

  if (nouns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center font-bold text-zinc-500">
        {en ? 'No changing nouns in this lesson.' : 'Keine Nomen mit Änderung in dieser Lektion.'}
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">{en ? 'Learn round complete' : 'Lernrunde abgeschlossen'}</p>
        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
          {nouns.length} {en ? 'nouns' : 'Nomen'}
        </p>
        <div className="w-full max-w-xs flex gap-2">
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              setIndex(0);
              setDone(false);
            }}
            className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95"
          >
            {en ? 'Again' : 'Nochmal'}
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              onGoToPractice();
            }}
            className="flex-1 py-3 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
          >
            {en ? 'Go to Practice' : 'Zu den Übungen'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const noun = nouns[Math.min(index, nouns.length - 1)];
  const form = weakForm(noun) ?? noun.lemma;
  const ending = form.startsWith(noun.lemma) ? form.slice(noun.lemma.length) : '';
  const stem = ending ? noun.lemma : form;
  const sentence = fillBlank(weakSentence(noun), weakAnswer(noun));
  const [before, after = ''] = weakSentence(noun).split(BLANK);

  const speaker = (text: string, big = false) => (
    <button
      type="button"
      onClick={() => {
        playSound('tap');
        speakGerman(text);
      }}
      title={en ? 'Listen' : 'Anhören'}
      aria-label={en ? `Listen: ${text}` : `Anhören: ${text}`}
      className={`${big ? 'p-2.5' : 'p-1.5'} rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-all shrink-0`}
    >
      <Volume2 className={big ? 'w-5 h-5' : 'w-4 h-4'} />
    </button>
  );

  return (
    <LearnPager index={index} count={nouns.length} onChange={setIndex} onFinish={() => setDone(true)} className="flex-1 flex flex-col cursor-pointer">
      {/* The lesson bar above already says which lesson; the counter sits in the middle */}
      <div className="text-center text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider mb-2">
        {index + 1} / {nouns.length}
      </div>
      <div key={noun.id} className="flex-1 flex flex-col items-center justify-center gap-4 text-center animate-fadeIn">
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl tracking-tight">
            <span className="font-normal text-blue-600 dark:text-blue-400">der</span>{' '}
            <span className="font-black text-zinc-900 dark:text-zinc-100">{noun.lemma}</span>
          </span>
          {speaker(`der ${noun.lemma}`, true)}
        </div>
        <ArrowDown className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl tracking-tight">
            <span className="font-black text-emerald-600 dark:text-emerald-400">den</span>{' '}
            <span className="font-black text-zinc-900 dark:text-zinc-100">
              {stem}
              <span className="text-emerald-600 dark:text-emerald-400">{ending}</span>
            </span>
          </span>
          {speaker(`den ${form}`, true)}
        </div>
        <div className="mt-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-700/80 w-full max-w-sm flex items-center justify-center gap-2">
          <p className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
            {before}
            <strong>den {form}</strong>
            {after}
          </p>
          {speaker(sentence)}
        </div>
      </div>
    </LearnPager>
  );
};
