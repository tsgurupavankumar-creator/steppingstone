import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ParticipantComparisonData, Examination } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Download,
  Award,
  Clock,
  ArrowUpDown,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

interface ComparisonAnalyticsProps {
  examId: string;
  onSelectExam?: (id: string) => void;
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

export const ComparisonAnalytics: React.FC<ComparisonAnalyticsProps> = ({
  examId,
  onSelectExam
}) => {
  const [data, setData] = useState<any | null>(null);
  const [exams, setExams] = useState<Examination[]>([]);
  const [selectedExamId, setSelectedExamId] = useState(examId);
  const [sortBy, setSortBy] = useState('score');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadExams() {
      try {
        const list = await api.getExams();
        setExams(list);
      } catch {
        // ignore
      }
    }
    loadExams();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getComparisonAnalytics(selectedExamId, sortBy);
      setData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchAnalytics();
    }
  }, [selectedExamId, sortBy]);

  const handleDownloadCsv = async () => {
    try {
      setDownloading(true);
      const blob = await api.exportResultsCsv(selectedExamId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Exam_Results_${selectedExamId}.csv`;
      a.click();
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const blob = await api.exportResultsExcel(selectedExamId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Exam_Results_${selectedExamId}.xlsx`;
      a.click();
    } catch (err: any) {
      alert(err.message || 'Failed to export Excel');
    } finally {
      setDownloading(false);
    }
  };

  const participants: ParticipantComparisonData[] = data?.participants || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Award className="h-5 w-5 text-amber-400" />
            <span>Participant Comparison Dashboard (All 4 Candidates)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Comparative performance matrix, scoring charts, topic benchmarks, and official rankings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exam Selector */}
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              if (onSelectExam) onSelectExam(e.target.value);
            }}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none"
          >
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.status})
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none"
          >
            <option value="score">Sort by Score</option>
            <option value="percentage">Sort by Percentage</option>
            <option value="accuracy">Sort by Accuracy</option>
            <option value="time">Sort by Total Time</option>
          </select>

          {/* Export Buttons */}
          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            <span>CSV Export</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* Tie-breaking Documentation Alert */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-xs text-slate-400 flex items-center justify-between">
        <span>
          <strong className="text-slate-300">Tie-Breaking Rule: </strong>
          {data?.tie_breaking_policy || 'Primary: Marks obtained. Secondary: Accuracy. Tertiary: Total examination time.'}
        </span>
      </div>

      {/* Leaderboard Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        {participants.map((p, idx) => {
          const isWinner = p.rank === 1 && p.total_score > 0;
          return (
            <div
              key={p.participant_id}
              className={`rounded-2xl border p-4 transition shadow-lg ${
                isWinner
                  ? 'border-amber-500/60 bg-amber-950/20 shadow-amber-900/20'
                  : 'border-slate-800 bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 font-mono">
                  Rank #{p.rank || idx + 1}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.status}
                </span>
              </div>
              <h4 className="font-bold text-white text-base">{p.participant_id}</h4>
              <p className="text-[11px] text-slate-400 mb-3">{p.name}</p>

              <div className="flex items-baseline space-x-2">
                <span className="font-mono text-2xl font-black text-white">{p.total_score}</span>
                <span className="text-xs text-slate-400">/ {p.max_possible_marks} marks</span>
              </div>
              <div className="text-xs text-indigo-400 font-semibold mt-1">
                {p.percentage}% &bull; {p.accuracy}% Accuracy
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score & Percentage Bar Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">Total Marks Obtained vs Max Marks</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.marks || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="participant" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="score" name="Marks Obtained" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="max" name="Max Possible" fill="#334155" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Stacked Bar Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">Answer Distribution (Correct / Incorrect / Unanswered)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="participant" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="correct" name="Correct" stackId="a" fill="#10b981" />
                <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill="#ef4444" />
                <Bar dataKey="unanswered" name="Unanswered" stackId="a" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Comparison Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-4">Total Completion Time &amp; Average Time Per Question</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.time || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="participant" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="total_time_min" name="Total Time (Minutes)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="avg_time_sec" name="Avg Sec / Question" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Full Comparison Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">All 4 Participants Comprehensive Metric Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Marks Obtained</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Correct</th>
                <th className="py-3 px-4">Incorrect</th>
                <th className="py-3 px-4">Unanswered</th>
                <th className="py-3 px-4">Accuracy</th>
                <th className="py-3 px-4">Attempt Rate</th>
                <th className="py-3 px-4">Total Time</th>
                <th className="py-3 px-4">Avg / Q</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {participants.map((p) => {
                const totalMin = Math.floor(p.total_time_seconds / 60);
                const totalSec = Math.floor(p.total_time_seconds % 60);

                return (
                  <tr key={p.participant_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      #{p.rank}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {p.participant_id} <span className="text-slate-400 font-normal">({p.name})</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {p.total_score} / {p.max_possible_marks}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {p.percentage}%
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-mono font-semibold">
                      {p.correct_count}
                    </td>
                    <td className="py-3 px-4 text-rose-400 font-mono font-semibold">
                      {p.incorrect_count}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {p.unanswered_count}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {p.accuracy}%
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {p.attempt_rate}%
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {totalMin}m {totalSec}s
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {p.avg_time_per_question}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
