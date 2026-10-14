import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { recoveryService } from '../../services/recoveryService';
import { Question, SavedAnswer, Examination } from '../../types';
import { CountdownTimer } from '../../components/CountdownTimer';
import { QuestionPalette } from '../../components/QuestionPalette';
import { ConfirmModal } from '../../components/ConfirmModal';
import { DisconnectionBanner } from '../../components/DisconnectionBanner';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Send,
  Wifi,
  WifiOff,
  CloudCheck,
  Loader2,
  Check
} from 'lucide-react';

interface ExamInterfaceProps {
  examId: string;
  participantId: string;
  onSubmitted: (examId: string) => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  examId,
  participantId,
  onSubmitted
}) => {
  const [exam, setExam] = useState<Examination | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, SavedAnswer>>({});
  
  // Authoritative remaining seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // Connection and saving states
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline_queued'>('saved');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);

  // Submission modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Time tracking per question
  const lastActiveTimestamp = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  // Use a ref to track isPaused so the clock interval always reads latest value
  const isPausedRef = useRef<boolean>(false);

  // 1. Initial Load: Questions & Restored State
  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        // Enter session and retrieve questions
        const [entryData, qData, stateData] = await Promise.all([
          api.enterExamSession(examId),
          api.getExamQuestions(examId),
          api.getExamState(examId),
        ]);

        setExam(entryData.exam);
        setQuestions(qData.questions);
        setRemainingSeconds(entryData.remaining_seconds);
        const paused = entryData.is_paused;
        setIsPaused(paused);
        isPausedRef.current = paused;

        // Restore saved answers from server
        const restoredAnswers: Record<number, SavedAnswer> = {};
        Object.entries(stateData.answers || {}).forEach(([numStr, ans]: [string, any]) => {
          restoredAnswers[parseInt(numStr)] = {
            selected_option: ans.selected_option,
            is_marked_for_review: ans.is_marked_for_review,
            time_spent_seconds: ans.time_spent_seconds,
            change_count: ans.change_count,
            saved_at: ans.saved_at,
          };
        });

        // Check if any offline queued answers exist locally
        const localQueue = recoveryService.getQueuedAnswers(examId, participantId);
        setPendingOfflineCount(localQueue.length);
        localQueue.forEach((q) => {
          restoredAnswers[q.question_number] = {
            selected_option: q.selected_option,
            is_marked_for_review: !!q.is_marked_for_review,
            time_spent_seconds: (restoredAnswers[q.question_number]?.time_spent_seconds || 0) + q.time_spent_delta,
          };
        });

        setAnswers(restoredAnswers);
        if (stateData.current_question_index !== undefined) {
          setCurrentIndex(stateData.current_question_index);
        }

        // Auto-sync if offline queue has items
        if (localQueue.length > 0 && navigator.onLine) {
          triggerSyncOfflineQueue(localQueue);
        }
      } catch (err: any) {
        console.error('Init session error', err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // 2. Real-Time WebSocket for Administrative Events (pause, resume, extend, end)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/participant/${participantId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'exam_paused') {
          setIsPaused(true);
          isPausedRef.current = true;
        } else if (msg.event === 'exam_resumed') {
          setIsPaused(false);
          isPausedRef.current = false;
          if (msg.deadline) {
            const rem = (new Date(msg.deadline).getTime() - Date.now()) / 1000;
            setRemainingSeconds(Math.max(0, rem));
          }
        } else if (msg.event === 'deadline_extended' || msg.event === 'time_extension_granted') {
          setRemainingSeconds((prev) => prev + (msg.extension_minutes || 0) * 60);
          setSyncSuccessMsg(`Time extension granted: +${msg.extension_minutes} minutes`);
          setTimeout(() => setSyncSuccessMsg(null), 4000);
        } else if (msg.event === 'exam_ended') {
          // Force auto-submit
          handleFinalSubmit();
        }
      } catch {
        // ignore
      }
    };

    // 3. Network Listeners
    const handleOnline = () => {
      setIsOffline(false);
      const queue = recoveryService.getQueuedAnswers(examId, participantId);
      if (queue.length > 0) {
        triggerSyncOfflineQueue(queue);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Authoritative Clock Tick — uses ref to avoid stale isPaused closure
    const clockInterval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (isPausedRef.current) return prev;
        if (prev <= 1) {
          // Deadline reached -> Auto submit
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [examId, participantId]);

  // Synchronize Offline Recovery Queue
  const triggerSyncOfflineQueue = async (queue = recoveryService.getQueuedAnswers(examId, participantId)) => {
    if (queue.length === 0 || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const res = await api.syncOfflineAnswers(examId, queue);
      recoveryService.clearQueue(examId, participantId);
      setPendingOfflineCount(0);
      setSaveStatus('saved');
      setSyncSuccessMsg(`Synchronized with server (${res.synced_count} offline answers confirmed)`);
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Offline sync failed', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper: Persist Single Answer
  const saveCurrentAnswerToBackend = async (
    qNum: number,
    opt: string | null,
    isMarked: boolean
  ) => {
    const now = Date.now();
    const timeSpentDelta = Math.max(0.5, (now - lastActiveTimestamp.current) / 1000);
    lastActiveTimestamp.current = now;

    // Update local state immediately
    setAnswers((prev) => ({
      ...prev,
      [qNum]: {
        selected_option: opt,
        is_marked_for_review: isMarked,
        time_spent_seconds: (prev[qNum]?.time_spent_seconds || 0) + timeSpentDelta,
      },
    }));

    if (navigator.onLine && !isOffline) {
      setSaveStatus('saving');
      try {
        await api.saveAnswer(examId, {
          question_number: qNum,
          selected_option: opt,
          is_marked_for_review: isMarked,
          time_spent_delta: timeSpentDelta,
        });
        setSaveStatus('saved');
      } catch (err) {
        // Enqueue to offline storage on failure
        recoveryService.enqueueAnswer(examId, participantId, {
          question_number: qNum,
          selected_option: opt,
          is_marked_for_review: isMarked,
          time_spent_delta: timeSpentDelta,
          queued_at: Date.now(),
        });
        setPendingOfflineCount(recoveryService.getQueuedAnswers(examId, participantId).length);
        setSaveStatus('offline_queued');
      }
    } else {
      // Offline: Enqueue to local recovery storage
      recoveryService.enqueueAnswer(examId, participantId, {
        question_number: qNum,
        selected_option: opt,
        is_marked_for_review: isMarked,
        time_spent_delta: timeSpentDelta,
        queued_at: Date.now(),
      });
      setPendingOfflineCount(recoveryService.getQueuedAnswers(examId, participantId).length);
      setSaveStatus('offline_queued');
    }
  };

  // User Action Handlers
  const currentQuestion = questions[currentIndex];
  const currentQNum = currentQuestion?.question_number || 1;
  const currentAns = answers[currentQNum];

  const handleSelectOption = (optLetter: string) => {
    // If same option clicked, no change unless allowed
    const isMarked = !!currentAns?.is_marked_for_review;
    saveCurrentAnswerToBackend(currentQNum, optLetter, isMarked);
  };

  const handleClearResponse = () => {
    const isMarked = !!currentAns?.is_marked_for_review;
    saveCurrentAnswerToBackend(currentQNum, null, isMarked);
  };

  const handleToggleMarkForReview = () => {
    const newMarked = !currentAns?.is_marked_for_review;
    const opt = currentAns?.selected_option || null;
    saveCurrentAnswerToBackend(currentQNum, opt, newMarked);
  };

  const handleNavigateQuestion = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= questions.length) return;
    lastActiveTimestamp.current = Date.now();
    setCurrentIndex(newIndex);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Flush any queued offline answers before final submit if online
      const queue = recoveryService.getQueuedAnswers(examId, participantId);
      if (queue.length > 0 && navigator.onLine) {
        await api.syncOfflineAnswers(examId, queue);
        recoveryService.clearQueue(examId, participantId);
      }
      await api.submitExam(examId);
      setShowConfirmModal(false);
      onSubmitted(examId);
    } catch (err: any) {
      alert(err.message || 'Failed to submit examination');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-sm font-semibold">Preparing Examination Session...</span>
        </div>
      </div>
    );
  }

  // Answered Counts
  let answeredCount = 0;
  let markedCount = 0;
  questions.forEach((q) => {
    const a = answers[q.question_number];
    if (a?.selected_option) answeredCount++;
    if (a?.is_marked_for_review) markedCount++;
  });
  const unansweredCount = questions.length - answeredCount;
  const progressPct = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Network Disconnection Recovery Banner */}
      <DisconnectionBanner
        isOffline={isOffline}
        isSyncing={isSyncing}
        syncSuccessMessage={syncSuccessMsg}
        pendingCount={pendingOfflineCount}
        onManualSync={() => triggerSyncOfflineQueue()}
      />

      {/* Exam Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              {exam?.title || 'Examination Session'}
            </h1>
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
              <span>Candidate: <strong className="text-white font-mono">{participantId}</strong></span>
              <span>&bull;</span>
              <span>Marks: <strong className="text-emerald-400">+{currentQuestion.marks} / -{currentQuestion.negative_marks}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Answer Saving Status Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-[11px]">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                  <span className="text-blue-300">Saving...</span>
                </>
              ) : saveStatus === 'offline_queued' ? (
                <>
                  <WifiOff className="h-3 w-3 text-amber-400" />
                  <span className="text-amber-300">Saved Locally (Queued)</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-slate-300">Server Synced</span>
                </>
              )}
            </div>

            {/* Authoritative Countdown Timer */}
            <CountdownTimer remainingSeconds={remainingSeconds} isPaused={isPaused} />

            {/* Final Submit Button */}
            <button
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-7xl mx-auto mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Main Examination Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 grid lg:grid-cols-3 gap-6">
        {/* Left Column: Question & Options (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            {/* Question Top Info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div className="flex items-center space-x-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 font-bold font-mono text-sm border border-blue-500/30">
                  {currentQNum}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Question {currentQNum} of {questions.length}
                  </span>
                  <span className="text-xs text-slate-500 ml-2 font-mono">
                    [{currentQuestion.topic || 'General'}]
                  </span>
                </div>
              </div>

              {currentAns?.is_marked_for_review && (
                <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Bookmark className="h-3 w-3 fill-purple-400" />
                  <span>Marked for Review</span>
                </span>
              )}
            </div>

            {/* Question Statement */}
            <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed mb-6">
              {currentQuestion.question_text}
            </p>

            {/* Options List */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const optText = currentQuestion[`option_${letter.toLowerCase()}` as keyof Question] as string;
                const isSelected = currentAns?.selected_option === letter;

                return (
                  <div
                    key={letter}
                    onClick={() => handleSelectOption(letter)}
                    className={`cursor-pointer rounded-2xl border p-4 flex items-center justify-between transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40 text-white shadow-lg shadow-blue-950 ring-1 ring-blue-500'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold font-mono text-xs border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="text-sm font-medium">{optText}</span>
                    </div>

                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Question Action Controls (Clear, Mark for review) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleClearResponse}
                  disabled={!currentAns?.selected_option}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Clear Response</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMarkForReview}
                  className={`inline-flex items-center space-x-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    currentAns?.is_marked_for_review
                      ? 'bg-purple-900/60 border-purple-600 text-purple-200'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${currentAns?.is_marked_for_review ? 'fill-purple-400 text-purple-400' : 'text-slate-400'}`} />
                  <span>{currentAns?.is_marked_for_review ? 'Unmark Review' : 'Mark for Review'}</span>
                </button>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={currentIndex === 0 || !exam?.allow_return_previous}
                  onClick={() => handleNavigateQuestion(currentIndex - 1)}
                  className="inline-flex items-center space-x-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => handleNavigateQuestion(currentIndex + 1)}
                  className="inline-flex items-center space-x-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition disabled:opacity-30"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Palette & Legend (1 col) */}
        <div>
          <QuestionPalette
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            answers={answers}
            onSelectQuestion={handleNavigateQuestion}
            allowReturnPrevious={exam?.allow_return_previous}
          />
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        markedCount={markedCount}
        isSubmitting={isSubmitting}
        onConfirm={handleFinalSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
};
