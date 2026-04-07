from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import DiagnosticAnswer, DiagnosticQuestion, DiagnosticTest, Lesson, Module, ModuleProgress, Progress, SkillMapping, Topic, UserSkill
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.adaptive_schema import (
    AdaptiveEntrySubmitRequest,
    AdaptiveEntrySubmitResponse,
    AdaptiveModuleRead,
    AdaptiveNextStepResponse,
    AdaptivePathResponse,
    AdaptiveProgressResponse,
    AdaptiveSimpleTopicRead,
    AdaptiveTestSubmitRequest,
    AdaptiveTestSubmitResponse,
    SkillScoreRead,
    WeakSkillRead,
)
from app.services.skill_utils import clamp_score, level_from_score


TARGET_SKILL_SCORE = 0.7
WEAK_SKILL_THRESHOLD = 0.6
MICRO_PASS_THRESHOLD = 0.6
MODULE_PASS_THRESHOLD = 0.7
MICRO_STRUGGLING_ATTEMPTS = 2
MODULE_STRUGGLING_ATTEMPTS = 2


@dataclass
class _TestEval:
    overall_score: float
    skill_scores: dict[str, float]


@dataclass
class _TestStatus:
    attempted: bool
    passed: bool
    overall_score: float


class AdaptiveLearningService:
    def __init__(self, db: Session):
        self.db = db
        self.submission_repository = SubmissionRepository(db)

    def submit_entry(self, payload: AdaptiveEntrySubmitRequest) -> AdaptiveEntrySubmitResponse:
        self._ensure_user(payload.user_id)
        test = self._get_active_entry_test()
        evaluation = self._evaluate_and_store_test(payload.user_id, test, payload.answers)
        self._apply_entry_skill_scores(payload.user_id, evaluation.skill_scores)
        self.submission_repository.set_intro_completed(payload.user_id, value=True)
        self.submission_repository.set_diagnostic_completed(payload.user_id, value=True)
        self._update_module_progress_snapshots(payload.user_id)

        weak_skills = self._build_weak_skills(payload.user_id)
        modules = self._build_personalized_modules(payload.user_id)

        return AdaptiveEntrySubmitResponse(
            entry_test_id=test.id,
            overall_score=round(evaluation.overall_score, 4),
            weak_skills=weak_skills,
            skill_scores=self._build_skill_scores(payload.user_id),
            modules=modules,
        )

    def get_personalized_path(self, user_id: int) -> AdaptivePathResponse:
        self._ensure_user(user_id)
        self._update_module_progress_snapshots(user_id)
        return AdaptivePathResponse(
            user_id=user_id,
            weak_skills=self._build_weak_skills(user_id),
            modules=self._build_personalized_modules(user_id),
        )

    def get_next_step(self, user_id: int, module_id: int) -> AdaptiveNextStepResponse:
        self._ensure_user(user_id)
        module = self._get_module_with_topics(module_id)

        module_progress = self._get_module_progress(user_id, module_id)
        if module_progress is not None and module_progress.status == "completed":
            return AdaptiveNextStepResponse(user_id=user_id, module_id=module_id, step="done", chunked=False)

        micro_test = self._get_test_by_type(module_id, "micro")
        module_test = self._get_test_by_type(module_id, "module")
        micro_status = self._get_user_test_status(user_id, micro_test, MICRO_PASS_THRESHOLD)
        module_status = self._get_user_test_status(user_id, module_test, MODULE_PASS_THRESHOLD)
        is_struggling = self._is_module_struggling(user_id, module_id)

        if module_status.passed:
            return AdaptiveNextStepResponse(user_id=user_id, module_id=module_id, step="done", chunked=False)

        if micro_status.passed:
            if module_test is None:
                return AdaptiveNextStepResponse(
                    user_id=user_id,
                    module_id=module_id,
                    step="done",
                    chunked=False,
                    micro_test_id=micro_test.id if micro_test else None,
                )
            return AdaptiveNextStepResponse(
                user_id=user_id,
                module_id=module_id,
                step="module_test",
                chunked=False,
                micro_test_id=micro_test.id if micro_test else None,
                module_test_id=module_test.id if module_test else None,
            )

        # Student is struggling: split module into simpler topic chunks using existing simple theory content.
        chunked = micro_status.attempted or module_status.attempted or is_struggling
        return AdaptiveNextStepResponse(
            user_id=user_id,
            module_id=module_id,
            step="simple_theory" if is_struggling else "micro_test",
            chunked=chunked,
            micro_test_id=micro_test.id if micro_test else None,
            module_test_id=module_test.id if module_test else None,
            simple_topics=self._build_simple_topics(module),
        )

    def submit_micro_test(self, test_id: int, payload: AdaptiveTestSubmitRequest) -> AdaptiveTestSubmitResponse:
        self._ensure_user(payload.user_id)
        test = self._get_test(test_id)
        if test.test_type != "micro":
            raise HTTPException(status_code=400, detail="Ожидался micro-тест.")
        if test.module_id is None:
            raise HTTPException(status_code=400, detail="Micro-тест должен быть привязан к модулю.")

        evaluation = self._evaluate_and_store_test(payload.user_id, test, payload.answers)
        passed = evaluation.overall_score >= MICRO_PASS_THRESHOLD
        self._apply_assessment_skill_scores(payload.user_id, evaluation.skill_scores, blend=0.3)
        module_test = self._get_test_by_type(test.module_id, "module")
        module_progress = self._get_or_create_module_progress(payload.user_id, test.module_id)
        if passed:
            self._set_module_topics_status(payload.user_id, test.module_id, status="in_progress")
            if module_test is None:
                self._mark_module_completed(payload.user_id, test.module_id)
            else:
                module_progress.status = "in_progress"
                self.db.add(module_progress)
        else:
            module_progress.attempts_count += 1
            module_progress.status = "in_progress"
            struggling = module_progress.attempts_count >= MICRO_STRUGGLING_ATTEMPTS
            self.db.add(module_progress)
            self._set_module_topics_status(payload.user_id, test.module_id, status="struggling" if struggling else "in_progress")

        self.db.commit()
        return AdaptiveTestSubmitResponse(
            test_id=test.id,
            test_type=test.test_type,
            module_id=test.module_id,
            overall_score=round(evaluation.overall_score, 4),
            passed=passed,
            skill_scores=[SkillScoreRead(skill_name=name, score=round(score, 4)) for name, score in sorted(evaluation.skill_scores.items())],
            next_step=self.get_next_step(payload.user_id, test.module_id) if test.module_id else AdaptiveNextStepResponse(
                user_id=payload.user_id,
                module_id=0,
                step="done",
                chunked=False,
            ),
        )

    def submit_module_test(self, test_id: int, payload: AdaptiveTestSubmitRequest) -> AdaptiveTestSubmitResponse:
        self._ensure_user(payload.user_id)
        test = self._get_test(test_id)
        if test.test_type != "module":
            raise HTTPException(status_code=400, detail="Ожидался module-тест.")
        if test.module_id is None:
            raise HTTPException(status_code=400, detail="Module-тест должен быть привязан к модулю.")

        evaluation = self._evaluate_and_store_test(payload.user_id, test, payload.answers)
        passed = evaluation.overall_score >= MODULE_PASS_THRESHOLD
        self._apply_assessment_skill_scores(payload.user_id, evaluation.skill_scores, blend=0.4)
        module_progress = self._get_or_create_module_progress(payload.user_id, test.module_id)
        if passed:
            self._mark_module_completed(payload.user_id, test.module_id)
        else:
            module_progress.attempts_count += 1
            module_progress.status = "in_progress"
            struggling = module_progress.attempts_count >= MODULE_STRUGGLING_ATTEMPTS
            self.db.add(module_progress)
            self._set_module_topics_status(payload.user_id, test.module_id, status="struggling" if struggling else "in_progress")

        self.db.commit()
        return AdaptiveTestSubmitResponse(
            test_id=test.id,
            test_type=test.test_type,
            module_id=test.module_id,
            overall_score=round(evaluation.overall_score, 4),
            passed=passed,
            skill_scores=[SkillScoreRead(skill_name=name, score=round(score, 4)) for name, score in sorted(evaluation.skill_scores.items())],
            next_step=self.get_next_step(payload.user_id, test.module_id) if test.module_id else AdaptiveNextStepResponse(
                user_id=payload.user_id,
                module_id=0,
                step="done",
                chunked=False,
            ),
        )

    def get_adaptive_progress(self, user_id: int) -> AdaptiveProgressResponse:
        self._ensure_user(user_id)
        self._update_module_progress_snapshots(user_id)
        return AdaptiveProgressResponse(
            user_id=user_id,
            completed_modules=self.submission_repository.count_completed_modules(user_id),
            total_modules=self.submission_repository.count_modules(),
            completed_module_ids=self.submission_repository.list_completed_module_ids(user_id),
            completed_topics=self.submission_repository.count_completed_topics(user_id),
            total_topics=self.submission_repository.count_topics(),
            weak_skills=self._build_weak_skills(user_id),
            modules=self._build_personalized_modules(user_id),
        )

    def _ensure_user(self, user_id: int) -> None:
        if self.submission_repository.get_user(user_id) is None:
            raise HTTPException(status_code=404, detail="Пользователь не найден.")

    def _get_active_entry_test(self) -> DiagnosticTest:
        query = (
            select(DiagnosticTest)
            .where(DiagnosticTest.is_active.is_(True), DiagnosticTest.test_type == "entry")
            .options(selectinload(DiagnosticTest.questions).selectinload(DiagnosticQuestion.skill_mappings))
            .order_by(DiagnosticTest.id.asc())
        )
        test = self.db.scalars(query).first()
        if test is None:
            raise HTTPException(status_code=404, detail="Входной тест не найден.")
        return test

    def _get_test(self, test_id: int) -> DiagnosticTest:
        query = (
            select(DiagnosticTest)
            .where(DiagnosticTest.id == test_id)
            .options(selectinload(DiagnosticTest.questions).selectinload(DiagnosticQuestion.skill_mappings))
        )
        test = self.db.scalar(query)
        if test is None:
            raise HTTPException(status_code=404, detail="Тест не найден.")
        return test

    def _get_test_by_type(self, module_id: int, test_type: str) -> DiagnosticTest | None:
        query = (
            select(DiagnosticTest)
            .where(
                DiagnosticTest.is_active.is_(True),
                DiagnosticTest.module_id == module_id,
                DiagnosticTest.test_type == test_type,
            )
            .options(selectinload(DiagnosticTest.questions).selectinload(DiagnosticQuestion.skill_mappings))
            .order_by(DiagnosticTest.id.asc())
        )
        return self.db.scalars(query).first()

    def _evaluate_and_store_test(self, user_id: int, test: DiagnosticTest, answers: list) -> _TestEval:
        selected_by_question = {item.question_id: item.selected_answer.strip() for item in answers}
        question_ids = [question.id for question in test.questions]
        if not question_ids:
            raise HTTPException(status_code=400, detail="Тест не содержит вопросов.")

        self.db.execute(
            delete(DiagnosticAnswer).where(
                DiagnosticAnswer.user_id == user_id,
                DiagnosticAnswer.test_id == test.id,
            )
        )

        weighted_total: dict[str, float] = defaultdict(float)
        weighted_correct: dict[str, float] = defaultdict(float)
        correct_answers = 0

        for question in sorted(test.questions, key=lambda item: item.order_index):
            selected_answer = selected_by_question.get(question.id, "")
            is_correct = selected_answer.casefold() == question.correct_answer.strip().casefold()
            if is_correct:
                correct_answers += 1

            self.db.add(
                DiagnosticAnswer(
                    user_id=user_id,
                    test_id=test.id,
                    question_id=question.id,
                    selected_answer=selected_answer,
                    is_correct=is_correct,
                )
            )

            for mapping in question.skill_mappings:
                weighted_total[mapping.skill_name] += mapping.weight
                if is_correct:
                    weighted_correct[mapping.skill_name] += mapping.weight

        self.db.flush()
        total_questions = len(test.questions)
        skill_scores = {
            skill_name: (weighted_correct[skill_name] / weighted_total[skill_name]) if weighted_total[skill_name] > 0 else 0.0
            for skill_name in weighted_total
        }
        return _TestEval(
            overall_score=(correct_answers / total_questions) if total_questions else 0.0,
            skill_scores=skill_scores,
        )

    def _build_skill_scores(self, user_id: int) -> list[SkillScoreRead]:
        scores = self.submission_repository.list_user_skill_scores(user_id)
        return [SkillScoreRead(skill_name=item.skill_name, score=round(item.skill_score, 4)) for item in scores]

    def _build_weak_skills(self, user_id: int) -> list[WeakSkillRead]:
        weak_skills: list[WeakSkillRead] = []
        for user_skill in self.submission_repository.list_user_skill_scores(user_id):
            if user_skill.skill_score < WEAK_SKILL_THRESHOLD:
                deficit = max(0.0, TARGET_SKILL_SCORE - user_skill.skill_score)
                weak_skills.append(
                    WeakSkillRead(
                        skill_name=user_skill.skill_name,
                        score=round(user_skill.skill_score, 4),
                        deficit=round(deficit, 4),
                    )
                )
        weak_skills.sort(key=lambda item: (item.score, item.skill_name))
        return weak_skills

    def _build_personalized_modules(self, user_id: int) -> list[AdaptiveModuleRead]:
        modules = self._list_modules_with_topics()
        user_skills = {item.skill_name: item.skill_score for item in self.submission_repository.list_user_skill_scores(user_id)}
        completed_module_ids = set(self.submission_repository.list_completed_module_ids(user_id))
        mapping_weights_by_module = self._module_skill_weights_map()

        ranked: list[tuple[float, int, AdaptiveModuleRead]] = []
        for module in modules:
            fallback_topic_skills: dict[str, float] = defaultdict(float)
            for lesson in module.lessons:
                for topic in lesson.topics:
                    fallback_topic_skills[topic.skill_name] += 1.0

            # Primary source: skill_mapping weights from micro/module tests.
            # Fallback: topic skill coverage when mappings are absent.
            skill_weights = mapping_weights_by_module.get(module.id) or dict(fallback_topic_skills)
            skills = sorted(skill_weights.keys())
            weighted_deficits = {
                skill: max(0.0, TARGET_SKILL_SCORE - user_skills.get(skill, 0.5)) * max(0.0, weight)
                for skill, weight in skill_weights.items()
            }
            priority = round(sum(weighted_deficits.values()), 4)
            status = self._module_status_for_user(user_id, module.id, completed_module_ids)
            if status == "completed":
                priority = -1.0
                reason = "Модуль уже завершён."
            elif not skills:
                reason = "Вспомогательный модуль без диагностических навыков."
            else:
                top_skill = max(weighted_deficits.items(), key=lambda item: item[1])[0]
                reason = f"Рекомендуется для усиления навыка: {top_skill}."

            ranked.append(
                (
                    priority,
                    module.order_index,
                    AdaptiveModuleRead(
                        module_id=module.id,
                        title=module.title,
                        difficulty=module.difficulty,
                        order_index=module.order_index,
                        priority=priority,
                        reason=reason,
                        status=status,
                        skills=skills,
                    ),
                )
            )

        ranked.sort(key=lambda item: (-item[0], item[1]))
        return [item[2] for item in ranked]

    def _module_skill_weights_map(self) -> dict[int, dict[str, float]]:
        weighted_rows = self.db.execute(
            select(
                DiagnosticTest.module_id,
                SkillMapping.skill_name,
                func.sum(SkillMapping.weight),
            )
            .join(DiagnosticQuestion, DiagnosticQuestion.test_id == DiagnosticTest.id)
            .join(SkillMapping, SkillMapping.question_id == DiagnosticQuestion.id)
            .where(
                DiagnosticTest.is_active.is_(True),
                DiagnosticTest.module_id.is_not(None),
                DiagnosticTest.test_type.in_(("micro", "module")),
            )
            .group_by(
                DiagnosticTest.module_id,
                SkillMapping.skill_name,
            )
        ).all()

        result: dict[int, dict[str, float]] = defaultdict(dict)
        for module_id, skill_name, total_weight in weighted_rows:
            if module_id is None:
                continue
            result[int(module_id)][str(skill_name)] = float(total_weight or 0.0)
        return result

    def _module_status_for_user(self, user_id: int, module_id: int, completed_module_ids: set[int]) -> str:
        if module_id in completed_module_ids:
            return "completed"
        if self._is_module_struggling(user_id, module_id):
            return "struggling"
        module_progress = self._get_module_progress(user_id, module_id)
        if module_progress is not None:
            return "in_progress"
        topic_ids = self._module_topic_ids(module_id)
        if not topic_ids:
            return "not_started"
        any_topic_progress = self.db.scalar(
            select(func.count(Progress.id)).where(Progress.user_id == user_id, Progress.topic_id.in_(topic_ids))
        )
        return "in_progress" if (any_topic_progress or 0) > 0 else "not_started"

    def _is_module_struggling(self, user_id: int, module_id: int) -> bool:
        module_progress = self._get_module_progress(user_id, module_id)
        if module_progress is not None and module_progress.attempts_count >= min(MICRO_STRUGGLING_ATTEMPTS, MODULE_STRUGGLING_ATTEMPTS):
            return True
        topic_ids = self._module_topic_ids(module_id)
        if not topic_ids:
            return False
        struggling_topics = self.db.scalar(
            select(func.count(Progress.id)).where(
                Progress.user_id == user_id,
                Progress.topic_id.in_(topic_ids),
                Progress.status == "struggling",
            )
        )
        return (struggling_topics or 0) > 0

    def _list_modules_with_topics(self) -> list[Module]:
        query_with_topics = (
            select(Module)
            .options(
                selectinload(Module.lessons).selectinload(Lesson.topics).selectinload(Topic.theory_blocks),
            )
            .order_by(Module.order_index.asc())
        )
        return list(self.db.scalars(query_with_topics))

    def _get_module_with_topics(self, module_id: int) -> Module:
        query = (
            select(Module)
            .where(Module.id == module_id)
            .options(
                selectinload(Module.lessons).selectinload(Lesson.topics).selectinload(Topic.theory_blocks),
            )
        )
        module = self.db.scalar(query)
        if module is None:
            raise HTTPException(status_code=404, detail="Модуль не найден.")
        return module

    def _build_simple_topics(self, module: Module) -> list[AdaptiveSimpleTopicRead]:
        result: list[AdaptiveSimpleTopicRead] = []
        for lesson in sorted(module.lessons, key=lambda item: item.order_index):
            for topic in sorted(lesson.topics, key=lambda item: item.order_index):
                theory_text = ""
                for block in sorted(topic.theory_blocks, key=lambda item: item.order_index):
                    source = block.simplified_content.strip() or block.content.strip()
                    if source:
                        theory_text = source[:420]
                        break
                result.append(
                    AdaptiveSimpleTopicRead(
                        topic_id=topic.id,
                        title=topic.title,
                        skill_name=topic.skill_name,
                        simple_theory=theory_text,
                    )
                )
        return result

    def _get_user_test_status(self, user_id: int, test: DiagnosticTest | None, pass_threshold: float) -> _TestStatus:
        if test is None:
            return _TestStatus(attempted=False, passed=False, overall_score=0.0)

        question_ids = [question.id for question in test.questions]
        if not question_ids:
            return _TestStatus(attempted=False, passed=False, overall_score=0.0)

        query = select(DiagnosticAnswer).where(
            DiagnosticAnswer.user_id == user_id,
            DiagnosticAnswer.test_id == test.id,
            DiagnosticAnswer.question_id.in_(question_ids),
        )
        answers = list(self.db.scalars(query))
        attempted = len(answers) > 0
        if not attempted:
            return _TestStatus(attempted=False, passed=False, overall_score=0.0)

        correct = sum(1 for answer in answers if answer.is_correct)
        overall = correct / len(question_ids)
        passed = len(answers) >= len(question_ids) and overall >= pass_threshold
        return _TestStatus(attempted=True, passed=passed, overall_score=overall)

    def _apply_entry_skill_scores(self, user_id: int, skill_scores: dict[str, float]) -> None:
        for skill_name, score in skill_scores.items():
            user_skill = self.submission_repository.get_user_skill(user_id, skill_name)
            if user_skill is None:
                user_skill = UserSkill(
                    user_id=user_id,
                    skill_name=skill_name,
                    diagnostic_score=0.5,
                    exercise_score=0.5,
                    skill_score=0.5,
                    skill_level="basic",
                )

            user_skill.diagnostic_score = clamp_score(score)
            user_skill.skill_score = clamp_score(0.4 * user_skill.diagnostic_score + 0.6 * user_skill.exercise_score)
            user_skill.skill_level = level_from_score(user_skill.skill_score)
            self.db.add(user_skill)
        self.db.commit()

    def _apply_assessment_skill_scores(self, user_id: int, skill_scores: dict[str, float], blend: float) -> None:
        for skill_name, score in skill_scores.items():
            user_skill = self.submission_repository.get_user_skill(user_id, skill_name)
            if user_skill is None:
                user_skill = UserSkill(
                    user_id=user_id,
                    skill_name=skill_name,
                    diagnostic_score=0.5,
                    exercise_score=0.5,
                    skill_score=0.5,
                    skill_level="basic",
                )

            user_skill.exercise_score = clamp_score((1.0 - blend) * user_skill.exercise_score + blend * clamp_score(score))
            user_skill.skill_score = clamp_score(0.4 * user_skill.diagnostic_score + 0.6 * user_skill.exercise_score)
            user_skill.skill_level = level_from_score(user_skill.skill_score)
            self.db.add(user_skill)

    def _get_module_progress(self, user_id: int, module_id: int) -> ModuleProgress | None:
        query = select(ModuleProgress).where(ModuleProgress.user_id == user_id, ModuleProgress.module_id == module_id)
        return self.db.scalar(query)

    def _upsert_module_progress(self, user_id: int, module_id: int, status: str) -> None:
        progress = self._get_module_progress(user_id, module_id)
        if progress is None:
            progress = ModuleProgress(user_id=user_id, module_id=module_id, status=status, attempts_count=0)
        elif progress.status != "completed":
            progress.status = status
        self.db.add(progress)

    def _get_or_create_module_progress(self, user_id: int, module_id: int) -> ModuleProgress:
        progress = self._get_module_progress(user_id, module_id)
        if progress is None:
            progress = ModuleProgress(user_id=user_id, module_id=module_id, status="in_progress", attempts_count=0)
            self.db.add(progress)
            self.db.flush()
        return progress

    def _mark_module_completed(self, user_id: int, module_id: int) -> None:
        self.submission_repository.complete_module(user_id, module_id)
        self._set_module_topics_status(user_id, module_id, status="completed")
        self.db.commit()

    def _module_topic_ids(self, module_id: int) -> list[int]:
        query = (
            select(Topic.id)
            .join(Lesson, Topic.lesson_id == Lesson.id)
            .where(Lesson.module_id == module_id)
            .order_by(Lesson.order_index.asc(), Topic.order_index.asc(), Topic.id.asc())
        )
        return list(self.db.scalars(query))

    def _set_module_topics_status(self, user_id: int, module_id: int, status: str) -> None:
        topic_ids = self._module_topic_ids(module_id)
        for topic_id in topic_ids:
            entry = self.submission_repository.get_progress_entry(user_id, topic_id)
            if entry is None:
                entry = Progress(
                    user_id=user_id,
                    topic_id=topic_id,
                    status=status,
                    attempts_count=0,
                    last_submission_id=None,
                )
            else:
                entry.status = status
            self.db.add(entry)

    def _update_module_progress_snapshots(self, user_id: int) -> None:
        modules = self._list_modules_with_topics()
        for module in modules:
            topic_ids = [topic.id for lesson in module.lessons for topic in lesson.topics]
            if not topic_ids:
                continue
            progress_rows = self.db.scalars(
                select(Progress).where(Progress.user_id == user_id, Progress.topic_id.in_(topic_ids))
            ).all()
            if progress_rows and all(row.status == "completed" for row in progress_rows) and len(progress_rows) == len(topic_ids):
                self._upsert_module_progress(user_id, module.id, status="completed")
            elif any(row.status in {"in_progress", "struggling", "completed"} for row in progress_rows):
                self._upsert_module_progress(user_id, module.id, status="in_progress")
        self.db.commit()
