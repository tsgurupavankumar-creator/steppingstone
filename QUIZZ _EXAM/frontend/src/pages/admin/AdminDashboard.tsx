import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { QuestionPapers } from './QuestionPapers';
import { PaperValidationPreview } from './PaperValidationPreview';
import { CreateExam } from './CreateExam';
import { LiveExamMonitoring } from './LiveExamMonitoring';
import { ComparisonAnalytics } from './ComparisonAnalytics';
import { ExamHistory } from './ExamHistory';
import { ParticipantsManagement } from './ParticipantsManagement';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Activity,
  Award,
  History,
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [previewPaperId, setPreviewPaperId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Overview Quick Stats
  const [stats, setStats] = useState({
    papersCount: 0,
    examsCount: 0,
    liveExamsCount: 0,
    completedExamsCount: 0,
  });

  const loadStats = async () => {
    try {
      const [papers, exams] = await Promise.all([api.getPapers(), api.getExams()]);
      setStats({
        papersCount: papers.length,
        examsCount: exams.length,
        liveExamsCount: exams.filter((e) => e.status === 'live' || e.status === 'paused').length,
        completedExamsCount: exams.filter((e) => e.status === 'ended' || e.status === 'results_released').length,
      });
      if (!selectedExamId && exams.length > 0) {
        setSelectedExamId(exams[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  const handleOpenPaperPreview = (paperId: string) => {
    setPreviewPaperId(paperId);
    setActiveTab('preview_paper');
  };

  const handleCreateExamFromPaper = (paperId: string) => {
    setPreviewPaperId(paperId);
    setActiveTab('create_exam');
  };

  const handleOpenLiveMonitoring = (examId: string) => {
    setSelectedExamId(examId);
    setActiveTab('live_monitoring');
  };

  const handleOpenComparison = (examId: string) => {
    setSelectedExamId(examId);
    setActiveTab('comparison');
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'papers', label: 'Question Papers', icon: FileText },
    { id: 'create_exam', label: 'Create Exam', icon: Calendar },
    { id: 'live_monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'comparison', label: 'Comparison Analytics', icon: Award },
    { id: 'history', label: 'Examination History', icon: History },
    { id: 'participants', label: 'Participants', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-4 mb-6 border-b border-slate-800 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic View Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Hero Welcome */}
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-xl">
              <div className="max-w-2xl">
                <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
                  <Sparkles className="h-3 w-3" />
                  <span>Interactive Exam Command Hub</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                  Welcome to Administrator Console
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  Manage multi-format question papers, launch simultaneous exam distribution to participants P001-P004, monitor candidate progress in real-time with automatic reconnection recovery, and review comprehensive analytics.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('papers')}
                    className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition"
                  >
                    <span>Upload &amp; Manage Papers</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('create_exam')}
                    className="inline-flex items-center space-x-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition"
                  >
                    <span>Schedule New Exam</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Question Papers</span>
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">{stats.papersCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">PDF, CSV, Word, TXT</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Total Examinations</span>
                  <Calendar className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">{stats.examsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Scheduled sessions</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Live Examinations</span>
                  <Activity className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{stats.liveExamsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Simultaneous active</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Completed Sessions</span>
                  <Award className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400">{stats.completedExamsCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Evaluated &amp; archived</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'papers' && (
          <QuestionPapers
            onOpenPreview={handleOpenPaperPreview}
            onCreateExam={handleCreateExamFromPaper}
          />
        )}

        {activeTab === 'preview_paper' && previewPaperId && (
          <PaperValidationPreview
            paperId={previewPaperId}
            onBack={() => setActiveTab('papers')}
            onCreateExam={handleCreateExamFromPaper}
          />
        )}

        {activeTab === 'create_exam' && (
          <CreateExam
            initialPaperId={previewPaperId || undefined}
            onBack={() => setActiveTab('overview')}
            onSuccess={(examId) => handleOpenLiveMonitoring(examId)}
          />
        )}

        {activeTab === 'live_monitoring' && (
          <LiveExamMonitoring
            examId={selectedExamId || ''}
            onViewComparison={(id) => handleOpenComparison(id)}
          />
        )}

        {activeTab === 'comparison' && (
          <ComparisonAnalytics
            examId={selectedExamId || ''}
            onSelectExam={(id) => setSelectedExamId(id)}
          />
        )}

        {activeTab === 'history' && (
          <ExamHistory
            onSelectExam={(id) => handleOpenComparison(id)}
          />
        )}

        {activeTab === 'participants' && <ParticipantsManagement />}
      </div>
    </div>
  );
};
