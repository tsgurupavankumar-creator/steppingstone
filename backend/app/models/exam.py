import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Examination(Base):
    __tablename__ = "examinations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    paper_id = Column(String(36), ForeignKey("question_papers.id"), nullable=False)
    paper_version_id = Column(String(36), ForeignKey("paper_versions.id"), nullable=True)
    
    total_questions = Column(Integer, default=0)
    total_marks = Column(Float, default=0.0)
    duration_minutes = Column(Integer, default=30)
    positive_marks = Column(Float, default=1.0)
    negative_marking = Column(Float, default=0.0)
    
    # Scheduling & status
    scheduled_start_time = Column(DateTime, nullable=True)
    status = Column(String(50), default="scheduled")  # scheduled, waiting_room, live, paused, ended, results_released
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True)
    
    # Pausing state
    paused_at = Column(DateTime, nullable=True)
    total_paused_seconds = Column(Integer, default=0)
    
    # Rules / policies
    randomize_questions = Column(Boolean, default=False)
    randomize_options = Column(Boolean, default=False)
    allow_return_previous = Column(Boolean, default=True)
    allow_change_answers = Column(Boolean, default=True)
    late_entry_allowed = Column(Boolean, default=True)
    results_released_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "paper_id": self.paper_id,
            "paper_version_id": self.paper_version_id,
            "total_questions": self.total_questions,
            "total_marks": self.total_marks,
            "duration_minutes": self.duration_minutes,
            "positive_marks": self.positive_marks,
            "negative_marking": self.negative_marking,
            "scheduled_start_time": self.scheduled_start_time.isoformat() if self.scheduled_start_time else None,
            "status": self.status,
            "actual_start_time": self.actual_start_time.isoformat() if self.actual_start_time else None,
            "actual_end_time": self.actual_end_time.isoformat() if self.actual_end_time else None,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "paused_at": self.paused_at.isoformat() if self.paused_at else None,
            "total_paused_seconds": self.total_paused_seconds,
            "randomize_questions": self.randomize_questions,
            "randomize_options": self.randomize_options,
            "allow_return_previous": self.allow_return_previous,
            "allow_change_answers": self.allow_change_answers,
            "late_entry_allowed": self.late_entry_allowed,
            "results_released_at": self.results_released_at.isoformat() if self.results_released_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
