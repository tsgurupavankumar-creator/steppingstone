import React from 'react';
import { Check, Bookmark, HelpCircle } from 'lucide-react';
import { SavedAnswer } from '../types';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  answers: Record<number, SavedAnswer>;
  onSelectQuestion: (index: number) => void;
  allowReturnPrevious?: boolean;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  totalQuestions,
  currentIndex,
  answers,
  onSelectQuestion,
  allowReturnPrevious = true
}) => {
  let answeredCount = 0;
  let markedCount = 0;

  for (let i = 1; i <= totalQuestions; i++) {
    const ans = answers[i];
    if (ans?.selected_option) answeredCount++;
    if (ans?.is_marked_for_review) markedCount++;
  }

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <h3 className="text-sm font-bold text-white tracking-wide">Question Palette</h3>
        <span className="text-xs text-slate-400 font-mono">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Legend & Summary Counters with icons */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-[11px]">
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
          <div className="flex items-center space-x-1 font-bold text-sm">
            <Check className="h-3.5 w-3.5" />
            <span>{answeredCount}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80">Answered</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-950/40 border border-purple-800/50 text-purple-300">
          <div className="flex items-center space-x-1 font-bold text-sm">
            <Bookmark className="h-3.5 w-3.5" />
            <span>{markedCount}</span>
          </div>
          <span className="text-[10px] text-purple-400/80">Marked</span>
        </div>

        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300">
          <div className="flex items-center space-x-1 font-bold text-sm">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{unansweredCount}</span>
          </div>
          <span className="text-[10px] text-slate-400">Unanswered</span>
        </div>
      </div>

      {/* Grid Palette */}
      <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-1">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const qNum = i + 1;
          const isCurrent = i === currentIndex;
          const ans = answers[qNum];
          const isAnswered = !!ans?.selected_option;
          const isMarked = !!ans?.is_marked_for_review;
          const isAccessible = allowReturnPrevious || i >= currentIndex;

          let btnClasses = 'border text-xs font-bold rounded-xl h-10 w-full flex items-center justify-center relative transition-all ';

          if (isCurrent) {
            btnClasses += 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 border-blue-400 ';
          }

          if (isMarked) {
            btnClasses += 'bg-purple-900/80 border-purple-600 text-purple-200 hover:bg-purple-800 ';
          } else if (isAnswered) {
            btnClasses += 'bg-emerald-900/80 border-emerald-600 text-emerald-200 hover:bg-emerald-800 ';
          } else {
            btnClasses += 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 ';
          }

          if (!isAccessible) {
            btnClasses += 'opacity-40 cursor-not-allowed ';
          }

          return (
            <button
              key={qNum}
              type="button"
              disabled={!isAccessible}
              onClick={() => onSelectQuestion(i)}
              className={btnClasses}
              title={`Question ${qNum}: ${isAnswered ? 'Answered' : 'Unanswered'}${isMarked ? ', Marked for review' : ''}`}
            >
              <span>{qNum}</span>
              {/* Icon badge */}
              {isMarked && (
                <Bookmark className="absolute top-1 right-1 h-2.5 w-2.5 text-purple-300 fill-purple-300" />
              )}
              {isAnswered && !isMarked && (
                <Check className="absolute top-1 right-1 h-2.5 w-2.5 text-emerald-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
