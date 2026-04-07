from app.services.exercise_service import ExecutionResult, ExerciseService


def run_student_code(*args, **kwargs) -> ExecutionResult:
    raise RuntimeError("Legacy run_student_code wrapper is no longer supported without an ExerciseService instance.")


__all__ = ["ExecutionResult", "ExerciseService", "run_student_code"]
