import React from 'react';
import { Clock, PauseCircle, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  remainingSeconds: number;
  isPaused?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  remainingSeconds,
  isPaused = false
}) => {
  const safeSeconds = Math.max(0, Math.floor(remainingSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCritical = safeSeconds <= 60 && !isPaused;
  const isWarning = safeSeconds <= 300 && !isCritical && !isPaused;

  return (
    <div
      className={`flex items-center space-x-2.5 rounded-xl px-4 py-2 border transition-all ${
        isPaused
          ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
          : isCritical
          ? 'bg-rose-950/70 border-rose-600 text-rose-300 animate-pulse shadow-md shadow-rose-900/30'
          : isWarning
          ? 'bg-amber-950/50 border-amber-600/70 text-amber-300'
          : 'bg-slate-800/90 border-slate-700/80 text-white'
      }`}
    >
      {isPaused ? (
        <PauseCircle className="h-5 w-5 text-amber-400" />
      ) : isCritical ? (
        <AlertTriangle className="h-5 w-5 text-rose-400 animate-bounce" />
      ) : (
        <Clock className="h-5 w-5 text-blue-400" />
      )}

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
          {isPaused ? 'Exam Paused' : 'Time Remaining'}
        </div>
        <div className="font-mono text-xl font-bold leading-tight">
          {formattedTime}
        </div>
      </div>
    </div>
  );
};
