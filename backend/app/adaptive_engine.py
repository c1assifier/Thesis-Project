from sqlalchemy.orm import Session

from app.repositories.course_repository import CourseRepository
from app.repositories.exercise_repository import ExerciseRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services.adaptive_service import AdaptiveService, RecommendationResult


def _service(db: Session) -> AdaptiveService:
    return AdaptiveService(SubmissionRepository(db), ExerciseRepository(db), CourseRepository(db))


def update_skill_score(db: Session, user_id: int, skill: str, passed: bool, attempts: int):
    return _service(db).update_skill_score(user_id, skill, passed, attempts)


def recommend_next_module(db: Session, user_id: int, skill: str):
    recommendation = _service(db).recommend_next_content(user_id, skill)
    return recommendation.module, recommendation.reason


def count_attempts(db: Session, user_id: int, exercise_id: int) -> int:
    return SubmissionRepository(db).count_attempts(user_id, exercise_id)


__all__ = ["AdaptiveService", "RecommendationResult", "update_skill_score", "recommend_next_module", "count_attempts"]
