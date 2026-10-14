import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User as UserIcon, LogOut, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface NavbarProps {
  isConnected?: boolean;
  onNavigate?: (view: string) => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConnected = true,
  onNavigate,
  currentView
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div 
          onClick={() => onNavigate && onNavigate(user?.role === 'admin' ? 'admin_dashboard' : 'participant_dashboard')}
          className="flex cursor-pointer items-center space-x-3 transition hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">QUIZZ EXAM</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Interactive Platform
            </span>
          </div>
        </div>

        {/* User Info & Connection Badge */}
        {user && (
          <div className="flex items-center space-x-4">
            {/* Live Connection indicator */}
            <div className="flex items-center space-x-2 rounded-full bg-slate-800/80 px-3 py-1 border border-slate-700/60 text-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-300 font-medium hidden sm:inline">
                {isConnected ? 'Real-Time Connected' : 'Offline / Reconnecting'}
              </span>
            </div>

            {/* Profile Pill */}
            <div className="flex items-center space-x-2.5 rounded-lg bg-slate-800 px-3 py-1.5 border border-slate-700/80">
              {user.role === 'admin' ? (
                <Shield className="h-4 w-4 text-amber-400" />
              ) : (
                <UserIcon className="h-4 w-4 text-indigo-400" />
              )}
              <div className="text-left">
                <p className="text-xs font-semibold text-white leading-tight">
                  {user.username}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {user.role}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Logout"
              className="flex items-center space-x-1.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900 border border-transparent transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
