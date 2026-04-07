from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.course_schema import ExerciseRead
from app.schemas.exercise_schema import ExplainRequest, ExplainResponse, RecommendationRequest, RecommendationResponse
from app.repositories.course_repository import CourseRepository
from app.repositories.exercise_repository import ExerciseRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services.adaptive_service import AdaptiveService
from app.services.course_service import CourseService
from app.services.explain_service import ExplainService

router = APIRouter(tags=["exercises"])


@router.get("/exercises/{lesson_id}", response_model=list[ExerciseRead])
def list_exercises(lesson_id: int, db: Session = Depends(get_db)):
    return CourseService(db).list_exercises_by_lesson(lesson_id)


@router.post("/recommend_next_module", response_model=RecommendationResponse)
def recommend_next_module(payload: RecommendationRequest, db: Session = Depends(get_db)):
    adaptive_service = AdaptiveService(
        submission_repository=SubmissionRepository(db),
        exercise_repository=ExerciseRepository(db),
        course_repository=CourseRepository(db),
    )
    recommendation = adaptive_service.recommend_next_content(payload.user_id, payload.skill)
    if recommendation.module is None:
        return RecommendationResponse(module_id=None, title=None, difficulty=None, reason=recommendation.reason, next_exercise_id=None)

    return RecommendationResponse(
        module_id=recommendation.module.id,
        title=recommendation.module.title,
        difficulty=recommendation.module.difficulty,
        reason=recommendation.reason,
        next_exercise_id=recommendation.next_exercise.id if recommendation.next_exercise else None,
    )


@router.post("/explain", response_model=ExplainResponse)
def explain_topic(payload: ExplainRequest, db: Session = Depends(get_db)):
    text = ExplainService(db).explain_topic(payload.topic_id, payload.level)
    return ExplainResponse(text=text, source="backend", level=payload.level)
