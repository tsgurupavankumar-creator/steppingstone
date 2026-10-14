import React from 'react';
import { AlertCircle, CheckCircle, Bookmark, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  markedCount: number;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  unansweredCount,
  markedCount,
  isSubmitting,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Confirm Final Submission</h3>
            <p className="text-xs text-slate-400">Review your status before locking answers.</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2.5 rounded-xl bg-slate-800/60 p-4 border border-slate-700/50 mb-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Questions:</span>
            <span className="font-bold text-white font-mono">{totalQuestions}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>Answered Questions:</span>
            </div>
            <span className="font-bold font-mono">{answeredCount}</span>
          </div>
          <div className="flex items-center justify-between text-amber-400">
            <div className="flex items-center space-x-1.5">
              <HelpCircle className="h-4 w-4" />
              <span>Unanswered Questions:</span>
            </div>
            <span className="font-bold font-mono">{unansweredCount}</span>
          </div>
          <div className="flex items-center justify-between text-purple-400">
            <div className="flex items-center space-x-1.5">
              <Bookmark className="h-4 w-4" />
              <span>Marked for Review:</span>
            </div>
            <span className="font-bold font-mono">{markedCount}</span>
          </div>
        </div>

        {unansweredCount > 0 && (
          <div className="mb-5 rounded-lg bg-amber-950/40 border border-amber-700/50 p-3 text-xs text-amber-300">
            <strong>Notice:</strong> You still have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}. Once submitted, this attempt is permanently locked and evaluated.
          </div>
        )}

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
          >
            Return to Exam
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Evaluating Answers...' : 'Confirm Submission'}
          </button>
        </div>
      </div>
    </div>
  );
};
