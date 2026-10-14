import React from 'react';
import { Shield, Users, Sparkles, FileText, Activity, Award, CheckCircle, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: 'admin' | 'participant') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">QUIZZ EXAM</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onSelectRole('participant')}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition"
          >
            Participant Login
          </button>
          <button
            onClick={() => onSelectRole('admin')}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition"
          >
            Admin Portal
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Secure Real-Time Interactive Examination System</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight mb-6">
            Intelligent Examination &amp; Analytics Platform
          </h1>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Multi-format question paper parsing, simultaneous WebSocket distribution, automatic disconnection recovery, 
            instant server-side grading, and deep comparison analytics.
          </p>
        </div>

        {/* Portal Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full mb-16">
          {/* Admin Card */}
          <div
            onClick={() => onSelectRole('admin')}
            className="group cursor-pointer rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/40 p-8 shadow-xl hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition">
                <Shield className="h-7 w-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400/80 bg-amber-500/10 px-3 py-1 rounded-full">
                Administrator
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition">
              Admin Portal
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Upload papers in PDF, CSV, Word, or TXT. Preview &amp; edit questions, launch exams, monitor the 4 participants in real-time, and analyze comparative metrics.
            </p>
            <div className="flex items-center space-x-2 text-sm font-bold text-blue-400 group-hover:translate-x-1 transition">
              <span>Sign in as Administrator</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Participant Card */}
          <div
            onClick={() => onSelectRole('participant')}
            className="group cursor-pointer rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/40 p-8 shadow-xl hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition">
                <Users className="h-7 w-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400/80 bg-indigo-500/10 px-3 py-1 rounded-full">
                4 Participants
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-400 transition">
              Participant Portal
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Login as P001, P002, P003, or P004. Enter the waiting room, take scheduled exams with offline disconnection recovery, view your report card, and review mistakes.
            </p>
            <div className="flex items-center space-x-2 text-sm font-bold text-indigo-400 group-hover:translate-x-1 transition">
              <span>Sign in as Participant</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto w-full text-left">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <FileText className="h-5 w-5 text-blue-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1">Universal Parser</h4>
            <p className="text-xs text-slate-400">PDF, CSV, Word DOC/DOCX, and TXT with OCR and preview correction screen.</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <Activity className="h-5 w-5 text-emerald-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1">Real-Time Sync</h4>
            <p className="text-xs text-slate-400">WebSockets with automatic disconnection recovery and persistent server saving.</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <Award className="h-5 w-5 text-purple-400 mb-3" />
            <h4 className="text-sm font-bold text-white mb-1">Detailed Analytics</h4>
            <p className="text-xs text-slate-400">Report cards, step-by-step mistake explanations, Recharts, and downloadable PDFs.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        &copy; 2026 QUIZZ EXAM Platform. Built for real-time secure examinations.
      </footer>
    </div>
  );
};
