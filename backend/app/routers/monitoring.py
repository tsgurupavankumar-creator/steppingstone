from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.exam import Examination
from backend.app.models.paper import PaperVersion
from backend.app.models.attempt import ExamAttempt
from backend.app.models.result import EvaluationResult
from backend.app.schemas.exam import ExamTimeExtension
from backend.app.services.auth_service import require_admin
from backend.app.services.eval_service import evaluate_participant_attempt
from backend.app.services.ws_manager import ws_manager

router = APIRouter(prefix="/api/monitoring", tags=["Admin Live Monitoring"])

@router.get("/{exam_id}/live-status")
async def get_live_exam_status(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    # Fetch attempts for all 4 participants
    att_stmt = select(ExamAttempt).options(selectinload(ExamAttempt.answers)).where(ExamAttempt.exam_id == exam_id)
    att_res = await db.execute(att_stmt)
    attempts = {a.participant_id: a for a in att_res.scalars().all()}

    now = datetime.now(timezone.utc)
    participants_status = []

    for p in settings.PARTICIPANTS:
        p_id = p["id"]
        attempt = attempts.get(p_id)
        is_connected = ws_manager.is_participant_connected(p_id)

        if not attempt:
            participants_status.append({
                "participant_id": p_id,
                "name": p["name"],
                "status": "not_joined",
                "is_connected": is_connected,
                "answered_count": 0,
                "unanswered_count": exam.total_questions or 0,
                "marked_count": 0,
                "progress_percentage": 0.0,
                "time_remaining_seconds": float(exam.duration_minutes * 60),
                "last_sync_at": None,
                "submitted_at": None
            })
        else:
            answered_count = sum(1 for a in attempt.answers if a.selected_option)
            marked_count = sum(1 for a in attempt.answers if a.is_marked_for_review)
            total_q = exam.total_questions or 1
            progress_pct = round((answered_count / total_q) * 100.0, 1)

            # Deadline calculation
            deadline = exam.deadline
            if deadline and deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if deadline and attempt.time_extension_minutes > 0:
                deadline += timedelta(minutes=attempt.time_extension_minutes)

            rem_sec = (deadline - now).total_seconds() if deadline else float(exam.duration_minutes * 60)
            if exam.status in ["ended", "results_released"] or attempt.status in ["submitted", "timed_out"]:
                rem_sec = 0.0

            participants_status.append({
                "participant_id": p_id,
                "name": p["name"],
                "status": attempt.status,
                "is_connected": is_connected,
                "answered_count": answered_count,
                "unanswered_count": total_q - answered_count,
                "marked_count": marked_count,
                "progress_percentage": progress_pct,
                "time_remaining_seconds": max(0.0, round(rem_sec, 1)),
                "last_sync_at": attempt.last_sync_at.isoformat() if attempt.last_sync_at else None,
                "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None
            })

    return {
        "exam": exam.to_dict(),
        "participants": participants_status
    }

@router.post("/{exam_id}/start")
async def start_exam(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    now = datetime.now(timezone.utc)
    exam.status = "live"
    exam.actual_start_time = now
    exam.deadline = now + timedelta(minutes=exam.duration_minutes)

    # Transition existing waiting room attempts to in_progress
    att_stmt = select(ExamAttempt).where(ExamAttempt.exam_id == exam_id)
    att_res = await db.execute(att_stmt)
    for att in att_res.scalars().all():
        if att.status == "in_waiting_room":
            att.status = "in_progress"
            att.started_at = now

    await db.commit()
    await db.refresh(exam)

    # Notify all connected participants
    await ws_manager.broadcast_to_participants({
        "event": "exam_started",
        "exam_id": exam.id,
        "actual_start_time": exam.actual_start_time.isoformat(),
        "deadline": exam.deadline.isoformat(),
        "duration_minutes": exam.duration_minutes
    })

    return {"message": "Examination started successfully", "exam": exam.to_dict()}

@router.post("/{exam_id}/pause")
async def pause_exam(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    if exam.status != "live":
        raise HTTPException(status_code=400, detail="Only a live examination can be paused.")

    exam.status = "paused"
    exam.paused_at = datetime.now(timezone.utc)
    await db.commit()

    await ws_manager.broadcast_to_participants({
        "event": "exam_paused",
        "exam_id": exam.id,
        "paused_at": exam.paused_at.isoformat()
    })

    return {"message": "Examination paused successfully", "exam": exam.to_dict()}

@router.post("/{exam_id}/resume")
async def resume_exam(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    if exam.status != "paused":
        raise HTTPException(status_code=400, detail="Only a paused examination can be resumed.")

    now = datetime.now(timezone.utc)
    paused_at = exam.paused_at
    if paused_at and paused_at.tzinfo is None:
        paused_at = paused_at.replace(tzinfo=timezone.utc)

    paused_duration_sec = (now - paused_at).total_seconds() if paused_at else 0
    exam.total_paused_seconds += int(paused_duration_sec)
    
    # Extend deadline by paused duration
    if exam.deadline:
        deadline = exam.deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        exam.deadline = deadline + timedelta(seconds=paused_duration_sec)

    exam.status = "live"
    exam.paused_at = None
    await db.commit()

    await ws_manager.broadcast_to_participants({
        "event": "exam_resumed",
        "exam_id": exam.id,
        "resumed_at": now.isoformat(),
        "deadline": exam.deadline.isoformat() if exam.deadline else None
    })

    return {"message": "Examination resumed successfully", "exam": exam.to_dict()}

@router.post("/{exam_id}/extend")
async def extend_exam_deadline(
    exam_id: str,
    payload: ExamTimeExtension,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    if payload.participant_id:
        # Extend specifically for one participant
        att_stmt = select(ExamAttempt).where(
            and_(ExamAttempt.exam_id == exam_id, ExamAttempt.participant_id == payload.participant_id)
        )
        att_res = await db.execute(att_stmt)
        attempt = att_res.scalar_one_or_none()
        if not attempt:
            raise HTTPException(status_code=404, detail=f"Attempt for {payload.participant_id} not found")
        attempt.time_extension_minutes += payload.extension_minutes
        await db.commit()

        await ws_manager.send_to_participant(payload.participant_id, {
            "event": "time_extension_granted",
            "extension_minutes": payload.extension_minutes,
            "total_extension_minutes": attempt.time_extension_minutes
        })
        return {"message": f"Extended {payload.extension_minutes} minutes for {payload.participant_id}"}
    else:
        # Global extension for everyone
        if exam.deadline:
            deadline = exam.deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            exam.deadline = deadline + timedelta(minutes=payload.extension_minutes)
        exam.duration_minutes += payload.extension_minutes
        await db.commit()

        await ws_manager.broadcast_to_participants({
            "event": "deadline_extended",
            "extension_minutes": payload.extension_minutes,
            "new_deadline": exam.deadline.isoformat() if exam.deadline else None,
            "duration_minutes": exam.duration_minutes
        })
        return {"message": f"Extended examination by {payload.extension_minutes} minutes globally"}

@router.post("/{exam_id}/end")
async def end_exam(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    now = datetime.now(timezone.utc)
    exam.status = "ended"
    exam.actual_end_time = now

    # Fetch immutable paper snapshot
    ver_stmt = select(PaperVersion).where(PaperVersion.id == exam.paper_version_id)
    ver_res = await db.execute(ver_stmt)
    paper_version = ver_res.scalar_one_or_none()

    # Automatically submit and evaluate any attempts that were in_progress or not yet submitted
    att_stmt = select(ExamAttempt).options(
        selectinload(ExamAttempt.answers),
        selectinload(ExamAttempt.result)
    ).where(ExamAttempt.exam_id == exam_id)
    att_res = await db.execute(att_stmt)
    attempts = att_res.scalars().all()

    for att in attempts:
        if att.status in ["in_progress", "in_waiting_room"]:
            att.status = "submitted"
            att.submitted_at = now
            if not att.result and paper_version:
                saved_answers_map = {
                    a.question_number: {
                        "selected_option": a.selected_option,
                        "is_marked_for_review": a.is_marked_for_review,
                        "time_spent_seconds": a.time_spent_seconds
                    }
                    for a in att.answers
                }
                eval_data = evaluate_participant_attempt(
                    questions_snapshot=paper_version.questions_snapshot,
                    saved_answers=saved_answers_map,
                    positive_marks_default=exam.positive_marks,
                    negative_marks_default=exam.negative_marking
                )
                res_obj = EvaluationResult(
                    attempt_id=att.id,
                    exam_id=exam.id,
                    participant_id=att.participant_id,
                    total_score=eval_data["total_score"],
                    max_possible_marks=eval_data["max_possible_marks"],
                    percentage=eval_data["percentage"],
                    correct_count=eval_data["correct_count"],
                    incorrect_count=eval_data["incorrect_count"],
                    unanswered_count=eval_data["unanswered_count"],
                    marked_for_review_count=eval_data["marked_for_review_count"],
                    accuracy=eval_data["accuracy"],
                    attempt_rate=eval_data["attempt_rate"],
                    completion_rate=eval_data["completion_rate"],
                    total_time_seconds=eval_data["total_time_seconds"],
                    avg_time_per_question=eval_data["avg_time_per_question"],
                    avg_time_per_attempted_question=eval_data["avg_time_per_attempted_question"],
                    fastest_question_time=eval_data["fastest_question_time"],
                    slowest_question_time=eval_data["slowest_question_time"],
                    topic_breakdown=eval_data["topic_breakdown"],
                    question_details=eval_data["question_details"]
                )
                db.add(res_obj)

    await db.commit()

    await ws_manager.broadcast_to_participants({
        "event": "exam_ended",
        "exam_id": exam.id,
        "ended_at": now.isoformat()
    })

    return {"message": "Examination ended and active attempts evaluated successfully", "exam": exam.to_dict()}

@router.post("/{exam_id}/release-results")
async def release_results(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    exam.status = "results_released"
    exam.results_released_at = datetime.now(timezone.utc)
    await db.commit()

    await ws_manager.broadcast_to_participants({
        "event": "results_released",
        "exam_id": exam.id,
        "results_released_at": exam.results_released_at.isoformat()
    })

    return {"message": "Results released successfully to all participants", "exam": exam.to_dict()}
