from sqlalchemy.orm import Session

from app.repositories.course_repository import CourseRepository
from app.repositories.exercise_repository import ExerciseRepository
from app.repositories.submission_repository import SubmissionRepository
from app.services.course_service import CourseService


def get_courses(db: Session):
    return CourseRepository(db).list_courses()


def get_modules_by_course(db: Session, course_id: int):
    return CourseRepository(db).list_modules(course_id)


def get_lessons_by_module(db: Session, module_id: int):
    return CourseRepository(db).list_lessons(module_id)


def get_exercises_by_lesson(db: Session, lesson_id: int):
    return ExerciseRepository(db).list_exercises_by_lesson(lesson_id)


def get_exercise(db: Session, exercise_id: int):
    return ExerciseRepository(db).get_exercise_with_tests(exercise_id)


def get_user(db: Session, user_id: int):
    return SubmissionRepository(db).get_user(user_id)


def create_user(db: Session, name: str):
    return SubmissionRepository(db).create_user(name)


def create_submission(db: Session, user_id: int, exercise_id: int, code: str, result: str, attempts: int):
    return SubmissionRepository(db).create_submission(
        user_id=user_id,
        exercise_id=exercise_id,
        code=code,
        result=result,
        attempts=attempts,
        stdout="",
        stderr="",
        execution_time=0.0,
    )


def seed_data(db: Session) -> None:
    CourseService(db).seed_course_content()
