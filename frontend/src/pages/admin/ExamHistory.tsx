import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Examination } from '../../types';
import { History, Search, Download, Eye, FileSpreadsheet, Calendar, Clock } from 'lucide-react';

interface ExamHistoryProps {
  onSelectExam: (examId: string) => void;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({ onSelectExam }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getExamHistory();
        setHistory(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredHistory = history.filter((item) =>
    item.exam.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <History className="h-5 w-5 text-indigo-400" />
            <span>Complete Examination Archive &amp; History</span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable records of past examinations, participant evaluations, audit timestamps, and downloadable reports.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by exam title..."
            className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Exam Title</th>
                <th className="py-3 px-4">Conducted Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submissions</th>
                <th className="py-3 px-4">Average Score</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading historical examinations...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching examinations found in history.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const e = item.exam;
                  const resList = item.results || [];
                  const avgScore =
                    resList.length > 0
                      ? (resList.reduce((acc: number, cur: any) => acc + cur.total_score, 0) / resList.length).toFixed(1)
                      : 'N/A';

                  return (
                    <tr key={e.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">
                        {e.title}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {e.actual_start_time ? new Date(e.actual_start_time).toLocaleDateString() : 'Scheduled'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            e.status === 'results_released'
                              ? 'bg-purple-500/10 text-purple-400'
                              : e.status === 'ended'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {e.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {item.submitted_count} / {item.total_attempts || 4}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {avgScore} / {e.total_marks}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectExam(e.id)}
                          className="inline-flex items-center space-x-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 text-xs font-semibold transition"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Open Analytics</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
