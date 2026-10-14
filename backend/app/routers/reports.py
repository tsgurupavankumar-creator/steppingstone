from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.exam import Examination
from backend.app.models.result import EvaluationResult
from backend.app.models.attempt import ExamAttempt
from backend.app.services.auth_service import get_current_user, require_admin
from backend.app.services.pdf_service import generate_report_card_pdf, generate_mistake_review_pdf
from backend.app.services.export_service import generate_results_csv, generate_results_excel

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

def check_report_access(exam: Examination, participant_id: str, current_user: User):
    """Enforces strict participant isolation and result-release policy"""
    if current_user.role == "participant":
        if current_user.username != participant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot view another participant's report card."
            )
        if exam.status != "results_released":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Results for this examination have not been released by the administrator yet."
            )

@router.get("/{exam_id}/participant/{participant_id}")
async def get_participant_report_card(
    exam_id: str,
    participant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    check_report_access(exam, participant_id, current_user)

    eval_stmt = select(EvaluationResult).where(
        and_(EvaluationResult.exam_id == exam_id, EvaluationResult.participant_id == participant_id)
    )
    eval_res = await db.execute(eval_stmt)
    result = eval_res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation result not found for this participant.")

    # Get participant full name
    u_stmt = select(User).where(User.username == participant_id)
    u_res = await db.execute(u_stmt)
    user_obj = u_res.scalar_one_or_none()
    full_name = user_obj.full_name if user_obj else participant_id

    return {
        "exam": exam.to_dict(),
        "participant_id": participant_id,
        "participant_name": full_name,
        "result": result.to_dict()
    }

@router.get("/{exam_id}/participant/{participant_id}/pdf")
async def download_report_card_pdf(
    exam_id: str,
    participant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    check_report_access(exam, participant_id, current_user)

    eval_stmt = select(EvaluationResult).where(
        and_(EvaluationResult.exam_id == exam_id, EvaluationResult.participant_id == participant_id)
    )
    eval_res = await db.execute(eval_stmt)
    result = eval_res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation result not found.")

    u_stmt = select(User).where(User.username == participant_id)
    u_res = await db.execute(u_stmt)
    user_obj = u_res.scalar_one_or_none()
    full_name = user_obj.full_name if user_obj else participant_id

    exam_date = exam.actual_start_time.strftime("%Y-%m-%d") if exam.actual_start_time else "N/A"
    pdf_bytes = generate_report_card_pdf(
        participant_id=participant_id,
        participant_name=full_name,
        exam_title=exam.title,
        exam_date=exam_date,
        result_data=result.to_dict()
    )

    filename = f"Report_{participant_id}_{exam.title.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{exam_id}/participant/{participant_id}/mistakes-pdf")
async def download_mistakes_review_pdf(
    exam_id: str,
    participant_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    check_report_access(exam, participant_id, current_user)

    eval_stmt = select(EvaluationResult).where(
        and_(EvaluationResult.exam_id == exam_id, EvaluationResult.participant_id == participant_id)
    )
    eval_res = await db.execute(eval_stmt)
    result = eval_res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation result not found.")

    pdf_bytes = generate_mistake_review_pdf(
        participant_id=participant_id,
        exam_title=exam.title,
        question_details=result.question_details or []
    )

    filename = f"MistakeReview_{participant_id}_{exam.title.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{exam_id}/participant/{participant_id}/mistakes")
async def get_mistakes_review_data(
    exam_id: str,
    participant_id: str,
    filter_by: Optional[str] = "all",  # 'all', 'incorrect', 'correct', 'unanswered', 'marked'
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    check_report_access(exam, participant_id, current_user)

    eval_stmt = select(EvaluationResult).where(
        and_(EvaluationResult.exam_id == exam_id, EvaluationResult.participant_id == participant_id)
    )
    eval_res = await db.execute(eval_stmt)
    result = eval_res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation result not found.")

    questions = result.question_details or []

    if filter_by == "incorrect":
        questions = [q for q in questions if q.get("status") == "incorrect"]
    elif filter_by == "correct":
        questions = [q for q in questions if q.get("status") == "correct"]
    elif filter_by == "unanswered":
        questions = [q for q in questions if q.get("status") == "unanswered"]
    elif filter_by == "marked":
        questions = [q for q in questions if q.get("is_marked_for_review")]

    return {
        "exam_title": exam.title,
        "participant_id": participant_id,
        "total_filtered": len(questions),
        "topic_breakdown": result.topic_breakdown,
        "questions": questions
    }

@router.get("/{exam_id}/export/csv")
async def export_results_csv(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    eval_stmt = select(EvaluationResult).where(EvaluationResult.exam_id == exam_id)
    eval_res = await db.execute(eval_stmt)
    results = eval_res.scalars().all()

    records = []
    for r in sorted(results, key=lambda x: x.total_score, reverse=True):
        records.append({
            "Participant ID": r.participant_id,
            "Total Score": r.total_score,
            "Max Marks": r.max_possible_marks,
            "Percentage (%)": r.percentage,
            "Correct Answers": r.correct_count,
            "Incorrect Answers": r.incorrect_count,
            "Unanswered": r.unanswered_count,
            "Accuracy (%)": r.accuracy,
            "Attempt Rate (%)": r.attempt_rate,
            "Completion Rate (%)": r.completion_rate,
            "Total Time (sec)": r.total_time_seconds,
            "Avg Time / Question (sec)": r.avg_time_per_question,
            "Fastest Response (sec)": r.fastest_question_time or "N/A",
            "Slowest Response (sec)": r.slowest_question_time or "N/A"
        })

    csv_bytes = generate_results_csv(records)
    filename = f"Results_{exam.title.replace(' ', '_')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{exam_id}/export/excel")
async def export_results_excel(
    exam_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    eval_stmt = select(EvaluationResult).where(EvaluationResult.exam_id == exam_id)
    eval_res = await db.execute(eval_stmt)
    results = eval_res.scalars().all()

    records = []
    for r in sorted(results, key=lambda x: x.total_score, reverse=True):
        records.append({
            "Participant ID": r.participant_id,
            "Total Score": r.total_score,
            "Max Marks": r.max_possible_marks,
            "Percentage (%)": r.percentage,
            "Correct Answers": r.correct_count,
            "Incorrect Answers": r.incorrect_count,
            "Unanswered": r.unanswered_count,
            "Accuracy (%)": r.accuracy,
            "Attempt Rate (%)": r.attempt_rate,
            "Completion Rate (%)": r.completion_rate,
            "Total Time (sec)": r.total_time_seconds,
            "Avg Time / Question (sec)": r.avg_time_per_question,
            "Fastest Response (sec)": r.fastest_question_time or "N/A",
            "Slowest Response (sec)": r.slowest_question_time or "N/A"
        })

    xlsx_bytes = generate_results_excel(records, sheet_name=exam.title[:30])
    filename = f"Results_{exam.title.replace(' ', '_')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/history")
async def get_exam_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).order_by(Examination.created_at.desc())
    res = await db.execute(stmt)
    exams = res.scalars().all()

    history = []
    for e in exams:
        # Check attempts
        att_stmt = select(ExamAttempt).options(selectinload(ExamAttempt.result)).where(ExamAttempt.exam_id == e.id)
        att_res = await db.execute(att_stmt)
        attempts = att_res.scalars().all()

        if current_user.role == "participant":
            # Only include if participant has an attempt and results are released
            my_att = next((a for a in attempts if a.participant_id == current_user.username), None)
            if my_att and e.status == "results_released":
                history.append({
                    "exam": e.to_dict(),
                    "my_result": my_att.result.to_dict() if my_att.result else None
                })
        else:
            # Admin sees all history with participant summaries
            results_summary = [a.result.to_dict() for a in attempts if a.result]
            history.append({
                "exam": e.to_dict(),
                "total_attempts": len(attempts),
                "submitted_count": sum(1 for a in attempts if a.status == "submitted"),
                "results": results_summary
            })

    return history
