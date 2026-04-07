from datetime import datetime
from dataclasses import dataclass

from app.models import Exercise, Module, UserSkill
from app.repositories.course_repository import CourseRepository
from app.repositories.exercise_repository import ExerciseRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services.skill_utils import clamp_score, level_from_score


DEFAULT_SKILL_SCORE = 0.5
DIAGNOSTIC_WEIGHT = 0.4
EXERCISE_WEIGHT = 0.6


@dataclass
class RecommendationResult:
    module: Module | None
    reason: str
    next_exercise: Exercise | None


class AdaptiveService:
    def __init__(
        self,
        submission_repository: SubmissionRepository,
        exercise_repository: ExerciseRepository,
        course_repository: CourseRepository,
    ):
        self.submission_repository = submission_repository
        self.exercise_repository = exercise_repository
        self.course_repository = course_repository

    def _recalculate_skill(self, user_skill: UserSkill) -> UserSkill:
        user_skill.diagnostic_score = clamp_score(user_skill.diagnostic_score)
        user_skill.exercise_score = clamp_score(user_skill.exercise_score)
        user_skill.skill_score = clamp_score(
            DIAGNOSTIC_WEIGHT * user_skill.diagnostic_score + EXERCISE_WEIGHT * user_skill.exercise_score
        )
        user_skill.skill_level = level_from_score(user_skill.skill_score)
        user_skill.last_updated = datetime.utcnow()
        return user_skill

    def _build_user_skill(self, user_id: int, skill_name: str) -> UserSkill:
        return UserSkill(
            user_id=user_id,
            skill_name=skill_name,
            diagnostic_score=DEFAULT_SKILL_SCORE,
            exercise_score=DEFAULT_SKILL_SCORE,
            skill_score=DEFAULT_SKILL_SCORE,
            skill_level=level_from_score(DEFAULT_SKILL_SCORE),
        )

    def update_skill_score(self, user_id: int, skill_name: str, passed: bool, attempts: int) -> UserSkill:
        user_skill = self.submission_repository.get_user_skill(user_id, skill_name)
        if user_skill is None:
            user_skill = self._build_user_skill(user_id, skill_name)

        if passed:
            if attempts == 1:
                exercise_delta = 0.12
            elif attempts <= 3:
                exercise_delta = 0.0
            else:
                exercise_delta = -0.02
        else:
            exercise_delta = -0.08 if attempts < 3 else -0.12

        user_skill.exercise_score = clamp_score(user_skill.exercise_score + exercise_delta)
        self._recalculate_skill(user_skill)
        return self.submission_repository.save_user_skill(user_skill)

    def apply_diagnostic_scores(self, user_id: int, diagnostic_scores: dict[str, float]) -> list[UserSkill]:
        updated_skills: list[UserSkill] = []
        for skill_name, score in diagnostic_scores.items():
            user_skill = self.submission_repository.get_user_skill(user_id, skill_name)
            if user_skill is None:
                user_skill = self._build_user_skill(user_id, skill_name)

            user_skill.diagnostic_score = clamp_score(score)
            self._recalculate_skill(user_skill)
            updated_skills.append(self.submission_repository.save_user_skill(user_skill))

        return updated_skills

    def recommend_next_content(self, user_id: int, skill_name: str) -> RecommendationResult:
        skill = self.submission_repository.get_user_skill(user_id, skill_name)
        score = skill.skill_score if skill else DEFAULT_SKILL_SCORE
        passed_exercise_ids = self.submission_repository.list_passed_exercise_ids(user_id)

        target_difficulty = "medium"
        reason = "Рекомендуется стандартная траектория для закрепления навыка."
        if score < 0.4:
            target_difficulty = "easy"
            reason = "Навык ниже целевого уровня: начните с упрощённой теории и простого упражнения."
        elif score >= 0.7:
            target_difficulty = "hard"
            reason = "Навык освоен: переходите к следующей теме повышенной сложности."

        next_exercise = self.exercise_repository.get_next_exercise_by_skill_and_difficulty(
            skill_name=skill_name,
            difficulty=target_difficulty,
            exclude_ids=passed_exercise_ids,
        )
        if next_exercise is None:
            next_exercise = self.exercise_repository.get_next_exercise_by_skill(
                skill_name=skill_name,
                exclude_ids=passed_exercise_ids,
            )
            reason = "Подобрано ближайшее доступное упражнение по навыку."

        module = None
        if next_exercise is not None:
            lesson = next_exercise.topic.lesson
            module = lesson.module

        return RecommendationResult(module=module, reason=reason, next_exercise=next_exercise)
