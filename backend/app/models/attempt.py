import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    exam_id = Column(String(36), ForeignKey("examinations.id"), nullable=False, index=True)
    participant_id = Column(String(50), nullable=False, index=True)  # 'P001', 'P002', 'P003', 'P004'
    status = Column(String(50), default="in_waiting_room")  # in_waiting_room, in_progress, submitted, timed_out
    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    time_extension_minutes = Column(Integer, default=0)
    last_sync_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_connected = Column(Boolean, default=False)
    current_question_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    exam = relationship("Examination", back_populates="attempts")
    answers = relationship("ParticipantAnswer", back_populates="attempt", cascade="all, delete-orphan")
    timing_logs = relationship("QuestionTimingLog", back_populates="attempt", cascade="all, delete-orphan")
    result = relationship("EvaluationResult", back_populates="attempt", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "participant_id": self.participant_id,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "time_extension_minutes": self.time_extension_minutes,
            "last_sync_at": self.last_sync_at.isoformat() if self.last_sync_at else None,
            "is_connected": self.is_connected,
            "current_question_index": self.current_question_index,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class ParticipantAnswer(Base):
    __tablename__ = "participant_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey("exam_attempts.id"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    selected_option = Column(String(10), nullable=True)  # 'A', 'B', 'C', 'D' or None
    is_marked_for_review = Column(Boolean, default=False)
    time_spent_seconds = Column(Float, default=0.0)
    change_count = Column(Integer, default=0)
    saved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    attempt = relationship("ExamAttempt", back_populates="answers")

    def to_dict(self):
        return {
            "id": self.id,
            "attempt_id": self.attempt_id,
            "question_number": self.question_number,
            "selected_option": self.selected_option,
            "is_marked_for_review": self.is_marked_for_review,
            "time_spent_seconds": self.time_spent_seconds,
            "change_count": self.change_count,
            "saved_at": self.saved_at.isoformat() if self.saved_at else None
        }

class QuestionTimingLog(Base):
    __tablename__ = "question_timing_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey("exam_attempts.id"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    attempt = relationship("ExamAttempt", back_populates="timing_logs")
