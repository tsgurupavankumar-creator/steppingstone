import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Question, ValidationIssue } from '../../types';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  FileCheck,
  HelpCircle
} from 'lucide-react';

interface PaperValidationPreviewProps {
  paperId: string;
  onBack: () => void;
  onCreateExam: (paperId: string) => void;
}

export const PaperValidationPreview: React.FC<PaperValidationPreviewProps> = ({
  paperId,
  onBack,
  onCreateExam
}) => {
  const [paperTitle, setPaperTitle] = useState('');
  const [paperDescription, setPaperDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPaper = async () => {
    try {
      setLoading(true);
      const data = await api.getPaperDetails(paperId);
      setPaperTitle(data.paper.title);
      setPaperDescription(data.paper.description || '');
      setQuestions(data.questions || []);
      setIssues(data.issues || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load paper details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaper();
  }, [paperId]);

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      question_number: questions.length + 1,
      question_text: 'New Question Statement',
      option_a: 'Option A',
      option_b: 'Option B',
      option_c: 'Option C',
      option_d: 'Option D',
      correct_answer: 'A',
      explanation: '',
      marks: 1.0,
      negative_marks: 0.0,
      topic: 'General',
      difficulty: 'Medium',
    };
    setQuestions([...questions, newQ]);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('A question paper must have at least one question.');
      return;
    }
    const updated = questions.filter((_, idx) => idx !== index).map((q, idx) => ({
      ...q,
      question_number: idx + 1,
    }));
    setQuestions(updated);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // Recalculate numbers
    setQuestions(updated.map((q, idx) => ({ ...q, question_number: idx + 1 })));
  };

  const handleSaveAndApprove = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.updatePaper(paperId, {
        title: paperTitle,
        description: paperDescription,
        questions,
      });
      setQuestions(res.questions);
      setIssues(res.issues);
      if (res.errors_count === 0) {
        setStatusMessage('Paper successfully validated, approved, and ready for examinations!');
      } else {
        setStatusMessage(`Paper saved. Note: ${res.errors_count} validation error(s) still require correction.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save paper');
    } finally {
      setSaving(false);
    }
  };

  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Back to Papers"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>Paper Validation &amp; Preview Screen</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {questions.length} Questions
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Verify question statements, options, answer keys, and explanations before publishing.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSaveAndApprove}
            disabled={saving}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save & Approve Paper'}</span>
          </button>
          <button
            onClick={() => onCreateExam(paperId)}
            disabled={errorsCount > 0}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition disabled:opacity-40"
          >
            <FileCheck className="h-4 w-4" />
            <span>Schedule Examination</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-950/60 border border-emerald-700/60 p-3 text-xs text-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-2 rounded-xl bg-rose-950/60 border border-rose-800/60 p-3 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Validation Status Summary Card */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400">Validation Status</span>
          <div className="mt-1 flex items-center space-x-2">
            {errorsCount === 0 ? (
              <span className="text-emerald-400 font-bold text-sm flex items-center space-x-1">
                <CheckCircle className="h-4 w-4" />
                <span>All Questions Validated</span>
              </span>
            ) : (
              <span className="text-rose-400 font-bold text-sm flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4" />
                <span>{errorsCount} Critical Errors Detected</span>
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400">Total Validated Questions</span>
          <div className="mt-1 font-mono font-bold text-lg text-white">
            {questions.length} Questions
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xs text-slate-400">Warnings / Recommendations</span>
          <div className="mt-1 font-mono font-bold text-lg text-amber-400">
            {warningsCount} Warnings
          </div>
        </div>
      </div>

      {/* Issues List Alert */}
      {issues.length > 0 && (
        <div className="rounded-2xl border border-amber-800/50 bg-amber-950/20 p-4">
          <h4 className="text-xs font-bold text-amber-300 flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Validation Findings &amp; Parsing Alerts ({issues.length})</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-amber-200/90 max-h-36 overflow-y-auto pr-1">
            {issues.map((iss, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${iss.severity === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  Q{iss.question_number}
                </span>
                <span>{iss.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Paper Metadata Edit */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Examination Paper Title</label>
          <input
            type="text"
            value={paperTitle}
            onChange={(e) => setPaperTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Instructions / Description</label>
          <textarea
            rows={2}
            value={paperDescription}
            onChange={(e) => setPaperDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Questions ({questions.length})
          </h3>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span>Add Question</span>
          </button>
        </div>

        {questions.map((q, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-5 transition-all shadow-md ${
              q.has_warning
                ? 'border-amber-700/60 bg-slate-900/90'
                : 'border-slate-800 bg-slate-900/80'
            }`}
          >
            {/* Question Header & Order Controls */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 font-bold font-mono text-xs border border-blue-500/30">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Question #{idx + 1}
                </span>
                {q.warning_message && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                    {q.warning_message}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveQuestion(idx, 'up')}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  title="Move Up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === questions.length - 1}
                  onClick={() => handleMoveQuestion(idx, 'down')}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition"
                  title="Move Down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuestion(idx)}
                  className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
                  title="Delete Question"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Question Statement */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Question Statement
              </label>
              <textarea
                rows={2}
                value={q.question_text}
                onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 p-3 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* 4 Options Grid */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                const optKey = `option_${letter}` as keyof Question;
                const isSelectedAnswer = q.correct_answer === letter.toUpperCase();
                return (
                  <div
                    key={letter}
                    className={`rounded-xl border p-2.5 transition ${
                      isSelectedAnswer
                        ? 'border-emerald-600 bg-emerald-950/20'
                        : 'border-slate-700/80 bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-300 uppercase">
                        Option {letter.toUpperCase()}
                      </span>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-[11px]">
                        <input
                          type="radio"
                          name={`correct_${idx}`}
                          checked={isSelectedAnswer}
                          onChange={() => handleQuestionChange(idx, 'correct_answer', letter.toUpperCase())}
                          className="accent-emerald-500"
                        />
                        <span className={isSelectedAnswer ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          Correct Key
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={q[optKey] as string}
                      onChange={(e) => handleQuestionChange(idx, optKey, e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>
                );
              })}
            </div>

            {/* Explanations & Metadata */}
            <div className="grid sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Explanation of Correct Answer
                </label>
                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                  placeholder="Provide step-by-step reasoning"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Topic</label>
                <input
                  type="text"
                  value={q.topic || 'General'}
                  onChange={(e) => handleQuestionChange(idx, 'topic', e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Marks (+ / -)</label>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={q.marks}
                    onChange={(e) => handleQuestionChange(idx, 'marks', parseFloat(e.target.value) || 1)}
                    className="w-1/2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white outline-none"
                    title="Positive Marks"
                  />
                  <input
                    type="number"
                    step="0.25"
                    value={q.negative_marks}
                    onChange={(e) => handleQuestionChange(idx, 'negative_marks', parseFloat(e.target.value) || 0)}
                    className="w-1/2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white outline-none"
                    title="Negative Marks"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
