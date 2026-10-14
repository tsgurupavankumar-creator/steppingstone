import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Examination, ParticipantLiveStatus } from '../../types';
import {
  Play,
  Pause,
  Clock,
  Square,
  Share2,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Plus
} from 'lucide-react';

interface LiveExamMonitoringProps {
  examId: string;
  onViewComparison: (examId: string) => void;
}

export const LiveExamMonitoring: React.FC<LiveExamMonitoringProps> = ({
  examId,
  onViewComparison
}) => {
  const [exam, setExam] = useState<Examination | null>(null);
  const [participants, setParticipants] = useState<ParticipantLiveStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extend Modal State
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendTarget, setExtendTarget] = useState<string>('all');
  const [extendMinutes, setExtendMinutes] = useState(5);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchLiveStatus = async () => {
    try {
      const data = await api.getLiveMonitoringStatus(examId);
      setExam(data.exam);
      setParticipants(data.participants);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live monitoring status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();

    // WebSocket connection for real-time live events
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/admin`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'participant_progress' && data.exam_id === examId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.participant_id === data.participant_id
                ? {
                    ...p,
                    answered_count: data.answered_count,
                    unanswered_count: data.unanswered_count,
                    marked_count: data.marked_count,
                    progress_percentage: data.progress_percentage,
                    time_remaining_seconds: data.time_remaining_seconds,
                    last_sync_at: data.last_sync_at,
                  }
                : p
            )
          );
        } else if (data.event === 'participant_connected') {
          setParticipants((prev) =>
            prev.map((p) =>
              p.participant_id === data.participant_id ? { ...p, is_connected: true } : p
            )
          );
        } else if (data.event === 'participant_disconnected') {
          setParticipants((prev) =>
            prev.map((p) =>
              p.participant_id === data.participant_id ? { ...p, is_connected: false } : p
            )
          );
        } else if (data.event === 'participant_submitted' && data.exam_id === examId) {
          fetchLiveStatus();
        }
      } catch {
        // ignore
      }
    };

    // Periodic poll fallback every 5 seconds to ensure synchronization
    const timer = setInterval(fetchLiveStatus, 5000);

    return () => {
      clearInterval(timer);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [examId]);

  // Admin Controls
  const handleStartExam = async () => {
    if (!confirm('Start examination now? All participants in the waiting room will immediately enter the exam.')) return;
    setActionLoading(true);
    try {
      const res = await api.startExam(examId);
      setExam(res.exam);
      setNotification('Examination started! Real-time session broadcasted.');
      await fetchLiveStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to start exam');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseExam = async () => {
    setActionLoading(true);
    try {
      const res = await api.pauseExam(examId);
      setExam(res.exam);
      setNotification('Examination paused. Timers frozen across all participant devices.');
    } catch (err: any) {
      alert(err.message || 'Failed to pause exam');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeExam = async () => {
    setActionLoading(true);
    try {
      const res = await api.resumeExam(examId);
      setExam(res.exam);
      setNotification('Examination resumed. Deadline extended by pause duration.');
    } catch (err: any) {
      alert(err.message || 'Failed to resume exam');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.extendExam(examId, {
        participant_id: extendTarget === 'all' ? undefined : extendTarget,
        extension_minutes: extendMinutes,
      });
      setShowExtendModal(false);
      setNotification(`Granted ${extendMinutes} minutes extension.`);
      await fetchLiveStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to extend time');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndExam = async () => {
    if (!confirm('End examination now? All in-progress participant attempts will be locked and automatically evaluated.')) return;
    setActionLoading(true);
    try {
      const res = await api.endExam(examId);
      setExam(res.exam);
      setNotification('Examination ended! All attempts evaluated.');
      await fetchLiveStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to end exam');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseResults = async () => {
    if (!confirm('Release results to participants? Individual report cards and mistake explanations will become accessible to participants.')) return;
    setActionLoading(true);
    try {
      const res = await api.releaseResults(examId);
      setExam(res.exam);
      setNotification('Results released successfully!');
      await fetchLiveStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to release results');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">
                Exam Monitoring Console
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  exam?.status === 'live'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                    : exam?.status === 'paused'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : exam?.status === 'results_released'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : exam?.status === 'ended'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-slate-700/40 text-slate-300'
                }`}
              >
                {exam?.status.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{exam?.title || 'Examination Session'}</h2>
            <p className="text-xs text-slate-400">
              Duration: {exam?.duration_minutes}m &bull; Total Questions: {exam?.total_questions} &bull; Max Marks: {exam?.total_marks}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {exam?.status === 'scheduled' && (
              <button
                onClick={handleStartExam}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                <span>Start Exam</span>
              </button>
            )}

            {exam?.status === 'live' && (
              <button
                onClick={handlePauseExam}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                <span>Pause Exam</span>
              </button>
            )}

            {exam?.status === 'paused' && (
              <button
                onClick={handleResumeExam}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                <span>Resume Exam</span>
              </button>
            )}

            {(exam?.status === 'live' || exam?.status === 'paused') && (
              <>
                <button
                  onClick={() => setShowExtendModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>Extend Deadline</span>
                </button>
                <button
                  onClick={handleEndExam}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>End Exam</span>
                </button>
              </>
            )}

            {exam?.status === 'ended' && (
              <button
                onClick={handleReleaseResults}
                disabled={actionLoading}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                <span>Release Results</span>
              </button>
            )}

            {(exam?.status === 'ended' || exam?.status === 'results_released') && (
              <button
                onClick={() => onViewComparison(examId)}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition"
              >
                <span>View Comparison Analytics</span>
              </button>
            )}

            <button
              onClick={fetchLiveStatus}
              title="Refresh status"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-950/60 border border-emerald-700/60 p-3 text-xs text-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Participants Live Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span>Simultaneous Participant Monitoring (4 Candidates)</span>
          </h3>
          <span className="text-xs text-slate-400">
            Real-Time WebSocket Feed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Participant</th>
                <th className="py-3 px-4">Connection</th>
                <th className="py-3 px-4">Exam Status</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Answered</th>
                <th className="py-3 px-4">Remaining</th>
                <th className="py-3 px-4">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {participants.map((p) => {
                const remMin = Math.floor(p.time_remaining_seconds / 60);
                const remSec = Math.floor(p.time_remaining_seconds % 60);

                return (
                  <tr key={p.participant_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{p.participant_id}</div>
                      <div className="text-[11px] text-slate-400">{p.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      {p.is_connected ? (
                        <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 text-slate-500 text-xs">
                          <WifiOff className="h-3 w-3" />
                          <span>Offline</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'submitted'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : p.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : p.status === 'in_waiting_room'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 w-44">
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, p.progress_percentage)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-white">
                          {p.progress_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-emerald-400 font-bold">{p.answered_count}</span>
                      <span className="text-slate-500"> / {p.answered_count + p.unanswered_count}</span>
                      {p.marked_count > 0 && (
                        <span className="ml-2 text-purple-400 text-[10px]">({p.marked_count} marked)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-200">
                      {p.status === 'submitted' ? (
                        <span className="text-purple-400">Completed</span>
                      ) : (
                        `${remMin}m ${remSec}s`
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {p.last_sync_at ? new Date(p.last_sync_at).toLocaleTimeString() : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extend Deadline Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Grant Examination Extension</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add extra examination time either globally or to a specific participant.
            </p>
            <form onSubmit={handleExtendDuration} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target</label>
                <select
                  value={extendTarget}
                  onChange={(e) => setExtendTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white outline-none"
                >
                  <option value="all">All 4 Participants (Global Extension)</option>
                  {participants.map((p) => (
                    <option key={p.participant_id} value={p.participant_id}>
                      {p.participant_id} ({p.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Extension Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {actionLoading ? 'Extending...' : 'Grant Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
