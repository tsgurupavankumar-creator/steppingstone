import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class QuestionPaper(Base):
    __tablename__ = "question_papers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    original_filename = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)  # pdf, csv, doc, docx, txt, manual
    file_path = Column(String(500), nullable=True)
    status = Column(String(50), default="draft")  # draft, approved, published
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    questions = relationship("Question", back_populates="paper", cascade="all, delete-orphan", order_by="Question.question_number")
    versions = relationship("PaperVersion", back_populates="paper", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "original_filename": self.original_filename,
            "file_type": self.file_type,
            "status": self.status,
            "total_questions": self.total_questions,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey("question_papers.id"), nullable=False, index=True)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_answer = Column(String(10), nullable=False)  # 'A', 'B', 'C', 'D'
    explanation = Column(Text, nullable=True)
    option_a_explanation = Column(Text, nullable=True)
    option_b_explanation = Column(Text, nullable=True)
    option_c_explanation = Column(Text, nullable=True)
    option_d_explanation = Column(Text, nullable=True)
    marks = Column(Float, default=1.0)
    negative_marks = Column(Float, default=0.0)
    topic = Column(String(100), default="General")
    difficulty = Column(String(50), default="Medium")
    has_warning = Column(Boolean, default=False)
    warning_message = Column(Text, nullable=True)

    paper = relationship("QuestionPaper", back_populates="questions")

    def to_dict(self, include_correct=True):
        data = {
            "id": self.id,
            "paper_id": self.paper_id,
            "question_number": self.question_number,
            "question_text": self.question_text,
            "option_a": self.option_a,
            "option_b": self.option_b,
            "option_c": self.option_c,
            "option_d": self.option_d,
            "marks": self.marks,
            "negative_marks": self.negative_marks,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "has_warning": self.has_warning,
            "warning_message": self.warning_message,
        }
        if include_correct:
            data["correct_answer"] = self.correct_answer
            data["explanation"] = self.explanation
            data["option_a_explanation"] = self.option_a_explanation
            data["option_b_explanation"] = self.option_b_explanation
            data["option_c_explanation"] = self.option_c_explanation
            data["option_d_explanation"] = self.option_d_explanation
        return data

class PaperVersion(Base):
    __tablename__ = "paper_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    paper_id = Column(String(36), ForeignKey("question_papers.id"), nullable=False, index=True)
    version_number = Column(Integer, default=1)
    title = Column(String(200), nullable=False)
    total_questions = Column(Integer, default=0)
    questions_snapshot = Column(JSON, nullable=False)  # Immutable snapshot of all questions
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    paper = relationship("QuestionPaper", back_populates="versions")

    def to_dict(self):
        return {
            "id": self.id,
            "paper_id": self.paper_id,
            "version_number": self.version_number,
            "title": self.title,
            "total_questions": self.total_questions,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
