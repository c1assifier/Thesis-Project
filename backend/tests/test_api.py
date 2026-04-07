from app.models import DiagnosticQuestion, DiagnosticTest, ModuleProgress, Progress, SkillMapping
from conftest import TestingSessionLocal


def test_course_listing(client):
    response = client.get("/courses")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_register_and_login(client):
    register = client.post("/register", json={"name": "student@example.com", "password": "secret123"})
    assert register.status_code == 201
    register_payload = register.json()
    assert register_payload["id"] > 0
    assert register_payload["name"] == "student@example.com"

    login = client.post("/login", json={"name": "student@example.com", "password": "secret123"})
    assert login.status_code == 200
    login_payload = login.json()
    assert login_payload["id"] == register_payload["id"]
    assert login_payload["name"] == "student@example.com"

    failed_login = client.post("/login", json={"name": "student@example.com", "password": "wrong"})
    assert failed_login.status_code == 401


def test_adaptive_entry_and_path(client):
    register = client.post("/register_user", json={"name": "adaptive_user"})
    assert register.status_code == 201
    user_id = register.json()["id"]

    active_test = client.get("/diagnostic-tests/active")
    assert active_test.status_code == 200
    test_payload = active_test.json()
    answers = [{"question_id": item["id"], "selected_answer": item["options"][0]} for item in test_payload["questions"]]

    submit = client.post("/adaptive/entry/submit", json={"user_id": user_id, "answers": answers})
    assert submit.status_code == 200
    submit_payload = submit.json()
    assert submit_payload["entry_test_id"] == test_payload["id"]
    assert "modules" in submit_payload
    assert len(submit_payload["modules"]) >= 1

    path = client.get(f"/adaptive/path/{user_id}")
    assert path.status_code == 200
    path_payload = path.json()
    assert path_payload["user_id"] == user_id
    assert len(path_payload["modules"]) >= 1


def test_adaptive_ranking_uses_skill_mapping_with_fallback(client):
    register = client.post("/register_user", json={"name": "ranking_user"})
    assert register.status_code == 201
    user_id = register.json()["id"]

    db = TestingSessionLocal()
    try:
        weighted_test = DiagnosticTest(
            title="Weighted module 5 micro",
            description="weighted",
            is_active=True,
            test_type="micro",
            module_id=5,
        )
        db.add(weighted_test)
        db.flush()
        weighted_q = DiagnosticQuestion(
            test_id=weighted_test.id,
            question_text="if?",
            question_type="multiple_choice",
            code_snippet="",
            options=["if", "for"],
            correct_answer="if",
            order_index=1,
        )
        db.add(weighted_q)
        db.flush()
        db.add(SkillMapping(question_id=weighted_q.id, skill_name="conditions", weight=3.0))
        db.commit()
    finally:
        db.close()

    path = client.get(f"/adaptive/path/{user_id}")
    assert path.status_code == 200
    modules = path.json()["modules"]
    assert modules
    ranked_ids = [item["module_id"] for item in modules if item["status"] != "completed"]
    assert 5 in ranked_ids
    assert 1 in ranked_ids
    assert ranked_ids.index(5) < ranked_ids.index(1)


def test_adaptive_micro_module_flow(client):
    register = client.post("/register_user", json={"name": "adaptive_flow_user"})
    assert register.status_code == 201
    user_id = register.json()["id"]

    db = TestingSessionLocal()
    try:
        micro_test = DiagnosticTest(
            title="Micro test module 1",
            description="micro",
            is_active=True,
            test_type="micro",
            module_id=1,
        )
        db.add(micro_test)
        db.flush()
        micro_question = DiagnosticQuestion(
            test_id=micro_test.id,
            question_text="2+2?",
            question_type="multiple_choice",
            code_snippet="",
            options=["4", "5"],
            correct_answer="4",
            order_index=1,
        )
        db.add(micro_question)
        db.flush()
        db.add(SkillMapping(question_id=micro_question.id, skill_name="variables", weight=1.0))

        module_test = DiagnosticTest(
            title="Module test module 1",
            description="module",
            is_active=True,
            test_type="module",
            module_id=1,
        )
        db.add(module_test)
        db.flush()
        module_question = DiagnosticQuestion(
            test_id=module_test.id,
            question_text="3+3?",
            question_type="multiple_choice",
            code_snippet="",
            options=["6", "7"],
            correct_answer="6",
            order_index=1,
        )
        db.add(module_question)
        db.flush()
        db.add(SkillMapping(question_id=module_question.id, skill_name="variables", weight=1.0))
        db.commit()
    finally:
        db.close()

    micro_fail = client.post(
        f"/adaptive/micro-tests/{micro_test.id}/submit",
        json={"user_id": user_id, "answers": [{"question_id": micro_question.id, "selected_answer": "5"}]},
    )
    assert micro_fail.status_code == 200
    assert micro_fail.json()["passed"] is False
    assert micro_fail.json()["next_step"]["step"] == "micro_test"
    db = TestingSessionLocal()
    try:
        module_progress = db.query(ModuleProgress).filter_by(user_id=user_id, module_id=1).first()
        assert module_progress is not None
        assert module_progress.attempts_count == 1
        assert module_progress.status == "in_progress"
        topic_progress_rows = db.query(Progress).filter_by(user_id=user_id).all()
        assert topic_progress_rows
        assert all(row.status == "in_progress" for row in topic_progress_rows)
        assert all(row.attempts_count == 0 for row in topic_progress_rows)
    finally:
        db.close()

    micro_fail_second = client.post(
        f"/adaptive/micro-tests/{micro_test.id}/submit",
        json={"user_id": user_id, "answers": [{"question_id": micro_question.id, "selected_answer": "5"}]},
    )
    assert micro_fail_second.status_code == 200
    assert micro_fail_second.json()["passed"] is False
    db = TestingSessionLocal()
    try:
        module_progress = db.query(ModuleProgress).filter_by(user_id=user_id, module_id=1).first()
        assert module_progress is not None
        assert module_progress.attempts_count == 2
        topic_progress_rows = db.query(Progress).filter_by(user_id=user_id).all()
        assert topic_progress_rows
        assert all(row.status == "struggling" for row in topic_progress_rows)
        assert all(row.attempts_count == 0 for row in topic_progress_rows)
    finally:
        db.close()

    micro_pass = client.post(
        f"/adaptive/micro-tests/{micro_test.id}/submit",
        json={"user_id": user_id, "answers": [{"question_id": micro_question.id, "selected_answer": "4"}]},
    )
    assert micro_pass.status_code == 200
    assert micro_pass.json()["passed"] is True
    assert micro_pass.json()["next_step"]["step"] in {"module_test", "done"}
    progress_after_micro = client.get(f"/adaptive/progress/{user_id}")
    assert progress_after_micro.status_code == 200
    assert progress_after_micro.json()["completed_modules"] == 0

    module_pass = client.post(
        f"/adaptive/module-tests/{module_test.id}/submit",
        json={"user_id": user_id, "answers": [{"question_id": module_question.id, "selected_answer": "6"}]},
    )
    assert module_pass.status_code == 200
    assert module_pass.json()["passed"] is True
    assert module_pass.json()["next_step"]["step"] == "done"
    db = TestingSessionLocal()
    try:
        module_progress = db.query(ModuleProgress).filter_by(user_id=user_id, module_id=1).first()
        assert module_progress is not None
        assert module_progress.status == "completed"
        assert module_progress.attempts_count == 0
    finally:
        db.close()


def test_portal_bootstrap(client):
    response = client.get("/portal/bootstrap")
    assert response.status_code == 200
    payload = response.json()
    assert payload["app_title"] == "Адаптивное обучение Python"
    assert len(payload["course_structure"]["modules"]) >= 8


def test_portal_module_details(client):
    response = client.get("/portal/modules/2")
    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "2. Переменные и типы данных"
    assert len(payload["theory_items"]) >= 1


def test_portal_module_details_missing(client):
    response = client.get("/portal/modules/999")
    assert response.status_code == 404


def test_register_and_submit_solution(client):
    register = client.post("/register_user", json={"name": "Alice"})
    assert register.status_code == 201
    user_id = register.json()["id"]

    submission = client.post(
        "/submit",
        json={
            "user_id": user_id,
            "exercise_id": 1,
            "code": "def greet():\n    return 'Привет, Python!'\n",
        },
    )
    assert submission.status_code == 200
    body = submission.json()
    assert body["passed"] is True
    assert body["submission"]["result"] == "passed"
    assert body["execution_time"] >= 0


def test_hint_requires_three_attempts(client):
    register = client.post("/register_user", json={"name": "Bob"})
    user_id = register.json()["id"]

    hint = client.post(
        "/hint",
        json={"user_id": user_id, "exercise_id": 1, "error_message": "AssertionError"},
    )
    assert hint.status_code == 200
    assert "после 3 неудачных попыток" in hint.json()["hint"]


def test_diagnostic_flow_marks_user(client):
    register = client.post("/register_user", json={"name": "Charlie"})
    assert register.status_code == 201
    user_id = register.json()["id"]

    diagnostic_test = client.get("/diagnostic-tests/active")
    assert diagnostic_test.status_code == 200
    test_payload = diagnostic_test.json()
    assert test_payload["total_questions"] >= 15

    answers = [{"question_id": item["id"], "selected_answer": item["options"][0]} for item in test_payload["questions"]]
    submit = client.post(
        f"/diagnostic-tests/{test_payload['id']}/submit",
        json={"user_id": user_id, "answers": answers},
    )
    assert submit.status_code == 200
    result_payload = submit.json()
    assert result_payload["total_questions"] == len(test_payload["questions"])
    assert len(result_payload["skill_scores"]) > 0

    progress = client.get(f"/progress/{user_id}")
    assert progress.status_code == 200
    progress_payload = progress.json()
    assert progress_payload["diagnostic_completed"] is True
    assert "completed_topics" in progress_payload


def test_explain_endpoint(client):
    response = client.post("/explain", json={"topic_id": 1, "level": 2})
    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "backend"
    assert isinstance(payload["text"], str)
    assert len(payload["text"]) > 0


def test_complete_module_marks_progress(client):
    register = client.post("/register_user", json={"name": "Dana"})
    assert register.status_code == 201
    user_id = register.json()["id"]

    complete = client.post("/modules/1/complete", json={"user_id": user_id})
    assert complete.status_code == 200
    body = complete.json()
    assert body["status"] == "completed"

    progress = client.get(f"/progress/{user_id}")
    assert progress.status_code == 200
    progress_body = progress.json()
    assert progress_body["completed_modules"] >= 1
    assert 1 in progress_body["completed_module_ids"]
