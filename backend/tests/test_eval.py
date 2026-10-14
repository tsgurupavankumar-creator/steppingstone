import pytest
from backend.app.services.eval_service import evaluate_participant_attempt

def test_accurate_scoring_and_negative_marking():
    snapshot = [
        {"question_number": 1, "correct_answer": "A", "marks": 2.0, "negative_marks": 0.5, "topic": "Math"},
        {"question_number": 2, "correct_answer": "B", "marks": 2.0, "negative_marks": 0.5, "topic": "Math"},
        {"question_number": 3, "correct_answer": "C", "marks": 2.0, "negative_marks": 0.5, "topic": "Science"},
        {"question_number": 4, "correct_answer": "D", "marks": 2.0, "negative_marks": 0.5, "topic": "Science"},
    ]

    # Participant answered:
    # Q1: A (Correct -> +2.0)
    # Q2: C (Incorrect -> -0.5)
    # Q3: None (Unanswered -> 0)
    # Q4: D (Correct -> +2.0)
    saved_answers = {
        1: {"selected_option": "A", "is_marked_for_review": False, "time_spent_seconds": 15.0},
        2: {"selected_option": "C", "is_marked_for_review": False, "time_spent_seconds": 25.0},
        3: {"selected_option": None, "is_marked_for_review": True, "time_spent_seconds": 5.0},
        4: {"selected_option": "D", "is_marked_for_review": False, "time_spent_seconds": 20.0},
    }

    result = evaluate_participant_attempt(snapshot, saved_answers)

    # Total score: 2.0 - 0.5 + 0 + 2.0 = 3.5
    assert result["total_score"] == 3.5
    assert result["max_possible_marks"] == 8.0
    # Percentage: (3.5 / 8.0) * 100 = 43.75
    assert result["percentage"] == 43.75

    assert result["correct_count"] == 2
    assert result["incorrect_count"] == 1
    assert result["unanswered_count"] == 1
    assert result["marked_for_review_count"] == 1

    # Attempted = 3. Accuracy = 2 / 3 * 100 = 66.67
    assert result["accuracy"] == 66.67
    # Attempt rate = 3 / 4 * 100 = 75.0
    assert result["attempt_rate"] == 75.0

    # Total time = 15 + 25 + 5 + 20 = 65.0s
    assert result["total_time_seconds"] == 65.0
    assert result["fastest_question_time"] == 15.0
    assert result["slowest_question_time"] == 25.0

def test_zero_attempts_safe_handling():
    snapshot = [
        {"question_number": 1, "correct_answer": "A", "marks": 1.0, "negative_marks": 0.0, "topic": "General"}
    ]
    saved_answers = {}
    result = evaluate_participant_attempt(snapshot, saved_answers)
    assert result["total_score"] == 0.0
    assert result["percentage"] == 0.0
    assert result["accuracy"] == 0.0
    assert result["attempt_rate"] == 0.0
    assert result["correct_count"] == 0
    assert result["unanswered_count"] == 1
