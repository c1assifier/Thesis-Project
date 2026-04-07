import json
from collections import defaultdict
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DiagnosticQuestion, DiagnosticTest, SkillMapping
from app.repositories.course_repository import CourseRepository
from app.repositories.diagnostic_repository import DiagnosticRepository
from app.repositories.exercise_repository import ExerciseRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.diagnostic_schema import (
    DiagnosticQuestionRead,
    DiagnosticSubmitRequest,
    DiagnosticSubmitResponse,
    DiagnosticTestRead,
    SkillDiagnosticResult,
)
from app.services.adaptive_service import AdaptiveService
from app.services.skill_utils import level_from_score


class DiagnosticService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = DiagnosticRepository(db)
        self.submission_repository = SubmissionRepository(db)
        self.adaptive_service = AdaptiveService(
            submission_repository=self.submission_repository,
            exercise_repository=ExerciseRepository(db),
            course_repository=CourseRepository(db),
        )

    def _seed_file_path(self) -> Path:
        configured = Path(settings.diagnostic_seed_data_path)
        if configured.exists():
            return configured
        return Path(__file__).resolve().parent.parent / "data" / "diagnostic_seed.json"

    def seed_diagnostic_content(self) -> None:
        if self.repository.get_active_test() is not None:
            return

        seed_path = self._seed_file_path()
        if not seed_path.exists():
            return

        payload = json.loads(seed_path.read_text(encoding="utf-8"))
        test_payload = payload["diagnostic_test"]
        test = DiagnosticTest(
            title=test_payload["title"],
            description=test_payload["description"],
            is_active=test_payload.get("is_active", True),
            test_type=test_payload.get("test_type", "entry"),
            module_id=test_payload.get("module_id"),
        )
        self.db.add(test)
        self.db.flush()

        for question_payload in test_payload["questions"]:
            question = DiagnosticQuestion(
                test_id=test.id,
                question_text=question_payload["question_text"],
                question_type=question_payload["question_type"],
                code_snippet=question_payload.get("code_snippet", ""),
                options=question_payload["options"],
                correct_answer=question_payload["correct_answer"],
                order_index=question_payload["order_index"],
            )
            self.db.add(question)
            self.db.flush()

            for mapping_payload in question_payload["skills"]:
                self.db.add(
                    SkillMapping(
                        question_id=question.id,
                        skill_name=mapping_payload["skill_name"],
                        weight=float(mapping_payload.get("weight", 1.0)),
                    )
                )

        self.db.commit()

    def get_active_test(self) -> DiagnosticTest:
        test = self.repository.get_active_test()
        if test is None:
            raise HTTPException(status_code=404, detail="Диагностический тест не найден.")
        return test

    def get_active_test_payload(self) -> DiagnosticTestRead:
        test = self.get_active_test()
        return self._serialize_test(test)

    def get_test_payload(self, test_id: int) -> DiagnosticTestRead:
        test = self.repository.get_test_with_questions(test_id)
        if test is None:
            raise HTTPException(status_code=404, detail="Диагностический тест не найден.")
        return self._serialize_test(test)

    @staticmethod
    def _serialize_test(test: DiagnosticTest) -> DiagnosticTestRead:
        questions = sorted(test.questions, key=lambda item: item.order_index)
        return DiagnosticTestRead(
            id=test.id,
            title=test.title,
            description=test.description,
            total_questions=len(questions),
            questions=[
                DiagnosticQuestionRead(
                    id=question.id,
                    question_text=question.question_text,
                    question_type=question.question_type,
                    code_snippet=question.code_snippet,
                    options=list(question.options),
                    order_index=question.order_index,
                )
                for question in questions
            ],
        )

    def submit_diagnostic(self, test_id: int, payload: DiagnosticSubmitRequest) -> DiagnosticSubmitResponse:
        test = self.repository.get_test_with_questions(test_id)
        if test is None:
            raise HTTPException(status_code=404, detail="Диагностический тест не найден.")

        user = self.repository.get_user(payload.user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="Пользователь не найден.")

        selected_by_question = {item.question_id: item.selected_answer.strip() for item in payload.answers}
        ordered_questions = sorted(test.questions, key=lambda item: item.order_index)
        if not ordered_questions:
            raise HTTPException(status_code=400, detail="Диагностический тест не содержит вопросов.")

        self.repository.clear_user_answers_for_test(payload.user_id, test_id)

        correct_answers = 0
        weighted_total: dict[str, float] = defaultdict(float)
        weighted_correct: dict[str, float] = defaultdict(float)

        for question in ordered_questions:
            selected_answer = selected_by_question.get(question.id, "")
            is_correct = selected_answer.casefold() == question.correct_answer.strip().casefold()
            if is_correct:
                correct_answers += 1

            self.repository.create_diagnostic_answer(
                user_id=payload.user_id,
                test_id=test_id,
                question_id=question.id,
                selected_answer=selected_answer,
                is_correct=is_correct,
            )

            for mapping in question.skill_mappings:
                weighted_total[mapping.skill_name] += mapping.weight
                if is_correct:
                    weighted_correct[mapping.skill_name] += mapping.weight

        self.repository.commit()

        diagnostic_scores: dict[str, float] = {}
        skill_results: list[SkillDiagnosticResult] = []
        for skill_name in sorted(weighted_total):
            total = weighted_total[skill_name]
            correct = weighted_correct[skill_name]
            score = (correct / total) if total > 0 else 0.0
            diagnostic_scores[skill_name] = score
            skill_results.append(
                SkillDiagnosticResult(
                    skill_name=skill_name,
                    correct_answers=int(round(correct)),
                    total_questions=int(round(total)),
                    diagnostic_score=round(score, 4),
                    skill_level=level_from_score(score),
                )
            )

        self.adaptive_service.apply_diagnostic_scores(payload.user_id, diagnostic_scores)
        self.submission_repository.set_intro_completed(payload.user_id, value=True)
        self.submission_repository.set_diagnostic_completed(payload.user_id, value=True)

        total_questions = len(ordered_questions)
        overall_score = correct_answers / total_questions
        recommendation = self._build_recommendation(overall_score)

        return DiagnosticSubmitResponse(
            test_id=test_id,
            total_questions=total_questions,
            correct_answers=correct_answers,
            overall_score=round(overall_score, 4),
            skill_scores=skill_results,
            recommendation=recommendation,
        )

    @staticmethod
    def _build_recommendation(overall_score: float) -> str:
        if overall_score < 0.4:
            return "Рекомендуется начать с упрощённой траектории: короткая теория, дополнительные примеры и easy-задачи."
        if overall_score < 0.7:
            return "Рекомендуется стандартная траектория: базовая теория и упражнения средней сложности."
        return "Рекомендуется ускоренная траектория: компактная теория и задачи повышенной сложности."
