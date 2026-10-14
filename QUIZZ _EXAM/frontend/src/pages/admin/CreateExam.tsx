import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { QuestionPaper } from '../../types';
import { ArrowLeft, Clock, ShieldCheck, Shuffle, Settings, AlertCircle, CheckCircle } from 'lucide-react';

interface CreateExamProps {
  initialPaperId?: string;
  onBack: () => void;
  onSuccess: (examId: string) => void;
}

export const CreateExam: React.FC<CreateExamProps> = ({
  initialPaperId,
  onBack,
  onSuccess
}) => {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('Please read all questions carefully. Time begins when admin launches exam.');
  const [selectedPaperId, setSelectedPaperId] = useState(initialPaperId || '');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [positiveMarks, setPositiveMarks] = useState(2.0);
  const [negativeMarking, setNegativeMarking] = useState(0.5);
  const [scheduledStartTime, setScheduledStartTime] = useState(
    new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [allowReturnPrevious, setAllowReturnPrevious] = useState(true);
  const [allowChangeAnswers, setAllowChangeAnswers] = useState(true);
  const [lateEntryAllowed, setLateEntryAllowed] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getPapers();
        setPapers(data);
        if (!selectedPaperId && data.length > 0) {
          setSelectedPaperId(data[0].id);
          setTitle(data[0].title + ' Official Exam');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch question papers');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePaperChange = (paperId: string) => {
    setSelectedPaperId(paperId);
    const p = papers.find((x) => x.id === paperId);
    if (p && !title) {
      setTitle(p.title + ' Official Exam');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaperId) {
      setError('Please select a question paper.');
      return;
    }
    if (durationMinutes <= 0) {
      setError('Duration must be greater than 0 minutes.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const exam = await api.createExam({
        title,
        description,
        paper_id: selectedPaperId,
        duration_minutes: durationMinutes,
        positive_marks: positiveMarks,
        negative_marking: negativeMarking,
        scheduled_start_time: new Date(scheduledStartTime).toISOString(),
        randomize_questions: randomizeQuestions,
        randomize_options: randomizeOptions,
        allow_return_previous: allowReturnPrevious,
        allow_change_answers: allowChangeAnswers,
        late_entry_allowed: lateEntryAllowed,
      });
      onSuccess(exam.id);
    } catch (err: any) {
      setError(err.message || 'Failed to publish examination');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPaper = papers.find((p) => p.id === selectedPaperId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Schedule New Examination</h2>
          <p className="text-xs text-slate-400">
            Publish an immutable examination session distributed in real-time to all 4 participants.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl bg-rose-950/60 border border-rose-800/60 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paper Selection Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span>1. Question Paper Selection</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Approved Question Paper
            </label>
            <select
              value={selectedPaperId}
              onChange={(e) => handlePaperChange(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-medium"
            >
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.total_questions} questions) - [{p.file_type?.toUpperCase() || 'TXT'}]
                </option>
              ))}
            </select>
          </div>

          {selectedPaper && (
            <div className="flex items-center space-x-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <span className="text-slate-400">Questions: <strong className="text-white font-mono">{selectedPaper.total_questions}</strong></span>
              <span className="text-slate-400">Status: <strong className="text-emerald-400">{selectedPaper.status}</strong></span>
              <span className="text-slate-400">Estimated Marks: <strong className="text-white font-mono">{selectedPaper.total_questions * positiveMarks}</strong></span>
            </div>
          )}
        </div>

        {/* General Exam Details */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span>2. Examination Details &amp; Timing</span>
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Examination Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Science Term Examination 2026"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Scheduled Start Time
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledStartTime}
              onChange={(e) => setScheduledStartTime(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Candidate Instructions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Scoring & Policy Rules */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Settings className="h-4 w-4 text-purple-400" />
            <span>3. Scoring &amp; Integrity Policies</span>
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Positive Marks per Question
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={positiveMarks}
                onChange={(e) => setPositiveMarks(parseFloat(e.target.value) || 1)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Negative Marking per Incorrect Question
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                required
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
            <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReturnPrevious}
                onChange={(e) => setAllowReturnPrevious(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 accent-blue-600"
              />
              <span className="text-slate-300 font-medium">Allow Return to Previous Questions</span>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={allowChangeAnswers}
                onChange={(e) => setAllowChangeAnswers(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 accent-blue-600"
              />
              <span className="text-slate-300 font-medium">Allow Modifying Selected Answers</span>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={lateEntryAllowed}
                onChange={(e) => setLateEntryAllowed(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 accent-blue-600"
              />
              <span className="text-slate-300 font-medium">Permit Authorized Late Entry</span>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={(e) => setRandomizeQuestions(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 accent-blue-600"
              />
              <span className="text-slate-300 font-medium">Randomize Question Sequence</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {submitting ? 'Publishing Immutable Session...' : 'Publish Examination'}
          </button>
        </div>
      </form>
    </div>
  );
};
