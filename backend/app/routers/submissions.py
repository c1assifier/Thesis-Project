from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.course_repository import CourseRepository
from app.repositories.exercise_repository import ExerciseRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.exercise_schema import HintRequest, HintResponse
from app.schemas.submission_schema import ProgressResponse, SubmissionCreate, SubmissionResponse, UserCreate, UserRead
from app.services.adaptive_service import AdaptiveService
from app.services.exercise_service import ExecutionResult, ExerciseService
from app.services.hint_service import HintService

router = APIRouter(tags=["submissions"])


def _build_blocked_result(message: str) -> ExecutionResult:
    return ExecutionResult(stdout="", stderr=message, execution_time=0.0, passed=False, feedback="Решение заблокировано политикой безопасности.")


@router.post("/register_user", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    repository = SubmissionRepository(db)
    try:
        return repository.create_user(payload.name)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует.") from exc


@router.post("/submit", response_model=SubmissionResponse)
def submit_solution(payload: SubmissionCreate, db: Session = Depends(get_db)):
    submission_repository = SubmissionRepository(db)
    exercise_repository = ExerciseRepository(db)
    course_repository = CourseRepository(db)
    exercise_service = ExerciseService(db)
    adaptive_service = AdaptiveService(submission_repository, exercise_repository, course_repository)

    user = submission_repository.get_user(payload.user_id)
    exercise = exercise_service.get_exercise(payload.exercise_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    attempts = submission_repository.count_attempts(payload.user_id, payload.exercise_id) + 1
    try:
        execution = exercise_service.run_student_code(payload.code, payload.exercise_id)
    except ValueError as exc:
        execution = _build_blocked_result(str(exc))

    submission = submission_repository.create_submission(
        user_id=payload.user_id,
        exercise_id=payload.exercise_id,
        code=payload.code,
        result="passed" if execution.passed else "failed",
        attempts=attempts,
        stdout=execution.stdout,
        stderr=execution.stderr,
        execution_time=execution.execution_time,
    )

    adaptive_service.update_skill_score(payload.user_id, exercise.skill_name, execution.passed, attempts)
    recommendation = adaptive_service.recommend_next_content(payload.user_id, exercise.skill_name)
    skill_scores = submission_repository.list_user_skill_scores(payload.user_id)
    status = "in_progress"
    if execution.passed:
        status = "completed"
    elif attempts >= 5:
        status = "struggling"
    submission_repository.update_progress_entry(
        user_id=payload.user_id,
        topic_id=exercise.topic_id,
        status=status,
        attempts_count=attempts,
        last_submission_id=submission.id,
    )

    recommendation_text = recommendation.reason
    if recommendation.module is not None:
        recommendation_text = f"{recommendation.module.title} ({recommendation.module.difficulty}) — {recommendation.reason}"
    if not execution.passed and attempts >= 5:
        recommendation_text += " После 5 попыток рекомендуется открыть упрощённое объяснение темы."
    elif not execution.passed and attempts >= 3:
        recommendation_text += " Доступна подсказка: нажмите Hint."

    return SubmissionResponse(
        submission=submission,
        stdout=execution.stdout,
        stderr=execution.stderr,
        passed=execution.passed,
        feedback=execution.feedback,
        execution_time=execution.execution_time,
        recommendation=recommendation_text,
        next_exercise_id=recommendation.next_exercise.id if recommendation.next_exercise else None,
        skill_scores=skill_scores,
    )


@router.post("/hint", response_model=HintResponse)
def request_hint(payload: HintRequest, db: Session = Depends(get_db)):
    exercise = ExerciseService(db).get_exercise(payload.exercise_id)
    submission_repository = SubmissionRepository(db)
    failed_attempts = submission_repository.count_failed_attempts(payload.user_id, payload.exercise_id)
    if failed_attempts < 3:
        return HintResponse(
            hint="Подсказка станет доступна после 3 неудачных попыток. Сначала проанализируйте условие и ошибку интерпретатора.",
            llm_used=False,
        )

    hint = HintService().generate_hint(payload.error_message, exercise.description)
    return HintResponse(hint=hint.hint, llm_used=hint.llm_used)


@router.get("/progress/{user_id}", response_model=ProgressResponse)
def get_progress(user_id: int, db: Session = Depends(get_db)):
    submission_repository = SubmissionRepository(db)
    user = submission_repository.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return ProgressResponse(
        user_id=user_id,
        completed_exercises=submission_repository.get_completed_exercises_count(user_id),
        total_submissions=submission_repository.get_total_submissions(user_id),
        success_rate=submission_repository.get_success_rate(user_id),
        completed_modules=submission_repository.count_completed_modules(user_id),
        total_modules=submission_repository.count_modules(),
        completed_module_ids=submission_repository.list_completed_module_ids(user_id),
        completed_topics=submission_repository.count_completed_topics(user_id),
        total_topics=submission_repository.count_topics(),
        intro_completed=user.intro_completed,
        diagnostic_completed=user.diagnostic_completed,
        skill_scores=submission_repository.list_user_skill_scores(user_id),
    )


@router.post("/users/{user_id}/complete_intro", response_model=UserRead)
def complete_intro(user_id: int, db: Session = Depends(get_db)):
    updated = SubmissionRepository(db).set_intro_completed(user_id, value=True)
    if updated is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return updated
