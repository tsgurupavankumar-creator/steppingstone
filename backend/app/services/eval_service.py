from typing import List, Dict, Any, Optional

def evaluate_participant_attempt(
    questions_snapshot: List[Dict[str, Any]],
    saved_answers: Dict[int, Dict[str, Any]],
    positive_marks_default: float = 1.0,
    negative_marks_default: float = 0.0,
) -> Dict[str, Any]:
    """
    Evaluates participant answers against the immutable questions snapshot.
    saved_answers: mapping of question_number -> {
        'selected_option': str or None,
        'is_marked_for_review': bool,
        'time_spent_seconds': float
    }
    """
    total_score = 0.0
    max_possible_marks = 0.0
    correct_count = 0
    incorrect_count = 0
    unanswered_count = 0
    marked_for_review_count = 0
    total_time_seconds = 0.0
    
    question_times = []
    attempted_question_times = []
    topic_breakdown: Dict[str, Dict[str, Any]] = {}
    question_details: List[Dict[str, Any]] = []

    for q in questions_snapshot:
        q_num = q.get("question_number", 1)
        q_text = q.get("question_text", "")
        opt_a = q.get("option_a", "")
        opt_b = q.get("option_b", "")
        opt_c = q.get("option_c", "")
        opt_d = q.get("option_d", "")
        correct_ans = (q.get("correct_answer") or "").strip().upper()
        
        q_pos_marks = float(q.get("marks", positive_marks_default))
        q_neg_marks = float(q.get("negative_marks", negative_marks_default))
        topic = q.get("topic") or "General"
        difficulty = q.get("difficulty") or "Medium"

        max_possible_marks += q_pos_marks

        # Init topic bucket
        if topic not in topic_breakdown:
            topic_breakdown[topic] = {
                "topic": topic,
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "unanswered": 0,
                "score": 0.0,
                "max_score": 0.0,
                "accuracy": 0.0
            }
        topic_breakdown[topic]["total"] += 1
        topic_breakdown[topic]["max_score"] += q_pos_marks

        # Check participant's answer
        ans_entry = saved_answers.get(q_num, {})
        selected = ans_entry.get("selected_option")
        is_marked = bool(ans_entry.get("is_marked_for_review", False))
        time_spent = float(ans_entry.get("time_spent_seconds", 0.0))

        if is_marked:
            marked_for_review_count += 1

        total_time_seconds += time_spent
        question_times.append(time_spent)

        if not selected:
            # Unanswered
            unanswered_count += 1
            awarded_marks = 0.0
            status = "unanswered"
            topic_breakdown[topic]["unanswered"] += 1
        elif selected.strip().upper() == correct_ans:
            # Correct
            correct_count += 1
            awarded_marks = q_pos_marks
            total_score += awarded_marks
            status = "correct"
            attempted_question_times.append(time_spent)
            topic_breakdown[topic]["correct"] += 1
            topic_breakdown[topic]["score"] += awarded_marks
        else:
            # Incorrect
            incorrect_count += 1
            awarded_marks = -q_neg_marks
            total_score += awarded_marks
            status = "incorrect"
            attempted_question_times.append(time_spent)
            topic_breakdown[topic]["incorrect"] += 1
            topic_breakdown[topic]["score"] += awarded_marks

        question_details.append({
            "question_number": q_num,
            "question_text": q_text,
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "selected_option": selected,
            "correct_answer": correct_ans,
            "status": status,
            "marks_awarded": round(awarded_marks, 2),
            "max_marks": round(q_pos_marks, 2),
            "negative_marks": round(q_neg_marks, 2),
            "time_spent_seconds": round(time_spent, 1),
            "is_marked_for_review": is_marked,
            "explanation": q.get("explanation", ""),
            "option_a_explanation": q.get("option_a_explanation", ""),
            "option_b_explanation": q.get("option_b_explanation", ""),
            "option_c_explanation": q.get("option_c_explanation", ""),
            "option_d_explanation": q.get("option_d_explanation", ""),
            "topic": topic,
            "difficulty": difficulty
        })

    # Calculations
    total_q = len(questions_snapshot)
    attempted_count = correct_count + incorrect_count

    # Percentage
    percentage = (total_score / max_possible_marks * 100.0) if max_possible_marks > 0 else 0.0
    percentage = max(0.0, percentage)  # No negative percentage displayed

    # Accuracy: (correct / attempted) * 100
    accuracy = (correct_count / attempted_count * 100.0) if attempted_count > 0 else 0.0

    # Attempt Rate: (attempted / total) * 100
    attempt_rate = (attempted_count / total_q * 100.0) if total_q > 0 else 0.0

    # Completion Rate: (answered / total) * 100
    completion_rate = attempt_rate

    # Timing metrics
    avg_time_per_question = (total_time_seconds / total_q) if total_q > 0 else 0.0
    avg_time_per_attempted = (sum(attempted_question_times) / attempted_count) if attempted_count > 0 else 0.0
    fastest_time = min(attempted_question_times) if attempted_question_times else None
    slowest_time = max(attempted_question_times) if attempted_question_times else None

    # Topic accuracy
    for top_data in topic_breakdown.values():
        att = top_data["correct"] + top_data["incorrect"]
        top_data["accuracy"] = round((top_data["correct"] / att * 100.0), 2) if att > 0 else 0.0
        top_data["score"] = round(top_data["score"], 2)

    return {
        "total_score": round(total_score, 2),
        "max_possible_marks": round(max_possible_marks, 2),
        "percentage": round(percentage, 2),
        "correct_count": correct_count,
        "incorrect_count": incorrect_count,
        "unanswered_count": unanswered_count,
        "marked_for_review_count": marked_for_review_count,
        "accuracy": round(accuracy, 2),
        "attempt_rate": round(attempt_rate, 2),
        "completion_rate": round(completion_rate, 2),
        "total_time_seconds": round(total_time_seconds, 1),
        "avg_time_per_question": round(avg_time_per_question, 1),
        "avg_time_per_attempted_question": round(avg_time_per_attempted, 1),
        "fastest_question_time": round(fastest_time, 1) if fastest_time is not None else None,
        "slowest_question_time": round(slowest_time, 1) if slowest_time is not None else None,
        "topic_breakdown": list(topic_breakdown.values()),
        "question_details": question_details
    }
