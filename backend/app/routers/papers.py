import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.paper import QuestionPaper, Question, PaperVersion
from backend.app.schemas.paper import (
    PaperSummaryResponse,
    PaperCreateManual,
    PaperUpdate,
    PaperValidationResult,
    QuestionSchema,
    ValidationWarning
)
from backend.app.services.auth_service import require_admin
from backend.app.services.parser_service import (
    parse_file_by_extension,
    parse_structured_text,
    validate_questions_list
)

router = APIRouter(prefix="/api/papers", tags=["Question Papers"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_question_paper(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(""),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    filename = file.filename or "uploaded_paper.txt"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = [".pdf", ".csv", ".doc", ".docx", ".txt"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Save original file to uploads
    safe_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(safe_path, "wb") as f:
        f.write(content)

    paper_title = title if title and title.strip() else os.path.splitext(filename)[0]

    try:
        parsed_questions, issues = parse_file_by_extension(filename, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    paper = QuestionPaper(
        title=paper_title,
        description=description,
        original_filename=filename,
        file_type=ext.replace(".", ""),
        file_path=safe_path,
        status="draft",
        total_questions=len(parsed_questions)
    )
    db.add(paper)
    await db.flush()

    # Add questions
    for q in parsed_questions:
        q_obj = Question(
            paper_id=paper.id,
            question_number=q["question_number"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation", ""),
            option_a_explanation=q.get("option_a_explanation", ""),
            option_b_explanation=q.get("option_b_explanation", ""),
            option_c_explanation=q.get("option_c_explanation", ""),
            option_d_explanation=q.get("option_d_explanation", ""),
            marks=q.get("marks", 1.0),
            negative_marks=q.get("negative_marks", 0.0),
            topic=q.get("topic", "General"),
            difficulty=q.get("difficulty", "Medium"),
            has_warning=q.get("has_warning", False),
            warning_message=q.get("warning_message")
        )
        db.add(q_obj)

    await db.commit()
    await db.refresh(paper)

    errors_count = sum(1 for i in issues if i.get("severity") == "error")
    warnings_count = sum(1 for i in issues if i.get("severity") == "warning")

    return {
        "paper_id": paper.id,
        "title": paper.title,
        "total_questions": len(parsed_questions),
        "is_valid": errors_count == 0,
        "errors_count": errors_count,
        "warnings_count": warnings_count,
        "issues": issues,
        "questions": parsed_questions
    }

@router.post("/manual")
async def create_paper_manual(
    payload: PaperCreateManual,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if payload.raw_text and payload.raw_text.strip():
        raw_questions = parse_structured_text(payload.raw_text)
        validated_q, issues = validate_questions_list(raw_questions)
    elif payload.questions:
        raw_dict = [q.model_dump() for q in payload.questions]
        validated_q, issues = validate_questions_list(raw_dict)
    else:
        raise HTTPException(status_code=400, detail="Provide either raw_text or structured questions.")

    paper = QuestionPaper(
        title=payload.title,
        description=payload.description or "",
        file_type="manual",
        status="draft",
        total_questions=len(validated_q)
    )
    db.add(paper)
    await db.flush()

    for q in validated_q:
        q_obj = Question(
            paper_id=paper.id,
            question_number=q["question_number"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation", ""),
            option_a_explanation=q.get("option_a_explanation", ""),
            option_b_explanation=q.get("option_b_explanation", ""),
            option_c_explanation=q.get("option_c_explanation", ""),
            option_d_explanation=q.get("option_d_explanation", ""),
            marks=q.get("marks", 1.0),
            negative_marks=q.get("negative_marks", 0.0),
            topic=q.get("topic", "General"),
            difficulty=q.get("difficulty", "Medium"),
            has_warning=q.get("has_warning", False),
            warning_message=q.get("warning_message")
        )
        db.add(q_obj)

    await db.commit()
    await db.refresh(paper)

    errors_count = sum(1 for i in issues if i.get("severity") == "error")
    warnings_count = sum(1 for i in issues if i.get("severity") == "warning")

    return {
        "paper_id": paper.id,
        "title": paper.title,
        "total_questions": len(validated_q),
        "is_valid": errors_count == 0,
        "errors_count": errors_count,
        "warnings_count": warnings_count,
        "issues": issues,
        "questions": validated_q
    }

@router.get("", response_model=List[PaperSummaryResponse])
async def list_papers(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(QuestionPaper).order_by(QuestionPaper.created_at.desc())
    res = await db.execute(stmt)
    papers = res.scalars().all()
    return [PaperSummaryResponse(**p.to_dict()) for p in papers]

@router.get("/{paper_id}")
async def get_paper_details(
    paper_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(QuestionPaper).options(selectinload(QuestionPaper.questions)).where(QuestionPaper.id == paper_id)
    res = await db.execute(stmt)
    paper = res.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    questions_data = [q.to_dict(include_correct=True) for q in paper.questions]
    validated_q, issues = validate_questions_list(questions_data)

    errors_count = sum(1 for i in issues if i.get("severity") == "error")
    warnings_count = sum(1 for i in issues if i.get("severity") == "warning")

    return {
        "paper": paper.to_dict(),
        "total_questions": len(validated_q),
        "is_valid": errors_count == 0,
        "errors_count": errors_count,
        "warnings_count": warnings_count,
        "issues": issues,
        "questions": validated_q
    }

@router.put("/{paper_id}")
async def update_paper_questions(
    paper_id: str,
    payload: PaperUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(QuestionPaper).where(QuestionPaper.id == paper_id)
    res = await db.execute(stmt)
    paper = res.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    paper.title = payload.title
    paper.description = payload.description or ""

    # Re-validate updated questions
    raw_dict = [q.model_dump() for q in payload.questions]
    validated_q, issues = validate_questions_list(raw_dict)

    # Delete existing questions and replace with new ones
    del_stmt = delete(Question).where(Question.paper_id == paper_id)
    await db.execute(del_stmt)

    for q in validated_q:
        q_obj = Question(
            paper_id=paper_id,
            question_number=q["question_number"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation", ""),
            option_a_explanation=q.get("option_a_explanation", ""),
            option_b_explanation=q.get("option_b_explanation", ""),
            option_c_explanation=q.get("option_c_explanation", ""),
            option_d_explanation=q.get("option_d_explanation", ""),
            marks=q.get("marks", 1.0),
            negative_marks=q.get("negative_marks", 0.0),
            topic=q.get("topic", "General"),
            difficulty=q.get("difficulty", "Medium"),
            has_warning=q.get("has_warning", False),
            warning_message=q.get("warning_message")
        )
        db.add(q_obj)

    errors_count = sum(1 for i in issues if i.get("severity") == "error")
    paper.total_questions = len(validated_q)
    paper.status = "approved" if errors_count == 0 else "draft"

    await db.commit()
    await db.refresh(paper)

    return {
        "message": "Question paper updated successfully",
        "paper_id": paper.id,
        "status": paper.status,
        "total_questions": len(validated_q),
        "errors_count": errors_count,
        "warnings_count": sum(1 for i in issues if i.get("severity") == "warning"),
        "issues": issues,
        "questions": validated_q
    }

@router.delete("/{paper_id}")
async def delete_paper(
    paper_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(QuestionPaper).where(QuestionPaper.id == paper_id)
    res = await db.execute(stmt)
    paper = res.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")

    await db.delete(paper)
    await db.commit()
    return {"message": "Question paper deleted successfully"}
