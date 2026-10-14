import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EvaluationResult, Examination } from '../../types';
import {
  Award,
  Download,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  FileText
} from 'lucide-react';

interface ReportCardProps {
  examId: string;
  participantId: string;
  onReviewMistakes: (examId: string) => void;
  onBackToDashboard: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  examId,
  participantId,
  onReviewMistakes,
  onBackToDashboard
}) => {
  const [data, setData] = useState<{
    exam: Examination;
    participant_name: string;
    result: EvaluationResult;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const res = await api.getReportCard(examId, participantId);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load report card. Results may not be released yet.');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [examId, participantId]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const blob = await api.downloadReportCardPdf(examId, participantId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_Card_${participantId}.pdf`;
      a.click();
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white">
        <p className="text-sm font-semibold">Generating your performance report card...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Results Pending Release</h3>
          <p className="text-xs text-slate-400 mb-6">
            {error || 'The administrator has not yet released the examination results. Please check back shortly.'}
          </p>
          <button
            onClick={onBackToDashboard}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-bold text-white transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { exam, participant_name, result } = data;
  const totalMin = Math.floor(result.total_time_seconds / 60);
  const totalSec = Math.floor(result.total_time_seconds % 60);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition"
          >
            <Download className="h-4 w-4 text-blue-400" />
            <span>{downloading ? 'Downloading...' : 'Download PDF Report'}</span>
          </button>
          <button
            onClick={() => onReviewMistakes(examId)}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition"
          >
            <span>Review My Mistakes</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Official Examination Result
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 mb-2">
              {exam.title}
            </h1>
            <p className="text-xs text-slate-400">
              Candidate: <strong className="text-white">{participantId}</strong> ({participant_name}) &bull; Date: {exam.actual_start_time ? new Date(exam.actual_start_time).toLocaleDateString() : 'Today'}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="font-mono text-4xl sm:text-5xl font-black text-white">
              {result.total_score} <span className="text-xl sm:text-2xl text-slate-500 font-normal">/ {result.max_possible_marks}</span>
            </div>
            <div className="text-base font-bold text-emerald-400 mt-1">
              {result.percentage}% Final Score
            </div>
          </div>
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Accuracy Rate</span>
            <Award className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{result.accuracy}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Correct / Attempted</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Attempt Rate</span>
            <FileText className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{result.attempt_rate}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Attempted / Total</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Time Taken</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalMin}m {totalSec}s
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active test time</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Average / Question</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{result.avg_time_per_question}s</div>
          <p className="text-[11px] text-slate-500 mt-1">Per question average</p>
        </div>
      </div>

      {/* Answer Distribution Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-5 flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-300">{result.correct_count}</div>
            <div className="text-xs text-emerald-400/80 font-medium">Correct Questions</div>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-5 flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-rose-300">{result.incorrect_count}</div>
            <div className="text-xs text-rose-400/80 font-medium">Incorrect Questions</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-300">{result.unanswered_count}</div>
            <div className="text-xs text-slate-400 font-medium">Unanswered Questions</div>
          </div>
        </div>
      </div>

      {/* Topic-Wise Breakdown Table */}
      {result.topic_breakdown && result.topic_breakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Topic-Wise Performance Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Topic Area</th>
                  <th className="py-3 px-4">Total Questions</th>
                  <th className="py-3 px-4">Correct</th>
                  <th className="py-3 px-4">Incorrect</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {result.topic_breakdown.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-white">{t.topic}</td>
                    <td className="py-3 px-4 font-mono">{t.total}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{t.correct}</td>
                    <td className="py-3 px-4 font-mono text-rose-400">{t.incorrect}</td>
                    <td className="py-3 px-4 font-mono text-white font-bold">{t.score} / {t.max_score}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">{t.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
