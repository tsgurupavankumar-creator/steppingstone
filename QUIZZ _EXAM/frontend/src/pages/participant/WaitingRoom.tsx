import React, { useEffect, useRef } from 'react';
import { Examination } from '../../types';
import { api } from '../../services/api';
import { Clock, Shield, Sparkles, Loader2, ArrowLeft } from 'lucide-react';

interface WaitingRoomProps {
  exam: Examination;
  participantId: string;
  onExamStarted: () => void;
  onBack: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  exam,
  participantId,
  onExamStarted,
  onBack
}) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // If exam is already live, immediately transition to exam
    if (exam.status === 'live') {
      onExamStarted();
      return;
    }

    // CRITICAL FIX: Register participant attempt as 'in_waiting_room' so that
    // when admin calls /start, the backend can transition it to 'in_progress'.
    api.enterExamSession(exam.id).catch((err) =>
      console.warn('WaitingRoom entry registration failed:', err)
    );

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/participant/${participantId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'exam_started' && data.exam_id === exam.id) {
          onExamStarted();
        }
      } catch {
        // ignore
      }
    };

    // Authenticated poll every 3 seconds as backup in case of WebSocket drop
    const timer = setInterval(async () => {
      try {
        const updated = await api.getExam(exam.id);
        if (updated.status === 'live') {
          onExamStarted();
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [exam.id, exam.status]);

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-xl text-center space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Waiting Room</span>
        </button>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          {/* Animated Spinner Icon */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-xl shadow-blue-500/10">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-indigo-400 animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Examination Waiting Room
          </h2>
          <p className="text-sm font-semibold text-blue-400 mb-6">
            Candidate: <span className="font-mono">{participantId}</span>
          </p>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left space-y-2 mb-6 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Examination:</span>
              <strong className="text-white">{exam.title}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Duration:</span>
              <span className="font-mono text-white">{exam.duration_minutes} Minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Questions:</span>
              <span className="font-mono text-white">{exam.total_questions} Questions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Scoring:</span>
              <span className="text-emerald-400">+{exam.positive_marks} / -{exam.negative_marking}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-700/40 text-xs text-indigo-200 text-left space-y-1.5">
            <p className="font-semibold text-indigo-300">Important Instructions:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
              <li>You are connected to the live session channel. Do not close this browser tab.</li>
              <li>When the administrator starts the examination, your test interface will launch automatically.</li>
              <li>Network disconnection recovery is active: answers are saved both locally and to the server.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
