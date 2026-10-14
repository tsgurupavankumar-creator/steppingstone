import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface DisconnectionBannerProps {
  isOffline: boolean;
  isSyncing: boolean;
  syncSuccessMessage?: string | null;
  pendingCount: number;
  onManualSync?: () => void;
}

export const DisconnectionBanner: React.FC<DisconnectionBannerProps> = ({
  isOffline,
  isSyncing,
  syncSuccessMessage,
  pendingCount,
  onManualSync
}) => {
  if (!isOffline && !syncSuccessMessage && pendingCount === 0) {
    return null;
  }

  if (syncSuccessMessage) {
    return (
      <div className="w-full bg-emerald-950/80 border-b border-emerald-700/60 text-emerald-200 px-4 py-2.5 text-xs font-medium flex items-center justify-between transition-all duration-300">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{syncSuccessMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-950/90 border-b border-amber-600/70 text-amber-200 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg backdrop-blur-md animate-pulse">
      <div className="flex items-center space-x-2.5">
        <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
        <div>
          <span className="font-semibold text-amber-300">Network Disconnected: </span>
          <span>
            Answers are safely queued in your temporary local storage ({pendingCount} pending). Authoritative deadline continues on backend.
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {onManualSync && (
          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 px-2.5 py-1 text-xs font-bold transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
