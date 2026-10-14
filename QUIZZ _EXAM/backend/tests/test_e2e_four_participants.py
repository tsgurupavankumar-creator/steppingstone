import os
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_full_four_participant_examination_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Step 1: Admin logs in
        login_res = await ac.post("/api/auth/login", json={
            "username": "admin",
            "password": "AdminPass@2026"
        })
        assert login_res.status_code == 200
        admin_token = login_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Step 2: Admin uploads TXT question paper
        txt_path = os.path.join("sample_papers", "sample_general_science.txt")
        with open(txt_path, "rb") as f:
            file_bytes = f.read()

        upload_res = await ac.post(
            "/api/papers/upload",
            headers=admin_headers,
            files={"file": ("sample_general_science.txt", file_bytes, "text/plain")},
            data={"title": "General Science Grand Quiz"}
        )
        assert upload_res.status_code == 200
        paper_data = upload_res.json()
        paper_id = paper_data["paper_id"]
        assert paper_data["total_questions"] == 5

        # Step 3: Admin previews and validates paper
        preview_res = await ac.get(f"/api/papers/{paper_id}", headers=admin_headers)
        assert preview_res.status_code == 200
        assert preview_res.json()["is_valid"] is True

        # Step 4: Admin creates and publishes examination
        create_exam_res = await ac.post("/api/exams", headers=admin_headers, json={
            "title": "Science Interactive Challenge 2026",
            "description": "5 Questions Real-Time Exam",
            "paper_id": paper_id,
            "duration_minutes": 20,
            "positive_marks": 2.0,
            "negative_marking": 0.5,
            "randomize_questions": False,
            "allow_return_previous": True,
            "allow_change_answers": True,
            "late_entry_allowed": True
        })
        assert create_exam_res.status_code == 200
        exam_id = create_exam_res.json()["id"]

        # Step 5: Log in all 4 participants
        participant_tokens = {}
        for p_id in ["P001", "P002", "P003", "P004"]:
            res = await ac.post("/api/auth/login", json={
                "username": p_id,
                "password": f"Pass@{p_id}"
            })
            assert res.status_code == 200
            participant_tokens[p_id] = res.json()["access_token"]

        # Step 6: All 4 participants enter waiting room
        for p_id in ["P001", "P002", "P003", "P004"]:
            headers = {"Authorization": f"Bearer {participant_tokens[p_id]}"}
            entry_res = await ac.get(f"/api/session/{exam_id}/entry", headers=headers)
            assert entry_res.status_code == 200
            assert entry_res.json()["is_waiting_room"] is True

        # Step 7: Admin starts the examination
        start_res = await ac.post(f"/api/monitoring/{exam_id}/start", headers=admin_headers)
        assert start_res.status_code == 200
        assert start_res.json()["exam"]["status"] == "live"

        # Step 8: Participants fetch questions (Verifying Answer Key Protection!)
        for p_id in ["P001", "P002", "P003", "P004"]:
            headers = {"Authorization": f"Bearer {participant_tokens[p_id]}"}
            q_res = await ac.get(f"/api/session/{exam_id}/questions", headers=headers)
            assert q_res.status_code == 200
            delivered_q = q_res.json()["questions"]
            assert len(delivered_q) == 5
            # Crucial: Check that answer keys are NOT exposed to participants
            for q in delivered_q:
                assert "correct_answer" not in q
                assert "explanation" not in q

        # Step 9: Participants answer different combinations:
        # Correct keys: Q1: B, Q2: C, Q3: B, Q4: C, Q5: D
        # P001: All 5 correct (10 marks)
        # P002: 4 correct, 1 incorrect (8 - 0.5 = 7.5 marks)
        # P003: 3 correct, 2 unanswered (6 marks)
        # P004: Experiences simulated offline disconnection & sync

        # P001 answers:
        p1_headers = {"Authorization": f"Bearer {participant_tokens['P001']}"}
        for q_num, ans in [(1, 'B'), (2, 'C'), (3, 'B'), (4, 'C'), (5, 'D')]:
            save_res = await ac.post(f"/api/session/{exam_id}/save-answer", headers=p1_headers, json={
                "question_number": q_num,
                "selected_option": ans,
                "is_marked_for_review": False,
                "time_spent_delta": 10.0
            })
            assert save_res.status_code == 200

        # P002 answers (Q2 wrong):
        p2_headers = {"Authorization": f"Bearer {participant_tokens['P002']}"}
        for q_num, ans in [(1, 'B'), (2, 'A'), (3, 'B'), (4, 'C'), (5, 'D')]:
            await ac.post(f"/api/session/{exam_id}/save-answer", headers=p2_headers, json={
                "question_number": q_num,
                "selected_option": ans,
                "is_marked_for_review": False,
                "time_spent_delta": 12.0
            })

        # P003 answers (Q4, Q5 unanswered):
        p3_headers = {"Authorization": f"Bearer {participant_tokens['P003']}"}
        for q_num, ans in [(1, 'B'), (2, 'C'), (3, 'B')]:
            await ac.post(f"/api/session/{exam_id}/save-answer", headers=p3_headers, json={
                "question_number": q_num,
                "selected_option": ans,
                "is_marked_for_review": True,
                "time_spent_delta": 15.0
            })

        # Step 10: Participant 1 refreshes browser -> Session state restored!
        state_res = await ac.get(f"/api/session/{exam_id}/state", headers=p1_headers)
        assert state_res.status_code == 200
        p1_state = state_res.json()
        assert p1_state["answers"]["1"]["selected_option"] == "B"
        assert p1_state["answers"]["5"]["selected_option"] == "D"

        # Step 11: Participant 4 experiences simulated network disconnection
        # Answers locally, then sends batch sync
        p4_headers = {"Authorization": f"Bearer {participant_tokens['P004']}"}
        offline_batch = [
            {"question_number": 1, "selected_option": "B", "is_marked_for_review": False, "time_spent_delta": 8.0},
            {"question_number": 2, "selected_option": "C", "is_marked_for_review": False, "time_spent_delta": 8.0},
            {"question_number": 3, "selected_option": "A", "is_marked_for_review": False, "time_spent_delta": 8.0}, # incorrect
            {"question_number": 4, "selected_option": "A", "is_marked_for_review": False, "time_spent_delta": 8.0}, # incorrect
            {"question_number": 5, "selected_option": "D", "is_marked_for_review": False, "time_spent_delta": 8.0},
        ]
        sync_res = await ac.post(f"/api/session/{exam_id}/sync", headers=p4_headers, json={
            "answers": offline_batch
        })
        assert sync_res.status_code == 200
        assert sync_res.json()["status"] == "synced"
        assert sync_res.json()["synced_count"] == 5

        # Step 12: All 4 participants submit
        for p_id in ["P001", "P002", "P003", "P004"]:
            headers = {"Authorization": f"Bearer {participant_tokens[p_id]}"}
            sub_res = await ac.post(f"/api/session/{exam_id}/submit", headers=headers, json={"confirm": True})
            assert sub_res.status_code == 200

        # Step 13: Attempt to submit again (Verifying idempotency)
        dup_sub = await ac.post(f"/api/session/{exam_id}/submit", headers=p1_headers, json={"confirm": True})
        assert dup_sub.status_code == 200
        assert dup_sub.json()["status"] == "already_submitted"

        # Step 14: Participant tries to view report card before release -> Blocked 403!
        p1_early_report = await ac.get(f"/api/reports/{exam_id}/participant/P001", headers=p1_headers)
        assert p1_early_report.status_code == 403

        # Step 15: Admin live monitoring & releases results
        release_res = await ac.post(f"/api/monitoring/{exam_id}/release-results", headers=admin_headers)
        assert release_res.status_code == 200

        # Step 16: Admin comparison analytics comparing all 4 participants
        comp_res = await ac.get(f"/api/analytics/{exam_id}/comparison", headers=admin_headers)
        assert comp_res.status_code == 200
        comp_data = comp_res.json()
        assert len(comp_data["participants"]) == 4

        # Verify ranking: P001 should be Rank 1 with 10.0 marks
        ranked_p = comp_data["participants"]
        assert ranked_p[0]["participant_id"] == "P001"
        assert ranked_p[0]["total_score"] == 10.0
        assert ranked_p[0]["rank"] == 1

        # Step 17: Participant 1 views their own released report card
        p1_report = await ac.get(f"/api/reports/{exam_id}/participant/P001", headers=p1_headers)
        assert p1_report.status_code == 200
        assert p1_report.json()["result"]["total_score"] == 10.0
        assert p1_report.json()["result"]["percentage"] == 100.0

        # Step 18: Participant 1 cannot view Participant 2's report card (Data privacy!)
        unauth_report = await ac.get(f"/api/reports/{exam_id}/participant/P002", headers=p1_headers)
        assert unauth_report.status_code == 403

        # Step 19: Participants download their own PDF report cards
        pdf_res = await ac.get(f"/api/reports/{exam_id}/participant/P001/pdf", headers=p1_headers)
        assert pdf_res.status_code == 200
        assert pdf_res.headers["content-type"] == "application/pdf"
        assert len(pdf_res.content) > 100

        # Step 20: Participants review mistakes & explanations
        mistakes_res = await ac.get(f"/api/reports/{exam_id}/participant/P002/mistakes", headers=p2_headers)
        assert mistakes_res.status_code == 200
        assert len(mistakes_res.json()["questions"]) == 5

        # Step 21: Admin exports results to CSV and Excel
        csv_res = await ac.get(f"/api/reports/{exam_id}/export/csv", headers=admin_headers)
        assert csv_res.status_code == 200
        assert "Participant ID" in csv_res.text

        excel_res = await ac.get(f"/api/reports/{exam_id}/export/excel", headers=admin_headers)
        assert excel_res.status_code == 200
        assert len(excel_res.content) > 100

        # Step 22: Historical archive check
        hist_res = await ac.get("/api/reports/history", headers=admin_headers)
        assert hist_res.status_code == 200
        assert len(hist_res.json()) >= 1
