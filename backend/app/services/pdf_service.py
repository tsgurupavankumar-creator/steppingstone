import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_report_card_pdf(
    participant_id: str,
    participant_name: str,
    exam_title: str,
    exam_date: str,
    result_data: Dict[str, Any]
) -> bytes:
    """
    Generates a professional, branded PDF report card for an individual participant.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e293b"),
        alignment=1  # Centered
    )
    
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#64748b"),
        alignment=1
    )

    section_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=6
    )

    normal_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )

    story = []

    # Header
    story.append(Paragraph("EXAMINATION PERFORMANCE REPORT", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"<b>{exam_title}</b> &bull; Date: {exam_date}", subtitle_style))
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceAfter=14))

    # Participant Info Table
    info_data = [
        [
            Paragraph("<b>Participant ID:</b>", normal_style),
            Paragraph(f"<font color='#2563eb'><b>{participant_id}</b></font>", normal_style),
            Paragraph("<b>Participant Name:</b>", normal_style),
            Paragraph(participant_name, normal_style)
        ],
        [
            Paragraph("<b>Final Score:</b>", normal_style),
            Paragraph(f"<b>{result_data.get('total_score', 0)} / {result_data.get('max_possible_marks', 0)}</b>", normal_style),
            Paragraph("<b>Percentage:</b>", normal_style),
            Paragraph(f"<b>{result_data.get('percentage', 0)}%</b>", normal_style)
        ]
    ]
    info_table = Table(info_data, colWidths=[110, 150, 120, 160])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 14))

    # Core Metrics Summary Table
    story.append(Paragraph("Performance Metrics Overview", section_style))
    metrics_data = [
        ["Metric", "Value", "Metric", "Value"],
        ["Accuracy", f"{result_data.get('accuracy', 0)}%", "Total Questions", str(result_data.get('correct_count', 0) + result_data.get('incorrect_count', 0) + result_data.get('unanswered_count', 0))],
        ["Attempt Rate", f"{result_data.get('attempt_rate', 0)}%", "Correct Answers", str(result_data.get('correct_count', 0))],
        ["Completion Rate", f"{result_data.get('completion_rate', 0)}%", "Incorrect Answers", str(result_data.get('incorrect_count', 0))],
        ["Total Time Taken", f"{int(result_data.get('total_time_seconds', 0) // 60)}m {int(result_data.get('total_time_seconds', 0) % 60)}s", "Unanswered", str(result_data.get('unanswered_count', 0))],
        ["Avg Time / Question", f"{result_data.get('avg_time_per_question', 0)} sec", "Marked For Review", str(result_data.get('marked_for_review_count', 0))],
    ]
    metrics_table = Table(metrics_data, colWidths=[135, 135, 135, 135])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (1, 1), (1, -1), 'CENTER'),
        ('ALIGN', (3, 1), (3, -1), 'CENTER'),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 14))

    # Topic-wise Breakdown
    topic_list = result_data.get("topic_breakdown", [])
    if topic_list:
        story.append(Paragraph("Topic-Wise Breakdown", section_style))
        topic_table_data = [["Topic", "Total Questions", "Correct", "Incorrect", "Score", "Accuracy"]]
        for t in topic_list:
            topic_table_data.append([
                t.get("topic", "General"),
                str(t.get("total", 0)),
                str(t.get("correct", 0)),
                str(t.get("incorrect", 0)),
                f"{t.get('score', 0)} / {t.get('max_score', 0)}",
                f"{t.get('accuracy', 0)}%"
            ])
        topic_table = Table(topic_table_data, colWidths=[160, 80, 70, 70, 80, 80])
        topic_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ]))
        story.append(topic_table)
        story.append(Spacer(1, 14))

    # Performance Verdict
    pct = result_data.get("percentage", 0)
    verdict = "Excellent Mastery" if pct >= 80 else ("Good Competency" if pct >= 60 else "Requires Dedicated Revision")
    verdict_color = "#16a34a" if pct >= 80 else ("#ca8a04" if pct >= 60 else "#dc2626")
    story.append(Paragraph("Performance Assessment", section_style))
    story.append(Paragraph(
        f"Overall Standing: <font color='{verdict_color}'><b>{verdict}</b></font> ({pct}%). "
        f"Participant {participant_id} attempted {result_data.get('correct_count', 0) + result_data.get('incorrect_count', 0)} questions "
        f"with an accuracy of {result_data.get('accuracy', 0)}%. Review the detailed mistake report for comprehensive step-by-step solutions.",
        normal_style
    ))

    doc.build(story)
    return buffer.getvalue()


def generate_mistake_review_pdf(
    participant_id: str,
    exam_title: str,
    question_details: List[Dict[str, Any]]
) -> bytes:
    """
    Generates a comprehensive Mistake Review PDF showing questions, answers, explanations, and time taken.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReviewTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e293b"),
        alignment=1
    )
    normal_style = ParagraphStyle("RNormal", parent=styles["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#334155"))
    bold_style = ParagraphStyle("RBold", parent=styles["Normal"], fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#0f172a"))
    exp_style = ParagraphStyle("RExp", parent=styles["Normal"], fontSize=8.5, leading=11, textColor=colors.HexColor("#1e40af"))

    story = []
    story.append(Paragraph("DETAILED MISTAKE & QUESTION REVIEW", title_style))
    story.append(Paragraph(f"Participant: <b>{participant_id}</b> &bull; Examination: <b>{exam_title}</b>", ParagraphStyle("sub", alignment=1, fontSize=11, textColor=colors.HexColor("#64748b"))))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=12))

    for q in question_details:
        status = q.get("status", "unanswered")
        if status == "correct":
            badge_color = "#16a34a"
            badge_text = "CORRECT"
        elif status == "incorrect":
            badge_color = "#dc2626"
            badge_text = "INCORRECT"
        else:
            badge_color = "#64748b"
            badge_text = "UNANSWERED"

        q_card = [
            [
                Paragraph(f"<b>Q{q.get('question_number')}: {q.get('question_text')}</b>", bold_style),
                Paragraph(f"<font color='{badge_color}'><b>{badge_text}</b></font> ({q.get('marks_awarded', 0)} marks)", normal_style)
            ],
            [
                Paragraph(
                    f"A) {q.get('option_a')}<br/>"
                    f"B) {q.get('option_b')}<br/>"
                    f"C) {q.get('option_c')}<br/>"
                    f"D) {q.get('option_d')}",
                    normal_style
                ),
                Paragraph(
                    f"<b>Your Selection:</b> {q.get('selected_option') or 'None'}<br/>"
                    f"<b>Correct Answer:</b> <font color='#16a34a'><b>{q.get('correct_answer')}</b></font><br/>"
                    f"<b>Time Spent:</b> {q.get('time_spent_seconds', 0)}s<br/>"
                    f"<b>Topic:</b> {q.get('topic', 'General')}",
                    normal_style
                )
            ]
        ]

        if q.get("explanation"):
            q_card.append([
                Paragraph(f"<b>Explanation:</b> {q.get('explanation')}", exp_style),
                Paragraph("", normal_style)
            ])

        q_table = Table(q_card, colWidths=[380, 160])
        bg_color = colors.HexColor("#f0fdf4") if status == "correct" else (colors.HexColor("#fef2f2") if status == "incorrect" else colors.HexColor("#f8fafc"))
        q_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg_color),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('PADDING', (0, 0), (-1, -1), 5),
            ('SPAN', (0, 2), (1, 2)) if len(q_card) > 2 else ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(q_table)
        story.append(Spacer(1, 8))

    doc.build(story)
    return buffer.getvalue()
