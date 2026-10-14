import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import { Users, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ParticipantsManagement: React.FC = () => {
  const [participants, setParticipants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const data = await api.getParticipants();
      setParticipants(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch participants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || !newPassword) return;

    try {
      const res = await api.resetParticipantPassword(selectedParticipant, newPassword);
      setSuccessMsg(res.message);
      setSelectedParticipant(null);
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Users className="h-5 w-5 text-indigo-400" />
          <span>Participant Accounts Management</span>
        </h2>
        <p className="text-xs text-slate-400">
          Permanent participant accounts (P001, P002, P003, P004) with strict individual data isolation and administrator-assisted password configuration.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-950/60 border border-emerald-700/60 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-xl bg-rose-950/60 border border-rose-800/60 p-3 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {participants.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-base font-extrabold text-white">{p.username}</span>
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Candidate
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-4">{p.full_name}</p>

            <button
              onClick={() => {
                setSelectedParticipant(p.username);
                setNewPassword('');
                setSuccessMsg(null);
                setErrorMsg(null);
              }}
              className="w-full flex items-center justify-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 text-xs font-semibold text-slate-200 transition"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span>Reset Password</span>
            </button>
          </div>
        ))}
      </div>

      {/* Password Reset Modal */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Reset Password for {selectedParticipant}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter a new secure password for this participant account.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedParticipant(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 text-xs font-bold text-white transition"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
