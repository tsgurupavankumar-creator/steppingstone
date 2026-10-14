from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.paper import QuestionPaper, Question, PaperVersion
from backend.app.models.exam import Examination
from backend.app.schemas.exam import ExamCreate, ExamSettingsUpdate
from backend.app.services.auth_service import get_current_user, require_admin
from backend.app.services.ws_manager import ws_manager

router = APIRouter(prefix="/api/exams", tags=["Examinations"])

@router.post("")
async def create_examination(
    payload: ExamCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(QuestionPaper).options(
        selectinload(QuestionPaper.questions),
        selectinload(QuestionPaper.versions)
    ).where(QuestionPaper.id == payload.paper_id)
    res = await db.execute(stmt)
    paper = res.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    if not paper.questions or len(paper.questions) == 0:
        raise HTTPException(status_code=400, detail="Cannot create exam from empty question paper.")

    # Validate that every question has correct_answer and 4 options
    for q in paper.questions:
        if q.correct_answer not in ["A", "B", "C", "D"]:
            raise HTTPException(
                status_code=400,
                detail=f"Question {q.question_number} has invalid correct answer '{q.correct_answer}'. Approve all questions before publishing."
            )

    # Create immutable paper version snapshot
    snapshot_questions = [q.to_dict(include_correct=True) for q in paper.questions]
    version = PaperVersion(
        paper_id=paper.id,
        version_number=len(paper.versions) + 1 if paper.versions else 1,
        title=paper.title,
        total_questions=len(snapshot_questions),
        questions_snapshot=snapshot_questions
    )
    db.add(version)
    await db.flush()

    total_marks = sum(q.marks for q in paper.questions)

    # Parse scheduled start time
    sched_time = None
    if payload.scheduled_start_time:
        try:
            sched_time = datetime.fromisoformat(payload.scheduled_start_time.replace("Z", "+00:00"))
        except Exception:
            sched_time = datetime.now(timezone.utc)
    else:
        sched_time = datetime.now(timezone.utc)

    deadline = sched_time + timedelta(minutes=payload.duration_minutes)

    exam = Examination(
        title=payload.title,
        description=payload.description or "",
        paper_id=paper.id,
        paper_version_id=version.id,
        total_questions=len(snapshot_questions),
        total_marks=total_marks,
        duration_minutes=payload.duration_minutes,
        positive_marks=payload.positive_marks,
        negative_marking=payload.negative_marking,
        scheduled_start_time=sched_time,
        deadline=deadline,
        status="scheduled",
        randomize_questions=payload.randomize_questions,
        randomize_options=payload.randomize_options,
        allow_return_previous=payload.allow_return_previous,
        allow_change_answers=payload.allow_change_answers,
        late_entry_allowed=payload.late_entry_allowed
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)

    # Broadcast exam scheduled event to all participants
    await ws_manager.broadcast_to_participants({
        "event": "exam_scheduled",
        "exam_id": exam.id,
        "title": exam.title,
        "scheduled_start_time": exam.scheduled_start_time.isoformat() if exam.scheduled_start_time else None,
        "duration_minutes": exam.duration_minutes
    })

    return exam.to_dict()

@router.get("")
async def list_examinations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).order_by(Examination.created_at.desc())
    res = await db.execute(stmt)
    exams = res.scalars().all()
    return [e.to_dict() for e in exams]

@router.get("/{exam_id}")
async def get_examination(
    exam_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")
    return exam.to_dict()

@router.put("/{exam_id}/settings")
async def update_exam_settings(
    exam_id: str,
    payload: ExamSettingsUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    if exam.status in ["ended", "results_released"]:
        raise HTTPException(status_code=400, detail="Cannot alter settings of an ended examination.")

    if payload.duration_minutes is not None:
        exam.duration_minutes = payload.duration_minutes
        if exam.actual_start_time:
            exam.deadline = exam.actual_start_time + timedelta(minutes=payload.duration_minutes, seconds=exam.total_paused_seconds)
    if payload.positive_marks is not None:
        exam.positive_marks = payload.positive_marks
    if payload.negative_marking is not None:
        exam.negative_marking = payload.negative_marking
    if payload.allow_return_previous is not None:
        exam.allow_return_previous = payload.allow_return_previous
    if payload.allow_change_answers is not None:
        exam.allow_change_answers = payload.allow_change_answers

    await db.commit()
    await db.refresh(exam)
    return exam.to_dict()
