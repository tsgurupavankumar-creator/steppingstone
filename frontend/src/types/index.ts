export type UserRole = 'admin' | 'participant';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
}

export interface Question {
  id?: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string;
  explanation?: string;
  option_a_explanation?: string;
  option_b_explanation?: string;
  option_c_explanation?: string;
  option_d_explanation?: string;
  marks: number;
  negative_marks: number;
  topic: string;
  difficulty: string;
  has_warning?: boolean;
  warning_message?: string;
}

export interface ValidationIssue {
  question_number: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface QuestionPaper {
  id: string;
  title: string;
  description?: string;
  original_filename?: string;
  file_type?: string;
  status: string;
  total_questions: number;
  created_at?: string;
  updated_at?: string;
}

export interface Examination {
  id: string;
  title: string;
  description?: string;
  paper_id: string;
  paper_version_id?: string;
  total_questions: number;
  total_marks: number;
  duration_minutes: number;
  positive_marks: number;
  negative_marking: number;
  scheduled_start_time?: string;
  status: 'scheduled' | 'waiting_room' | 'live' | 'paused' | 'ended' | 'results_released';
  actual_start_time?: string;
  actual_end_time?: string;
  deadline?: string;
  paused_at?: string;
  total_paused_seconds: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  allow_return_previous: boolean;
  allow_change_answers: boolean;
  late_entry_allowed: boolean;
  results_released_at?: string;
  created_at?: string;
}

export interface SavedAnswer {
  selected_option: string | null;
  is_marked_for_review: boolean;
  time_spent_seconds: number;
  change_count?: number;
  saved_at?: string;
}

export interface ParticipantLiveStatus {
  participant_id: string;
  name: string;
  status: string;
  is_connected: boolean;
  answered_count: number;
  unanswered_count: number;
  marked_count: number;
  progress_percentage: number;
  time_remaining_seconds: number;
  last_sync_at?: string | null;
  submitted_at?: string | null;
}

export interface EvaluatedQuestionDetail {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_option: string | null;
  correct_answer: string;
  status: 'correct' | 'incorrect' | 'unanswered';
  marks_awarded: number;
  max_marks: number;
  negative_marks: number;
  time_spent_seconds: number;
  is_marked_for_review: boolean;
  explanation: string;
  option_a_explanation?: string;
  option_b_explanation?: string;
  option_c_explanation?: string;
  option_d_explanation?: string;
  topic: string;
  difficulty: string;
}

export interface TopicScore {
  topic: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  max_score: number;
  accuracy: number;
}

export interface EvaluationResult {
  id?: string;
  attempt_id?: string;
  exam_id: string;
  participant_id: string;
  total_score: number;
  max_possible_marks: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  marked_for_review_count: number;
  accuracy: number;
  attempt_rate: number;
  completion_rate: number;
  total_time_seconds: number;
  avg_time_per_question: number;
  avg_time_per_attempted_question: number;
  fastest_question_time?: number | null;
  slowest_question_time?: number | null;
  rank?: number | null;
  topic_breakdown: TopicScore[];
  question_details?: EvaluatedQuestionDetail[];
  calculated_at?: string;
}

export interface ParticipantComparisonData {
  participant_id: string;
  name: string;
  status: string;
  total_score: number;
  max_possible_marks: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  accuracy: number;
  attempt_rate: number;
  completion_rate: number;
  total_time_seconds: number;
  avg_time_per_question: number;
  topic_breakdown: TopicScore[];
  rank?: number | null;
  submitted_at?: string | null;
}
