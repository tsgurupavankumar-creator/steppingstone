import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EvaluatedQuestionDetail } from '../../types';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  Bookmark,
  Lightbulb,
  Clock,
  Sparkles
} from 'lucide-react';

interface MistakeReviewProps {
  examId: string;
  participantId: string;
  onBackToReport: () => void;
}

export const MistakeReview: React.FC<MistakeReviewProps> = ({
  examId,
  participantId,
  onBackToReport
}) => {
  const [questions, setQuestions] = useState<EvaluatedQuestionDetail[]>([]);
  const [filterBy, setFilterBy] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [examTitle, setExamTitle] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);

  const loadMistakes = async () => {
    try {
      setLoading(true);
      const res = await api.getMistakesReview(examId, participantId, filterBy);
      setQuestions(res.questions || []);
      setExamTitle(res.exam_title || 'Examination');
      setCurrentIndex(0);
    } catch (err: any) {
      alert(err.message || 'Failed to load mistake review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMistakes();
  }, [examId, participantId, filterBy]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const blob = await api.downloadMistakesPdf(examId, participantId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Mistake_Review_${participantId}.pdf`;
      a.click();
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToReport}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              <span>Review Your Mistakes &amp; Solutions</span>
            </h2>
            <p className="text-xs text-slate-400">
              {examTitle} &bull; Candidate: <span className="font-mono text-white">{participantId}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition"
        >
          <Download className="h-4 w-4 text-blue-400" />
          <span>{downloading ? 'Downloading...' : 'Download Mistake PDF'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'all', label: 'All Questions' },
          { id: 'incorrect', label: 'Mistakes / Incorrect' },
          { id: 'correct', label: 'Correct Answers' },
          { id: 'unanswered', label: 'Unanswered' },
          { id: 'marked', label: 'Marked for Review' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterBy(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterBy === f.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading detailed question explanations...
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-12 text-center text-slate-400">
          <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-bold text-white text-base">No questions match this filter!</p>
          <p className="text-xs text-slate-500 mt-1">Select another filter above to view your questions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Question Review Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 font-bold font-mono text-sm border border-blue-500/30">
                  {currentQ.question_number}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-300">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs text-slate-500 ml-2 font-mono">
                    [{currentQ.topic}]
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                {currentQ.status === 'correct' && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>CORRECT (+{currentQ.marks_awarded})</span>
                  </span>
                )}
                {currentQ.status === 'incorrect' && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>INCORRECT ({currentQ.marks_awarded})</span>
                  </span>
                )}
                {currentQ.status === 'unanswered' && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>UNANSWERED (0)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Question Statement */}
            <p className="text-base sm:text-lg text-white font-medium leading-relaxed">
              {currentQ.question_text}
            </p>

            {/* 4 Options with Verification Styling */}
            <div className="grid sm:grid-cols-2 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const optText = currentQ[`option_${letter.toLowerCase()}` as keyof EvaluatedQuestionDetail] as string;
                const isSelected = currentQ.selected_option === letter;
                const isCorrect = currentQ.correct_answer === letter;

                let cardClasses = 'rounded-2xl border p-4 flex items-center justify-between transition ';
                let badgeClasses = 'flex h-8 w-8 items-center justify-center rounded-xl font-bold font-mono text-xs ';

                if (isCorrect) {
                  cardClasses += 'border-emerald-500 bg-emerald-950/30 text-emerald-100 ring-1 ring-emerald-500/50';
                  badgeClasses += 'bg-emerald-600 text-white';
                } else if (isSelected && !isCorrect) {
                  cardClasses += 'border-rose-500 bg-rose-950/30 text-rose-100 ring-1 ring-rose-500/50';
                  badgeClasses += 'bg-rose-600 text-white';
                } else {
                  cardClasses += 'border-slate-800 bg-slate-800/40 text-slate-400';
                  badgeClasses += 'bg-slate-800 text-slate-500';
                }

                return (
                  <div key={letter} className={cardClasses}>
                    <div className="flex items-center space-x-3">
                      <div className={badgeClasses}>{letter}</div>
                      <span className="text-xs sm:text-sm font-medium">{optText}</span>
                    </div>

                    <div className="text-[10px] font-bold uppercase tracking-wider">
                      {isCorrect && <span className="text-emerald-400">Correct Key</span>}
                      {isSelected && !isCorrect && <span className="text-rose-400">Your Answer</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation Section */}
            <div className="rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-400">
                <Lightbulb className="h-4 w-4" />
                <span>Explanation &amp; Solution Analysis:</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {currentQ.explanation ? currentQ.explanation : 'No specific explanation was provided for this question by the administrator.'}
              </p>
            </div>

            {/* Question Details Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Time Spent: <strong className="text-slate-300 font-mono">{currentQ.time_spent_seconds}s</strong></span>
                </span>
                <span>Topic: <strong className="text-slate-300">{currentQ.topic}</strong></span>
              </div>

              {/* Prev / Next */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                  className="inline-flex items-center space-x-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="inline-flex items-center space-x-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-30"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
