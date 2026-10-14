import os
import re
import csv
import io
import pandas as pd
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False


def validate_questions_list(questions: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Validates a list of questions, checks for:
    - 4 options present and non-empty
    - Valid correct answer (A, B, C, D)
    - Non-empty question text
    - Duplicate detection
    - Marks and negative marks validity
    Returns: (validated_questions, issues_list)
    """
    issues = []
    seen_texts = set()

    for idx, q in enumerate(questions, start=1):
        q["question_number"] = idx
        q_warnings = []

        q_text = (q.get("question_text") or "").strip()
        if not q_text:
            issues.append({
                "question_number": idx,
                "field": "question_text",
                "message": "Question statement cannot be empty.",
                "severity": "error"
            })
            q_warnings.append("Missing question text")
        elif q_text.lower() in seen_texts:
            issues.append({
                "question_number": idx,
                "field": "question_text",
                "message": "Duplicate question detected.",
                "severity": "warning"
            })
            q_warnings.append("Possible duplicate question")
        seen_texts.add(q_text.lower())

        # Validate options
        for opt in ["option_a", "option_b", "option_c", "option_d"]:
            val = (q.get(opt) or "").strip()
            q[opt] = val
            if not val:
                issues.append({
                    "question_number": idx,
                    "field": opt,
                    "message": f"Option {opt[-1].upper()} is missing or empty.",
                    "severity": "error"
                })
                q_warnings.append(f"Option {opt[-1].upper()} is empty")

        # Validate correct answer
        corr = (q.get("correct_answer") or "").strip().upper()
        # Clean potential formats like "Option B" or "B."
        if len(corr) > 1 and corr[0] in ["A", "B", "C", "D"]:
            corr = corr[0]
        elif "A" in corr and len(corr) < 8:
            corr = "A"
        elif "B" in corr and len(corr) < 8:
            corr = "B"
        elif "C" in corr and len(corr) < 8:
            corr = "C"
        elif "D" in corr and len(corr) < 8:
            corr = "D"

        q["correct_answer"] = corr
        if corr not in ["A", "B", "C", "D"]:
            issues.append({
                "question_number": idx,
                "field": "correct_answer",
                "message": f"Correct answer must be A, B, C, or D (got '{corr}').",
                "severity": "error"
            })
            q_warnings.append("Invalid or missing correct answer")

        # Marks validation
        try:
            q["marks"] = float(q.get("marks", 1.0))
            if q["marks"] <= 0:
                q_warnings.append("Marks should be greater than 0")
        except (ValueError, TypeError):
            q["marks"] = 1.0

        try:
            q["negative_marks"] = abs(float(q.get("negative_marks", 0.0)))
        except (ValueError, TypeError):
            q["negative_marks"] = 0.0

        # Topic & difficulty defaults
        q["topic"] = (q.get("topic") or "General").strip()
        q["difficulty"] = (q.get("difficulty") or "Medium").strip()
        q["explanation"] = (q.get("explanation") or "").strip()
        q["option_a_explanation"] = (q.get("option_a_explanation") or "").strip()
        q["option_b_explanation"] = (q.get("option_b_explanation") or "").strip()
        q["option_c_explanation"] = (q.get("option_c_explanation") or "").strip()
        q["option_d_explanation"] = (q.get("option_d_explanation") or "").strip()

        if not q["explanation"]:
            issues.append({
                "question_number": idx,
                "field": "explanation",
                "message": "Explanation is missing (recommended for detailed mistake reviews).",
                "severity": "warning"
            })

        q["has_warning"] = len(q_warnings) > 0
        q["warning_message"] = "; ".join(q_warnings) if q_warnings else None

    return questions, issues


def parse_structured_text(text: str) -> List[Dict[str, Any]]:
    """
    Parses plain text formatted like:
    Question 1: What is...?
    A. Option 1
    B. Option 2
    C. Option 3
    D. Option 4
    Correct Answer: B
    Explanation: Why B is correct
    Marks: 1
    Negative Marks: 0.25
    Topic: Science
    Difficulty: Medium
    """
    questions = []
    # Normalize line endings
    lines = [line.strip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    
    current_q = None
    collecting_field = None

    for line in lines:
        if not line:
            continue

        # Match Question heading: "Question 1:", "Q1.", "1.", "Question 1"
        q_match = re.match(r"^(?:Question|Q\.?)\s*(\d+)[\s.:-]+(.*)$", line, re.IGNORECASE)
        numbered_q_match = re.match(r"^(\d+)\.\s+(.*)$", line) if not q_match else None

        if q_match or numbered_q_match:
            if current_q:
                # Only keep current_q if it actually has content (at least one option or non-empty body)
                if current_q["option_a"] or current_q["option_b"] or current_q["correct_answer"]:
                    questions.append(current_q)
            q_num = int(q_match.group(1)) if q_match else int(numbered_q_match.group(1))
            q_body = q_match.group(2).strip() if q_match else numbered_q_match.group(2).strip()
            current_q = {
                "question_number": q_num,
                "question_text": q_body,
                "option_a": "",
                "option_b": "",
                "option_c": "",
                "option_d": "",
                "correct_answer": "",
                "explanation": "",
                "option_a_explanation": "",
                "option_b_explanation": "",
                "option_c_explanation": "",
                "option_d_explanation": "",
                "marks": 1.0,
                "negative_marks": 0.0,
                "topic": "General",
                "difficulty": "Medium"
            }
            collecting_field = "question_text"
            continue

        if not current_q:
            # First line without question header might be question 1
            current_q = {
                "question_number": 1,
                "question_text": line,
                "option_a": "",
                "option_b": "",
                "option_c": "",
                "option_d": "",
                "correct_answer": "",
                "explanation": "",
                "option_a_explanation": "",
                "option_b_explanation": "",
                "option_c_explanation": "",
                "option_d_explanation": "",
                "marks": 1.0,
                "negative_marks": 0.0,
                "topic": "General",
                "difficulty": "Medium"
            }
            collecting_field = "question_text"
            continue

        # Match Options: A. / A) / [A] / (A) / Option A:
        opt_match = re.match(r"^(?:Option\s+)?([A-D])[\s.:\)-]+(.*)$", line, re.IGNORECASE)
        if opt_match:
            opt_letter = opt_match.group(1).upper()
            opt_body = opt_match.group(2).strip()
            field_name = f"option_{opt_letter.lower()}"
            current_q[field_name] = opt_body
            collecting_field = field_name
            continue

        # Match Correct Answer
        ans_match = re.match(r"^(?:Correct\s+Answer|Answer|Ans)[\s.:-]+(.*)$", line, re.IGNORECASE)
        if ans_match:
            ans_val = ans_match.group(1).strip()
            current_q["correct_answer"] = ans_val
            collecting_field = "correct_answer"
            continue

        # Match Explanation
        exp_match = re.match(r"^(?:Explanation|Exp)[\s.:-]+(.*)$", line, re.IGNORECASE)
        if exp_match:
            current_q["explanation"] = exp_match.group(1).strip()
            collecting_field = "explanation"
            continue

        # Match Option Explanations: Option A Explanation: ...
        opt_exp_match = re.match(r"^(?:Option\s+)?([A-D])\s+Explanation[\s.:-]+(.*)$", line, re.IGNORECASE)
        if opt_exp_match:
            letter = opt_exp_match.group(1).lower()
            current_q[f"option_{letter}_explanation"] = opt_exp_match.group(2).strip()
            collecting_field = f"option_{letter}_explanation"
            continue

        # Match Marks
        marks_match = re.match(r"^Marks[\s.:-]+(\d+(?:\.\d+)?)$", line, re.IGNORECASE)
        if marks_match:
            current_q["marks"] = float(marks_match.group(1))
            collecting_field = None
            continue

        # Match Negative Marks
        neg_match = re.match(r"^Negative\s+Marks[\s.:-]+(\d+(?:\.\d+)?)$", line, re.IGNORECASE)
        if neg_match:
            current_q["negative_marks"] = float(neg_match.group(1))
            collecting_field = None
            continue

        # Match Topic
        topic_match = re.match(r"^Topic[\s.:-]+(.*)$", line, re.IGNORECASE)
        if topic_match:
            current_q["topic"] = topic_match.group(1).strip()
            collecting_field = None
            continue

        # Match Difficulty
        diff_match = re.match(r"^Difficulty[\s.:-]+(.*)$", line, re.IGNORECASE)
        if diff_match:
            current_q["difficulty"] = diff_match.group(1).strip()
            collecting_field = None
            continue

        # Continuation of previous field (e.g., multiline question or explanation)
        if collecting_field and current_q.get(collecting_field) is not None:
            current_q[collecting_field] += " " + line

    if current_q:
        questions.append(current_q)

    return questions


def parse_csv_file(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Parses a CSV file with support for standard and flexible column names.
    """
    df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8-sig")
    
    # Normalize column names: strip spaces, lowercase
    col_map = {}
    for col in df.columns:
        norm = col.strip().lower().replace(" ", "_").replace("-", "_")
        col_map[norm] = col

    def get_val(row, *candidates, default=""):
        for cand in candidates:
            if cand in col_map:
                val = row[col_map[cand]]
                if pd.notna(val):
                    return str(val).strip()
        return default

    questions = []
    for idx, (_, row) in enumerate(df.iterrows(), start=1):
        q_text = get_val(row, "question", "question_text", "question_statement", "statement")
        opt_a = get_val(row, "option_a", "optiona", "a", "opt_a")
        opt_b = get_val(row, "option_b", "optionb", "b", "opt_b")
        opt_c = get_val(row, "option_c", "optionc", "c", "opt_c")
        opt_d = get_val(row, "option_d", "optiond", "d", "opt_d")
        ans = get_val(row, "correct_answer", "answer", "correct", "ans", "key")
        exp = get_val(row, "explanation", "explain", "solution")
        
        opt_a_exp = get_val(row, "option_a_explanation", "opt_a_explanation")
        opt_b_exp = get_val(row, "option_b_explanation", "opt_b_explanation")
        opt_c_exp = get_val(row, "option_c_explanation", "opt_c_explanation")
        opt_d_exp = get_val(row, "option_d_explanation", "opt_d_explanation")
        
        marks_str = get_val(row, "marks", "positive_marks", default="1.0")
        neg_marks_str = get_val(row, "negative_marks", "neg_marks", default="0.0")
        topic = get_val(row, "topic", "category", default="General")
        difficulty = get_val(row, "difficulty", "level", default="Medium")

        try:
            marks = float(marks_str)
        except ValueError:
            marks = 1.0

        try:
            neg_marks = float(neg_marks_str)
        except ValueError:
            neg_marks = 0.0

        questions.append({
            "question_number": idx,
            "question_text": q_text,
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "correct_answer": ans,
            "explanation": exp,
            "option_a_explanation": opt_a_exp,
            "option_b_explanation": opt_b_exp,
            "option_c_explanation": opt_c_exp,
            "option_d_explanation": opt_d_exp,
            "marks": marks,
            "negative_marks": neg_marks,
            "topic": topic,
            "difficulty": difficulty
        })

    return questions


def parse_pdf_file(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text from PDF and passes it to structured parser.
    Supports OCR fallback for scanned pages when available.
    """
    reader = PdfReader(io.BytesIO(file_content))
    extracted_text = []

    for page_num, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            extracted_text.append(page_text)
        elif OCR_AVAILABLE:
            # Fallback to OCR if page has no extracted text
            try:
                for img in page.images:
                    pil_img = Image.open(io.BytesIO(img.data))
                    ocr_res = pytesseract.image_to_string(pil_img)
                    if ocr_res.strip():
                        extracted_text.append(ocr_res)
            except Exception:
                pass

    full_text = "\n".join(extracted_text)
    return parse_structured_text(full_text)


def parse_docx_file(file_content: bytes) -> List[Dict[str, Any]]:
    """
    Extracts paragraphs from DOCX document and passes to structured parser.
    """
    doc = docx.Document(io.BytesIO(file_content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n".join(paragraphs)
    return parse_structured_text(full_text)


def parse_file_by_extension(filename: str, content: bytes) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Main router for file processing: detects extension and runs appropriate parser.
    Returns (validated_questions, issues_list).
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".csv":
        raw_questions = parse_csv_file(content)
    elif ext == ".pdf":
        raw_questions = parse_pdf_file(content)
    elif ext in [".docx", ".doc"]:
        raw_questions = parse_docx_file(content)
    elif ext in [".txt", ".text"]:
        text = content.decode("utf-8", errors="replace")
        raw_questions = parse_structured_text(text)
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: PDF, CSV, DOC, DOCX, TXT.")

    return validate_questions_list(raw_questions)
