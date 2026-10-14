import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Lock, ArrowLeft, AlertCircle, Check } from 'lucide-react';

interface ParticipantLoginPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

const PARTICIPANT_PRESETS = [
  { id: 'P001', name: 'Alice (P001)', defaultPw: 'Pass@P001' },
  { id: 'P002', name: 'Bob (P002)', defaultPw: 'Pass@P002' },
  { id: 'P003', name: 'Charlie (P003)', defaultPw: 'Pass@P003' },
  { id: 'P004', name: 'Diana (P004)', defaultPw: 'Pass@P004' },
];

export const ParticipantLoginPage: React.FC<ParticipantLoginPageProps> = ({ onBack, onSuccess }) => {
  const { login } = useAuth();
  const [selectedId, setSelectedId] = useState('P001');
  const [password, setPassword] = useState('Pass@P001');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectPreset = (p: typeof PARTICIPANT_PRESETS[0]) => {
    setSelectedId(p.id);
    setPassword(p.defaultPw);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const role = await login(selectedId.trim(), password);
      if (role !== 'participant') {
        setError('Unauthorized: Account is not a participant.');
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Landing Page</span>
        </button>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Participant Login</h2>
              <p className="text-xs text-slate-400">Select or enter your participant account</p>
            </div>
          </div>

          {/* Preset Buttons for P001..P004 */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Select Your Participant Account:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PARTICIPANT_PRESETS.map((p) => {
                const isSelected = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/60 text-white shadow-md shadow-indigo-950'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{p.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-start space-x-2 rounded-xl bg-rose-950/50 border border-rose-800/60 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Participant ID
              </label>
              <input
                type="text"
                required
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                placeholder="P001"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : `Login as ${selectedId}`}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
            Strict isolation: Each participant accesses only their private exams &amp; report cards.
          </div>
        </div>
      </div>
    </div>
  );
};
