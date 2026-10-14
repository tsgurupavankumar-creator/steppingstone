import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attempt_id = Column(String(36), ForeignKey("exam_attempts.id"), nullable=False, unique=True, index=True)
    exam_id = Column(String(36), ForeignKey("examinations.id"), nullable=False, index=True)
    participant_id = Column(String(50), nullable=False, index=True)
    
    total_score = Column(Float, nullable=False, default=0.0)
    max_possible_marks = Column(Float, nullable=False, default=0.0)
    percentage = Column(Float, nullable=False, default=0.0)
    
    correct_count = Column(Integer, nullable=False, default=0)
    incorrect_count = Column(Integer, nullable=False, default=0)
    unanswered_count = Column(Integer, nullable=False, default=0)
    marked_for_review_count = Column(Integer, nullable=False, default=0)
    
    accuracy = Column(Float, nullable=False, default=0.0)  # (correct / attempted) * 100
    attempt_rate = Column(Float, nullable=False, default=0.0)  # (attempted / total) * 100
    completion_rate = Column(Float, nullable=False, default=0.0)
    
    total_time_seconds = Column(Float, nullable=False, default=0.0)
    avg_time_per_question = Column(Float, nullable=False, default=0.0)
    avg_time_per_attempted_question = Column(Float, nullable=False, default=0.0)
    fastest_question_time = Column(Float, nullable=True)
    slowest_question_time = Column(Float, nullable=True)
    
    rank = Column(Integer, nullable=True)
    topic_breakdown = Column(JSON, nullable=True)  # { "Topic": { "correct": 2, "total": 3, "score": 2.0 } }
    question_details = Column(JSON, nullable=True)  # Array of evaluated questions with answer, correct, time, explanation
    
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    attempt = relationship("ExamAttempt", back_populates="result")

    def to_dict(self):
        return {
            "id": self.id,
            "attempt_id": self.attempt_id,
            "exam_id": self.exam_id,
            "participant_id": self.participant_id,
            "total_score": round(self.total_score, 2),
            "max_possible_marks": round(self.max_possible_marks, 2),
            "percentage": round(self.percentage, 2),
            "correct_count": self.correct_count,
            "incorrect_count": self.incorrect_count,
            "unanswered_count": self.unanswered_count,
            "marked_for_review_count": self.marked_for_review_count,
            "accuracy": round(self.accuracy, 2),
            "attempt_rate": round(self.attempt_rate, 2),
            "completion_rate": round(self.completion_rate, 2),
            "total_time_seconds": round(self.total_time_seconds, 1),
            "avg_time_per_question": round(self.avg_time_per_question, 1),
            "avg_time_per_attempted_question": round(self.avg_time_per_attempted_question, 1),
            "fastest_question_time": round(self.fastest_question_time, 1) if self.fastest_question_time is not None else None,
            "slowest_question_time": round(self.slowest_question_time, 1) if self.slowest_question_time is not None else None,
            "rank": self.rank,
            "topic_breakdown": self.topic_breakdown,
            "question_details": self.question_details,
            "calculated_at": self.calculated_at.isoformat() if self.calculated_at else None
        }
