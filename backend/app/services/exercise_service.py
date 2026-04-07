import ast
import os
import subprocess
import sys
import tempfile
import textwrap
import time
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.exercise_repository import ExerciseRepository


FORBIDDEN_PATTERNS = {
    "os.system",
    "subprocess",
    "shutil",
    "socket",
    "pathlib.Path(",
    "__import__",
    "eval(",
    "exec(",
    "open(",
    "compile(",
    "input(",
}


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    execution_time: float
    passed: bool
    feedback: str


class ExerciseService:
    def __init__(self, db: Session):
        self.repository = ExerciseRepository(db)

    def get_exercise(self, exercise_id: int):
        exercise = self.repository.get_exercise_with_tests(exercise_id)
        if exercise is None:
            raise HTTPException(status_code=404, detail="Exercise not found.")
        return exercise

    def list_exercises_by_lesson(self, lesson_id: int):
        return self.repository.list_exercises_by_lesson(lesson_id)

    def validate_code(self, code: str) -> None:
        for pattern in FORBIDDEN_PATTERNS:
            if pattern in code:
                raise ValueError(f"Forbidden operation detected: {pattern}")

        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                for alias in node.names:
                    if alias.name.split(".")[0] in {"os", "subprocess", "socket", "shutil", "sys"}:
                        raise ValueError(f"Import '{alias.name}' is not allowed.")
            if isinstance(node, ast.While) and isinstance(node.test, ast.Constant) and node.test.value is True:
                raise ValueError("Infinite while loops are not allowed.")

    def _build_script(self, student_code: str, assertion_blocks: list[str]) -> str:
        assertions = "\n".join(assertion_blocks)
        return textwrap.dedent(
            f"""
            {student_code}

            if __name__ == "__main__":
                {textwrap.indent(assertions, "    ")}
            """
        )

    def run_student_code(self, code: str, exercise_id: int, timeout: int = 2) -> ExecutionResult:
        self.validate_code(code)
        exercise = self.get_exercise(exercise_id)
        assertion_blocks = [textwrap.dedent(case.assertion_code).strip() for case in sorted(exercise.test_cases, key=lambda item: item.order_index)]
        if not assertion_blocks:
            return ExecutionResult("", "", 0.0, False, "Для упражнения не настроены тестовые случаи.")

        script = self._build_script(code, assertion_blocks)
        with tempfile.TemporaryDirectory() as temp_dir:
            script_path = os.path.join(temp_dir, "student_submission.py")
            with open(script_path, "w", encoding="utf-8") as handle:
                handle.write(script)

            env = {"PYTHONIOENCODING": "utf-8"}
            started_at = time.perf_counter()
            try:
                completed = subprocess.run(
                    [sys.executable, "-I", "-S", script_path],
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    cwd=temp_dir,
                    env=env,
                )
                execution_time = time.perf_counter() - started_at
            except subprocess.TimeoutExpired:
                return ExecutionResult("", "Execution timed out.", float(timeout), False, "Превышено ограничение по времени выполнения.")

        passed = completed.returncode == 0
        feedback = "Все тесты пройдены успешно." if passed else "Часть тестов не пройдена. Исправьте код и попробуйте снова."
        return ExecutionResult(
            stdout=completed.stdout.strip(),
            stderr=completed.stderr.strip(),
            execution_time=round(execution_time, 4),
            passed=passed,
            feedback=feedback,
        )

