from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    paper_id: str
    duration_minutes: int = 30
    positive_marks: float = 1.0
    negative_marking: float = 0.0
    scheduled_start_time: Optional[str] = None
    randomize_questions: bool = False
    randomize_options: bool = False
    allow_return_previous: bool = True
    allow_change_answers: bool = True
    late_entry_allowed: bool = True

class ExamSettingsUpdate(BaseModel):
    duration_minutes: Optional[int] = None
    positive_marks: Optional[float] = None
    negative_marking: Optional[float] = None
    allow_return_previous: Optional[bool] = None
    allow_change_answers: Optional[bool] = None

class ExamTimeExtension(BaseModel):
    participant_id: Optional[str] = None  # None means all participants
    extension_minutes: int

class AnswerSaveRequest(BaseModel):
    question_number: int
    selected_option: Optional[str] = None  # 'A', 'B', 'C', 'D' or None
    is_marked_for_review: Optional[bool] = False
    time_spent_delta: float = 0.0  # seconds spent since last ping

class SyncAnswersRequest(BaseModel):
    answers: List[AnswerSaveRequest]

class ExamSubmissionConfirm(BaseModel):
    confirm: bool = True

class ParticipantAttemptStatus(BaseModel):
    participant_id: str
    status: str
    is_connected: bool
    answered_count: int
    unanswered_count: int
    marked_count: int
    progress_percentage: float
    time_remaining_seconds: float
    last_sync_at: Optional[str] = None
