from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.exam import Examination
from backend.app.models.paper import PaperVersion
from backend.app.models.attempt import ExamAttempt, ParticipantAnswer, QuestionTimingLog
from backend.app.models.result import EvaluationResult
from backend.app.schemas.exam import AnswerSaveRequest, SyncAnswersRequest, ExamSubmissionConfirm
from backend.app.services.auth_service import get_current_user, require_participant
from backend.app.services.eval_service import evaluate_participant_attempt
from backend.app.services.ws_manager import ws_manager

router = APIRouter(prefix="/api/session", tags=["Exam Session"])

def calculate_authoritative_remaining_seconds(exam: Examination, attempt: ExamAttempt) -> float:
    """Calculates authoritative remaining time in seconds strictly from backend clock"""
    now = datetime.now(timezone.utc)
    if exam.status in ["ended", "results_released"]:
        return 0.0

    # Ensure deadline is timezone-aware
    deadline = exam.deadline
    if deadline and deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    if not deadline:
        return float(exam.duration_minutes * 60)

    # Add individual time extension if granted
    if attempt.time_extension_minutes > 0:
        deadline += timedelta(minutes=attempt.time_extension_minutes)

    if exam.status == "paused":
        # When paused, remaining time is frozen from paused_at
        paused_at = exam.paused_at
        if paused_at and paused_at.tzinfo is None:
            paused_at = paused_at.replace(tzinfo=timezone.utc)
        if paused_at:
            rem = (deadline - paused_at).total_seconds()
            return max(0.0, rem)

    rem = (deadline - now).total_seconds()
    return max(0.0, rem)

@router.get("/{exam_id}/entry")
async def enter_exam_session(
    exam_id: str,
    user: User = Depends(require_participant),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    # Get or create participant attempt
    att_stmt = select(ExamAttempt).options(selectinload(ExamAttempt.answers)).where(
        and_(ExamAttempt.exam_id == exam_id, ExamAttempt.participant_id == user.username)
    )
    att_res = await db.execute(att_stmt)
    attempt = att_res.scalar_one_or_none()

    if not attempt:
        attempt = ExamAttempt(
            exam_id=exam_id,
            participant_id=user.username,
            status="in_waiting_room" if exam.status in ["scheduled", "waiting_room"] else "in_progress",
            started_at=datetime.now(timezone.utc) if exam.status == "live" else None,
            is_connected=True,
            last_sync_at=datetime.now(timezone.utc)
        )
        db.add(attempt)
        await db.commit()
        await db.refresh(attempt)
    else:
        attempt.is_connected = True
        attempt.last_sync_at = datetime.now(timezone.utc)
        if exam.status == "live" and attempt.status == "in_waiting_room":
            attempt.status = "in_progress"
            attempt.started_at = datetime.now(timezone.utc)
        await db.commit()

    rem_seconds = calculate_authoritative_remaining_seconds(exam, attempt)

    return {
        "exam": exam.to_dict(),
        "attempt": attempt.to_dict(),
        "remaining_seconds": rem_seconds,
        "is_waiting_room": exam.status in ["scheduled", "waiting_room"] or attempt.status == "in_waiting_room",
        "is_paused": exam.status == "paused",
        "is_ended": exam.status in ["ended", "results_released"] or attempt.status in ["submitted", "timed_out"]
    }

@router.get("/{exam_id}/questions")
async def get_exam_questions_for_participant(
    exam_id: str,
    user: User = Depends(require_participant),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    if exam.status in ["scheduled", "waiting_room"]:
        raise HTTPException(status_code=403, detail="Examination has not started yet. Please wait in the waiting room.")

    ver_stmt = select(PaperVersion).where(PaperVersion.id == exam.paper_version_id)
    ver_res = await db.execute(ver_stmt)
    paper_version = ver_res.scalar_one_or_none()
    if not paper_version:
        raise HTTPException(status_code=500, detail="Frozen paper version missing.")

    # Answer Protection: Stripping correct_answer and explanations!
    safe_questions = []
    for q in paper_version.questions_snapshot:
        safe_questions.append({
            "question_number": q["question_number"],
            "question_text": q["question_text"],
            "option_a": q["option_a"],
            "option_b": q["option_b"],
            "option_c": q["option_c"],
            "option_d": q["option_d"],
            "marks": q.get("marks", exam.positive_marks),
            "negative_marks": q.get("negative_marks", exam.negative_marking),
            "topic": q.get("topic", "General"),
            "difficulty": q.get("difficulty", "Medium")
        })

    return {
        "exam_id": exam.id,
        "title": exam.title,
        "total_questions": len(safe_questions),
        "allow_return_previous": exam.allow_return_previous,
        "allow_change_answers": exam.allow_change_answers,
        "questions": safe_questions
    }

@router.get("/{exam_id}/state")
async def get_participant_exam_state(
    exam_id: str,
    user: User = Depends(require_participant),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    att_stmt = select(ExamAttempt).options(selectinload(ExamAttempt.answers)).where(
        and_(ExamAttempt.exam_id == exam_id, ExamAttempt.participant_id == user.username)
    )
    att_res = await db.execute(att_stmt)
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found. Join session first.")

    rem_seconds = calculate_authoritative_remaining_seconds(exam, attempt)

    answers_map = {}
    for ans in attempt.answers:
        answers_map[ans.question_number] = {
            "selected_option": ans.selected_option,
            "is_marked_for_review": ans.is_marked_for_review,
            "time_spent_seconds": ans.time_spent_seconds,
            "change_count": ans.change_count,
            "saved_at": ans.saved_at.isoformat() if ans.saved_at else None
        }

    return {
        "attempt_id": attempt.id,
        "participant_id": attempt.participant_id,
        "status": attempt.status,
        "is_paused": exam.status == "paused",
        "remaining_seconds": rem_seconds,
        "current_question_index": attempt.current_question_index,
        "answers": answers_map,
        "last_sync_at": attempt.last_sync_at.isoformat() if attempt.last_sync_at else None
    }

@router.post("/{exam_id}/save-answer")
async def save_answer(
    exam_id: str,
    payload: AnswerSaveRequest,
    user: User = Depends(require_participant),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    att_stmt = select(ExamAttempt).options(selectinload(ExamAttempt.answers)).where(
        and_(ExamAttempt.exam_id == exam_id, ExamAttempt.participant_id == user.username)
    )
    att_res = await db.execute(att_stmt)
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.status in ["submitted", "timed_out"]:
        raise HTTPException(status_code=400, detail="Attempt has already been submitted and locked.")

    rem_seconds = calculate_authoritative_remaining_seconds(exam, attempt)
    if rem_seconds <= 0 and exam.status not in ["paused"]:
        attempt.status = "timed_out"
        await db.commit()
        raise HTTPException(status_code=400, detail="Examination deadline expired.")

    # Find or create ParticipantAnswer
    ans_obj = None
    for a in attempt.answers:
        if a.question_number == payload.question_number:
            ans_obj = a
            break

    if not ans_obj:
        ans_obj = ParticipantAnswer(
            attempt_id=attempt.id,
            question_number=payload.question_number,
            selected_option=payload.selected_option,
            is_marked_for_review=payload.is_marked_for_review or False,
            time_spent_seconds=max(0.0, payload.time_spent_delta),
            change_count=1 if payload.selected_option else 0
        )
        db.add(ans_obj)
    else:
        # Check if answer change is disallowed by exam rules
        if not exam.allow_change_answers and ans_obj.selected_option and payload.selected_option != ans_obj.selected_option:
            raise HTTPException(status_code=403, detail="Answer modification is disallowed by examination rules.")

        if payload.selected_option != ans_obj.selected_option:
            ans_obj.change_count += 1
            ans_obj.selected_option = payload.selected_option

        if payload.is_marked_for_review is not None:
            ans_obj.is_marked_for_review = payload.is_marked_for_review

        ans_obj.time_spent_seconds += max(0.0, payload.time_spent_delta)

    attempt.last_sync_at = datetime.now(timezone.utc)
    attempt.current_question_index = payload.question_number - 1
    await db.commit()

    # Broadcast update to admin live monitor
    answered_count = sum(1 for a in attempt.answers if a.selected_option)
    marked_count = sum(1 for a in attempt.answers if a.is_marked_for_review)
    total_q = exam.total_questions or 1
    progress_pct = round((answered_count / total_q) * 100.0, 1)

    await ws_manager.broadcast_to_admins({
        "event": "participant_progress",
        "exam_id": exam_id,
        "participant_id": user.username,
        "answered_count": answered_count,
        "unanswered_count": total_q - answered_count,
        "marked_count": marked_count,
        "progress_percentage": progress_pct,
        "time_remaining_seconds": rem_seconds,
        "last_sync_at": attempt.last_sync_at.isoformat()
    })

    return {
        "status": "saved",
        "question_number": payload.question_number,
        "selected_option": payload.selected_option,
        "is_marked_for_review": payload.is_marked_for_review,
        "remaining_seconds": rem_seconds,
        "sync_timestamp": attempt.last_sync_at.isoformat()
    }

@router.post("/{exam_id}/sync")
async def sync_offline_answers(
    exam_id: str,
    payload: SyncAnswersRequest,
    user: User = Depends(require_participant),
    db: AsyncSession = Depends(get_db)
):
    """
    Network Disconnection Recovery: Safe batch synchronization of locally queued answers.
    """
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    att_stmt = select(ExamAttempt).options(selectinload(ExamAttempt.answers)).where(
        and_(ExamAttempt.exam_id == exam_id, ExamAttempt.participant_id == user.username)
    )
    att_res = await db.execute(att_stmt)
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.status in ["submitted", "timed_out"]:
        return {"status": "locked", "message": "Attempt already submitted."}

    existing_answers = {a.question_number: a for a in attempt.answers}

    for item in payload.answers:
        q_num = item.question_number
        if q_num in existing_answers:
            ans_obj = existing_answers[q_num]
            if ans_obj.selected_option != item.selected_option:
                ans_obj.selected_option = item.selected_option
                ans_obj.change_count += 1
            if item.is_marked_for_review is not None:
                ans_obj.is_marked_for_review = item.is_marked_for_review
            ans_obj.time_spent_seconds += max(0.0, item.time_spent_delta)
        else:
            ans_obj = ParticipantAnswer(
                attempt_id=attempt.id,
                question_number=q_num,
                selected_option=item.selected_option,
                is_marked_for_review=item.is_marked_for_review or False,
                time_spent_seconds=max(0.0, item.time_spent_delta),
                change_count=1 if item.selected_option else 0
            )
            db.add(ans_obj)

    attempt.last_sync_at = datetime.now(timezone.utc)
    attempt.is_connected = True
    await db.commit()

    rem_seconds = calculate_authoritative_remaining_seconds(exam, attempt)

    return {
        "status": "synced",
        "synced_count": len(payload.answers),
        "remaining_seconds": rem_seconds,
        "sync_timestamp": attempt.last_sync_at.isoformat()
    }

@router.post("/{exam_id}/submit")
async def submit_examination(
    exam_id: str,
    payload: ExamSubmissionConfirm,
    user: User = Depends(require_participant),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    att_stmt = select(ExamAttempt).options(
        selectinload(ExamAttempt.answers),
        selectinload(ExamAttempt.result)
    ).where(
        and_(ExamAttempt.exam_id == exam_id, ExamAttempt.participant_id == user.username)
    )
    att_res = await db.execute(att_stmt)
    attempt = att_res.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Idempotent submission: if already submitted, return existing confirmation
    if attempt.status in ["submitted", "timed_out"] and attempt.result:
        return {
            "status": "already_submitted",
            "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "message": "Examination has already been submitted."
        }

    # Lock attempt
    attempt.status = "submitted"
    attempt.submitted_at = datetime.now(timezone.utc)
    attempt.last_sync_at = datetime.now(timezone.utc)

    # Fetch immutable paper snapshot
    ver_stmt = select(PaperVersion).where(PaperVersion.id == exam.paper_version_id)
    ver_res = await db.execute(ver_stmt)
    paper_version = ver_res.scalar_one_or_none()

    # Map participant answers
    saved_answers_map = {}
    for a in attempt.answers:
        saved_answers_map[a.question_number] = {
            "selected_option": a.selected_option,
            "is_marked_for_review": a.is_marked_for_review,
            "time_spent_seconds": a.time_spent_seconds
        }

    # Evaluate attempt
    eval_data = evaluate_participant_attempt(
        questions_snapshot=paper_version.questions_snapshot,
        saved_answers=saved_answers_map,
        positive_marks_default=exam.positive_marks,
        negative_marks_default=exam.negative_marking
    )

    result_obj = EvaluationResult(
        attempt_id=attempt.id,
        exam_id=exam.id,
        participant_id=user.username,
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
    db.add(result_obj)
    await db.commit()

    # Broadcast to admin live monitor
    await ws_manager.broadcast_to_admins({
        "event": "participant_submitted",
        "exam_id": exam_id,
        "participant_id": user.username,
        "submitted_at": attempt.submitted_at.isoformat(),
        "total_score": eval_data["total_score"],
        "percentage": eval_data["percentage"]
    })

    return {
        "status": "submitted",
        "attempt_id": attempt.id,
        "submitted_at": attempt.submitted_at.isoformat(),
        "message": "Examination submitted successfully."
    }
