import os
import pytest
from backend.app.services.parser_service import (
    parse_file_by_extension,
    parse_structured_text,
    validate_questions_list
)

def test_parse_sample_txt():
    path = os.path.join("sample_papers", "sample_general_science.txt")
    with open(path, "rb") as f:
        content = f.read()
    questions, issues = parse_file_by_extension("sample_general_science.txt", content)
    assert len(questions) == 5
    assert questions[0]["correct_answer"] == "B"
    assert questions[0]["option_a"] == "Oxygen"

def test_parse_sample_csv():
    path = os.path.join("sample_papers", "sample_geography.csv")
    with open(path, "rb") as f:
        content = f.read()
    questions, issues = parse_file_by_extension("sample_geography.csv", content)
    assert len(questions) == 5
    assert questions[0]["correct_answer"] == "B"
    assert "Nile River" in questions[0]["option_b"]

def test_parse_sample_docx():
    path = os.path.join("sample_papers", "sample_history.docx")
    with open(path, "rb") as f:
        content = f.read()
    questions, issues = parse_file_by_extension("sample_history.docx", content)
    assert len(questions) == 4
    assert questions[0]["correct_answer"] == "C"

def test_parse_sample_pdf():
    path = os.path.join("sample_papers", "sample_mathematics.pdf")
    with open(path, "rb") as f:
        content = f.read()
    questions, issues = parse_file_by_extension("sample_mathematics.pdf", content)
    assert len(questions) == 4
    assert questions[0]["correct_answer"] == "A"

def test_invalid_file_extension_rejected():
    with pytest.raises(ValueError) as exc:
        parse_file_by_extension("malicious.exe", b"binarydata")
    assert "Unsupported file format" in str(exc.value)

def test_missing_options_and_answer_flagged():
    invalid_raw = """
Question 1: Incomplete Question Statement?
A. Option A
B. Option B
Marks: 1
"""
    raw_q = parse_structured_text(invalid_raw)
    validated, issues = validate_questions_list(raw_q)
    errors = [i for i in issues if i["severity"] == "error"]
    assert len(errors) > 0
    # Option C and Option D and correct_answer missing
    fields_with_errors = [i["field"] for i in errors]
    assert "option_c" in fields_with_errors
    assert "option_d" in fields_with_errors
    assert "correct_answer" in fields_with_errors
