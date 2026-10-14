const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('exam_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('exam_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('exam_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Handle binary downloads like PDF / CSV / Excel
  const contentType = response.headers.get('content-type');
  if (
    contentType &&
    (contentType.includes('application/pdf') ||
      contentType.includes('text/csv') ||
      contentType.includes('spreadsheetml'))
  ) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ access_token: string; role: 'admin' | 'participant'; username: string; full_name: string; user_id: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(credentials) }
    ),
  getMyProfile: () => request<any>('/auth/me'),
  getParticipants: () => request<any[]>('/auth/participants'),
  resetParticipantPassword: (participant_id: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ participant_id, new_password }),
    }),

  // Question Papers
  uploadPaper: (formData: FormData) =>
    request<any>('/papers/upload', {
      method: 'POST',
      body: formData,
    }),
  createPaperManual: (data: any) =>
    request<any>('/papers/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPapers: () => request<any[]>('/papers'),
  getPaperDetails: (paperId: string) => request<any>(`/papers/${paperId}`),
  updatePaper: (paperId: string, data: any) =>
    request<any>(`/papers/${paperId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePaper: (paperId: string) =>
    request<any>(`/papers/${paperId}`, { method: 'DELETE' }),

  // Exams
  createExam: (data: any) =>
    request<any>('/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getExams: () => request<any[]>('/exams'),
  getExam: (examId: string) => request<any>(`/exams/${examId}`),
  updateExamSettings: (examId: string, settings: any) =>
    request<any>(`/exams/${examId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Participant Session
  enterExamSession: (examId: string) => request<any>(`/session/${examId}/entry`),
  getExamQuestions: (examId: string) => request<any>(`/session/${examId}/questions`),
  getExamState: (examId: string) => request<any>(`/session/${examId}/state`),
  saveAnswer: (examId: string, payload: { question_number: number; selected_option: string | null; is_marked_for_review?: boolean; time_spent_delta: number }) =>
    request<any>(`/session/${examId}/save-answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  syncOfflineAnswers: (examId: string, answers: any[]) =>
    request<any>(`/session/${examId}/sync`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  submitExam: (examId: string) =>
    request<any>(`/session/${examId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }),

  // Admin Live Monitoring
  getLiveMonitoringStatus: (examId: string) =>
    request<any>(`/monitoring/${examId}/live-status`),
  startExam: (examId: string) =>
    request<any>(`/monitoring/${examId}/start`, { method: 'POST' }),
  pauseExam: (examId: string) =>
    request<any>(`/monitoring/${examId}/pause`, { method: 'POST' }),
  resumeExam: (examId: string) =>
    request<any>(`/monitoring/${examId}/resume`, { method: 'POST' }),
  extendExam: (examId: string, data: { participant_id?: string; extension_minutes: number }) =>
    request<any>(`/monitoring/${examId}/extend`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  endExam: (examId: string) =>
    request<any>(`/monitoring/${examId}/end`, { method: 'POST' }),
  releaseResults: (examId: string) =>
    request<any>(`/monitoring/${examId}/release-results`, { method: 'POST' }),

  // Reports & Analytics
  getReportCard: (examId: string, participantId: string) =>
    request<any>(`/reports/${examId}/participant/${participantId}`),
  downloadReportCardPdf: (examId: string, participantId: string) =>
    request<Blob>(`/reports/${examId}/participant/${participantId}/pdf`),
  downloadMistakesPdf: (examId: string, participantId: string) =>
    request<Blob>(`/reports/${examId}/participant/${participantId}/mistakes-pdf`),
  getMistakesReview: (examId: string, participantId: string, filterBy = 'all') =>
    request<any>(`/reports/${examId}/participant/${participantId}/mistakes?filter_by=${filterBy}`),
  exportResultsCsv: (examId: string) =>
    request<Blob>(`/reports/${examId}/export/csv`),
  exportResultsExcel: (examId: string) =>
    request<Blob>(`/reports/${examId}/export/excel`),
  getExamHistory: () => request<any[]>('/reports/history'),
  getComparisonAnalytics: (examId: string, sortBy = 'score') =>
    request<any>(`/analytics/${examId}/comparison?sort_by=${sortBy}`),
};
