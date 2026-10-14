import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { QuestionPaper } from '../../types';
import { UploadCloud, FileText, Plus, Trash2, Eye, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface QuestionPapersProps {
  onOpenPreview: (paperId: string) => void;
  onCreateExam: (paperId: string) => void;
}

export const QuestionPapers: React.FC<QuestionPapersProps> = ({ onOpenPreview, onCreateExam }) => {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manual Creation Modal / Form State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [rawText, setRawText] = useState('');

  const loadPapers = async () => {
    try {
      setLoading(true);
      const data = await api.getPapers();
      setPapers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch question papers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPapers();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const res = await api.uploadPaper(formData);
      setSuccess(`Paper uploaded and parsed successfully: ${res.total_questions} questions identified.`);
      await loadPapers();
      if (res.paper_id) {
        onOpenPreview(res.paper_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload and parse file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    setUploading(true);
    setError(null);
    try {
      const res = await api.createPaperManual({
        title: manualTitle,
        description: manualDescription,
        raw_text: rawText,
      });
      setShowManualModal(false);
      setManualTitle('');
      setManualDescription('');
      setRawText('');
      setSuccess(`Manual paper created: ${res.total_questions} questions parsed.`);
      await loadPapers();
      if (res.paper_id) {
        onOpenPreview(res.paper_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse raw text paper');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this question paper?')) return;
    try {
      await api.deletePaper(paperId);
      setPapers(papers.filter((p) => p.id !== paperId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete paper');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Question Paper Management</h2>
          <p className="text-xs text-slate-400">
            Upload question papers in PDF, CSV, Word (DOC/DOCX), or TXT formats with OCR &amp; structured parsing.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="cursor-pointer inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition">
            <UploadCloud className="h-4 w-4" />
            <span>{uploading ? 'Processing File...' : 'Upload Question Paper'}</span>
            <input
              type="file"
              accept=".pdf,.csv,.doc,.docx,.txt"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>
          <button
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center space-x-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition"
          >
            <Plus className="h-4 w-4 text-indigo-400" />
            <span>Manual / Paste Text</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 rounded-xl bg-rose-950/50 border border-rose-800/60 p-3 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Papers Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/60">
              <tr>
                <th className="py-3 px-4">Paper Title</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Total Questions</th>
                <th className="py-3 px-4">Validation Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading question papers...
                  </td>
                </tr>
              ) : papers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileText className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-medium text-slate-400">No question papers uploaded yet.</p>
                    <p className="text-[11px] text-slate-500">Upload a PDF, CSV, Word, or TXT file to get started.</p>
                  </td>
                </tr>
              ) : (
                papers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-white flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                      <span>{p.title}</span>
                    </td>
                    <td className="py-3 px-4 uppercase font-mono text-[10px] text-slate-400">
                      {p.file_type || 'TXT'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {p.total_questions} Questions
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {p.status === 'approved' ? 'Validated & Ready' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Today'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onOpenPreview(p.id)}
                          className="inline-flex items-center space-x-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 text-xs font-semibold transition"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Preview &amp; Validate</span>
                        </button>
                        <button
                          onClick={() => onCreateExam(p.id)}
                          className="inline-flex items-center space-x-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold transition"
                        >
                          <span>Create Exam</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeletePaper(p.id)}
                          className="p-1 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Paper"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual / Paste Text Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Create Paper from Plain Text / Paste</h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste structured questions following the standard format (Question 1:, A., B., C., D., Correct Answer:, Explanation:).
            </p>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Paper Title</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Science Quick Assessment"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Paste Raw Question Text</label>
                <textarea
                  rows={10}
                  required
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Question 1: What is the capital of India?
A. Mumbai
B. New Delhi
C. Kolkata
D. Chennai
Correct Answer: B
Explanation: New Delhi is the capital of India.
Marks: 2
Topic: Geography`}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-white font-mono outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {uploading ? 'Parsing Questions...' : 'Parse & Validate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
