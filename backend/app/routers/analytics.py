from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any, Optional

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.exam import Examination
from backend.app.models.attempt import ExamAttempt
from backend.app.models.result import EvaluationResult
from backend.app.services.auth_service import require_admin

router = APIRouter(prefix="/api/analytics", tags=["Admin Analytics"])

@router.get("/{exam_id}/comparison")
async def get_participant_comparison(
    exam_id: str,
    sort_by: Optional[str] = "score",  # 'score', 'percentage', 'time', 'accuracy'
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Examination).where(Examination.id == exam_id)
    res = await db.execute(stmt)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    # Fetch attempts and evaluation results for all 4 participants
    att_stmt = select(ExamAttempt).options(
        selectinload(ExamAttempt.result),
        selectinload(ExamAttempt.answers)
    ).where(ExamAttempt.exam_id == exam_id)
    att_res = await db.execute(att_stmt)
    attempts = {a.participant_id: a for a in att_res.scalars().all()}

    participants_comparison = []

    for p in settings.PARTICIPANTS:
        p_id = p["id"]
        attempt = attempts.get(p_id)

        if not attempt or not attempt.result:
            participants_comparison.append({
                "participant_id": p_id,
                "name": p["name"],
                "status": attempt.status if attempt else "not_joined",
                "total_score": 0.0,
                "max_possible_marks": exam.total_marks or 0.0,
                "percentage": 0.0,
                "correct_count": 0,
                "incorrect_count": 0,
                "unanswered_count": exam.total_questions or 0,
                "accuracy": 0.0,
                "attempt_rate": 0.0,
                "completion_rate": 0.0,
                "total_time_seconds": 0.0,
                "avg_time_per_question": 0.0,
                "topic_breakdown": [],
                "rank": None
            })
        else:
            r = attempt.result
            participants_comparison.append({
                "participant_id": p_id,
                "name": p["name"],
                "status": attempt.status,
                "total_score": r.total_score,
                "max_possible_marks": r.max_possible_marks,
                "percentage": r.percentage,
                "correct_count": r.correct_count,
                "incorrect_count": r.incorrect_count,
                "unanswered_count": r.unanswered_count,
                "accuracy": r.accuracy,
                "attempt_rate": r.attempt_rate,
                "completion_rate": r.completion_rate,
                "total_time_seconds": r.total_time_seconds,
                "avg_time_per_question": r.avg_time_per_question,
                "topic_breakdown": r.topic_breakdown or [],
                "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                "rank": None
            })

    # Tie-breaking logic: Documented tie rule: Highest score first; if equal, highest accuracy first; if still equal, earliest submission time.
    def sort_key(p):
        score = p["total_score"]
        acc = p["accuracy"]
        time_sec = -p["total_time_seconds"]  # Less time is better
        return (score, acc, time_sec)

    sorted_participants = sorted(participants_comparison, key=sort_key, reverse=True)

    # Assign rank
    for rank_idx, p in enumerate(sorted_participants, start=1):
        p["rank"] = rank_idx

    # Apply user requested sorting if specified
    if sort_by == "time":
        sorted_participants.sort(key=lambda x: x["total_time_seconds"])
    elif sort_by == "accuracy":
        sorted_participants.sort(key=lambda x: x["accuracy"], reverse=True)
    elif sort_by == "percentage":
        sorted_participants.sort(key=lambda x: x["percentage"], reverse=True)
    elif sort_by == "score":
        sorted_participants.sort(key=lambda x: x["total_score"], reverse=True)

    # Aggregated topic comparisons across all 4 participants
    topic_comparison_map: Dict[str, Dict[str, Any]] = {}
    for p in sorted_participants:
        for t in p.get("topic_breakdown", []):
            top_name = t.get("topic", "General")
            if top_name not in topic_comparison_map:
                topic_comparison_map[top_name] = {"topic": top_name}
            topic_comparison_map[top_name][p["participant_id"]] = {
                "score": t.get("score", 0),
                "accuracy": t.get("accuracy", 0),
                "correct": t.get("correct", 0),
                "total": t.get("total", 0)
            }

    # Chart-ready datasets
    marks_bar_chart = [
        {"participant": p["participant_id"], "score": p["total_score"], "max": p["max_possible_marks"]}
        for p in sorted_participants
    ]
    breakdown_stacked_chart = [
        {
            "participant": p["participant_id"],
            "correct": p["correct_count"],
            "incorrect": p["incorrect_count"],
            "unanswered": p["unanswered_count"]
        }
        for p in sorted_participants
    ]
    time_comparison_chart = [
        {
            "participant": p["participant_id"],
            "total_time_min": round(p["total_time_seconds"] / 60, 1),
            "avg_time_sec": p["avg_time_per_question"]
        }
        for p in sorted_participants
    ]

    return {
        "exam": exam.to_dict(),
        "participants": sorted_participants,
        "charts": {
            "marks": marks_bar_chart,
            "breakdown": breakdown_stacked_chart,
            "time": time_comparison_chart
        },
        "topic_comparison": list(topic_comparison_map.values()),
        "tie_breaking_policy": "Primary: Marks obtained. Secondary: Accuracy percentage. Tertiary: Total examination time."
    }
