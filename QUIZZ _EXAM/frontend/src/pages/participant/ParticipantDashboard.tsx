import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Examination } from '../../types';
import { Navbar } from '../../components/Navbar';
import { WaitingRoom } from './WaitingRoom';
import { ExamInterface } from './ExamInterface';
import { ReportCard } from './ReportCard';
import { MistakeReview } from './MistakeReview';
import {
  User,
  Calendar,
  Clock,
  Award,
  Play,
  ArrowRight,
  Eye,
  FileText,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const ParticipantDashboard: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Examination[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Participant Views: 'dashboard' | 'waiting_room' | 'exam' | 'report' | 'mistakes'
  const [currentView, setCurrentView] = useState<'dashboard' | 'waiting_room' | 'exam' | 'report' | 'mistakes'>('dashboard');
  const [activeExam, setActiveExam] = useState<Examination | null>(null);
  const [activeReportExamId, setActiveReportExamId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allExams, hist] = await Promise.all([api.getExams(), api.getExamHistory()]);
      setExams(allExams);
      setHistory(hist);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentView]);

  const handleEnterExam = (exam: Examination) => {
    setActiveExam(exam);
    if (exam.status === 'live') {
      setCurrentView('exam');
    } else {
      setCurrentView('waiting_room');
    }
  };

  const handleOpenReport = (examId: string) => {
    setActiveReportExamId(examId);
    setCurrentView('report');
  };

  const handleOpenMistakes = (examId: string) => {
    setActiveReportExamId(examId);
    setCurrentView('mistakes');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar onNavigate={() => setCurrentView('dashboard')} />

      {/* Sub-view router */}
      {currentView === 'waiting_room' && activeExam && (
        <WaitingRoom
          exam={activeExam}
          participantId={user?.username || 'P001'}
          onExamStarted={() => setCurrentView('exam')}
          onBack={() => setCurrentView('dashboard')}
        />
      )}

      {currentView === 'exam' && activeExam && (
        <ExamInterface
          examId={activeExam.id}
          participantId={user?.username || 'P001'}
          onSubmitted={(examId) => {
            setActiveReportExamId(examId);
            setCurrentView('report');
          }}
        />
      )}

      {currentView === 'report' && activeReportExamId && (
        <ReportCard
          examId={activeReportExamId}
          participantId={user?.username || 'P001'}
          onReviewMistakes={(id) => handleOpenMistakes(id)}
          onBackToDashboard={() => setCurrentView('dashboard')}
        />
      )}

      {currentView === 'mistakes' && activeReportExamId && (
        <MistakeReview
          examId={activeReportExamId}
          participantId={user?.username || 'P001'}
          onBackToReport={() => setCurrentView('report')}
        />
      )}

      {currentView === 'dashboard' && (
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8">
          {/* Candidate Profile Header Card */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs uppercase font-mono font-bold tracking-wider text-indigo-400">
                    Candidate Profile
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {user?.full_name}
                  </h1>
                  <p className="text-xs text-slate-400 font-mono">
                    Participant ID: <strong className="text-white">{user?.username}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Isolated Private Session
                </span>
              </div>
            </div>
          </div>

          {/* Available Examinations Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                <span>Available &amp; Scheduled Examinations</span>
              </h2>
              <span className="text-xs text-slate-400">
                Simultaneous Session Distribution
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                  Loading examination sessions...
                </div>
              ) : exams.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400 text-xs">
                  No examinations scheduled at this time.
                </div>
              ) : (
                exams.map((exam) => {
                  const isLive = exam.status === 'live';
                  const isScheduled = exam.status === 'scheduled';
                  const isResultsReleased = exam.status === 'results_released';

                  return (
                    <div
                      key={exam.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              isLive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                                : isResultsReleased
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : isScheduled
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {exam.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {exam.duration_minutes} Mins
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-base mb-1">
                          {exam.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {exam.description || 'Simultaneous examination session.'}
                        </p>

                        <div className="text-[11px] text-slate-400 space-y-1">
                          <div>Questions: <strong className="text-white font-mono">{exam.total_questions}</strong></div>
                          <div>Positive: <strong className="text-emerald-400">+{exam.positive_marks}</strong> &bull; Negative: <strong className="text-rose-400">-{exam.negative_marking}</strong></div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-800">
                        {isLive && (
                          <button
                            onClick={() => handleEnterExam(exam)}
                            className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition"
                          >
                            <Play className="h-3.5 w-3.5 fill-white" />
                            <span>Enter Active Exam</span>
                          </button>
                        )}

                        {isScheduled && (
                          <button
                            onClick={() => handleEnterExam(exam)}
                            className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition"
                          >
                            <span>Enter Waiting Room</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {isResultsReleased && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleOpenReport(exam.id)}
                              className="flex-1 flex items-center justify-center space-x-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 py-2 text-xs font-semibold transition"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>Report Card</span>
                            </button>
                            <button
                              onClick={() => handleOpenMistakes(exam.id)}
                              className="flex-1 flex items-center justify-center space-x-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 py-2 text-xs font-semibold transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Mistakes</span>
                            </button>
                          </div>
                        )}

                        {exam.status === 'ended' && !isResultsReleased && (
                          <div className="text-center py-2 text-xs text-amber-400 font-semibold bg-amber-950/20 rounded-xl border border-amber-800/40">
                            Results Awaiting Release
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Past Released Results Section */}
          {history.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Award className="h-5 w-5 text-purple-400" />
                <span>My Released Examination Results</span>
              </h2>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
                    <tr>
                      <th className="py-3 px-4">Exam Title</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Accuracy</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {history.map((h, idx) => {
                      const res = h.my_result;
                      if (!res) return null;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-bold text-white">{h.exam.title}</td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {res.total_score} / {res.max_possible_marks}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">
                            {res.percentage}%
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                            {res.accuracy}%
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenReport(h.exam.id)}
                              className="inline-flex items-center space-x-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 text-xs font-semibold hover:bg-blue-500/20 transition"
                            >
                              <span>Report Card</span>
                            </button>
                            <button
                              onClick={() => handleOpenMistakes(h.exam.id)}
                              className="inline-flex items-center space-x-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 text-xs font-semibold hover:bg-purple-500/20 transition"
                            >
                              <span>Review Mistakes</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
};
