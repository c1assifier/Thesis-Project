from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import adaptive_engine, crud, schemas
from app.code_runner import run_student_code
from app.database import get_db
from app.llm_service import generate_hint

router = APIRouter(tags=["submissions"])


@router.post("/submit", response_model=schemas.SubmissionResponse)
def submit_solution(payload: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    user = crud.get_user(db, payload.user_id)
    exercise = crud.get_exercise(db, payload.exercise_id)
    if user is None or exercise is None:
        raise HTTPException(status_code=404, detail="User or exercise not found.")

    previous_attempts = adaptive_engine.count_attempts(db, payload.user_id, payload.exercise_id)
    attempts = previous_attempts + 1

    try:
        execution = run_student_code(payload.code, payload.exercise_id)
    except ValueError as exc:
        execution = type("ExecutionResult", (), {
            "stdout": "",
            "stderr": str(exc),
            "passed": False,
            "feedback": "Submission blocked for security reasons.",
        })()

    submission = crud.create_submission(
        db=db,
        user_id=payload.user_id,
        exercise_id=payload.exercise_id,
        code=payload.code,
        result="passed" if execution.passed else "failed",
        attempts=attempts,
    )
    adaptive_engine.update_skill_score(db, payload.user_id, exercise.skill, execution.passed, attempts)
    recommended_module, reason = adaptive_engine.recommend_next_module(db, payload.user_id, exercise.skill)

    recommendation = None
    if recommended_module is not None:
        recommendation = f"{recommended_module.title} ({recommended_module.difficulty}) - {reason}"

    return schemas.SubmissionResponse(
        submission=submission,
        stdout=execution.stdout,
        stderr=execution.stderr,
        passed=execution.passed,
        feedback=execution.feedback,
        recommendation=recommendation,
    )


@router.post("/hint", response_model=schemas.HintResponse)
def request_hint(payload: schemas.HintRequest, db: Session = Depends(get_db)):
    exercise = crud.get_exercise(db, payload.exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found.")

    attempts = adaptive_engine.count_attempts(db, payload.user_id, payload.exercise_id)
    if attempts < 3:
        return schemas.HintResponse(
            hint="Hints are available after 3 failed attempts. Review the exercise requirements and your latest error first.",
            llm_used=False,
        )

    hint = generate_hint(payload.error_message, exercise.description)
    return schemas.HintResponse(hint=hint.hint, llm_used=hint.llm_used)

