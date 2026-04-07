from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Exercise, Lesson, Module, TestCase, TheoryBlock, Topic


class ExerciseRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_exercises_by_lesson(self, lesson_id: int) -> list[Exercise]:
        query = (
            select(Exercise)
            .join(Topic, Exercise.topic_id == Topic.id)
            .where(Topic.lesson_id == lesson_id)
            .options(selectinload(Exercise.topic).selectinload(Topic.theory_blocks))
            .order_by(Topic.order_index.asc(), Exercise.order_index.asc())
        )
        return list(self.db.scalars(query))

    def get_exercise_with_tests(self, exercise_id: int) -> Exercise | None:
        query = (
            select(Exercise)
            .where(Exercise.id == exercise_id)
            .options(
                selectinload(Exercise.test_cases),
                selectinload(Exercise.topic).selectinload(Topic.theory_blocks),
            )
        )
        return self.db.scalar(query)

    def list_theory_blocks_for_topic(self, topic_id: int) -> list[TheoryBlock]:
        query = select(TheoryBlock).where(TheoryBlock.topic_id == topic_id).order_by(TheoryBlock.order_index.asc())
        return list(self.db.scalars(query))

    def get_topic_with_theory(self, topic_id: int) -> Topic | None:
        query = (
            select(Topic)
            .where(Topic.id == topic_id)
            .options(selectinload(Topic.theory_blocks))
        )
        return self.db.scalar(query)

    def get_next_exercise_by_skill_and_difficulty(self, skill_name: str, difficulty: str, exclude_ids: list[int] | None = None) -> Exercise | None:
        query = (
            select(Exercise)
            .where(Exercise.skill_name == skill_name, Exercise.difficulty == difficulty)
            .options(selectinload(Exercise.topic).selectinload(Topic.lesson).selectinload(Lesson.module))
            .order_by(Exercise.order_index.asc(), Exercise.id.asc())
        )
        exercises = list(self.db.scalars(query))
        excluded = set(exclude_ids or [])
        for exercise in exercises:
            if exercise.id not in excluded:
                return exercise
        return exercises[0] if exercises else None

    def get_next_exercise_by_skill(self, skill_name: str, exclude_ids: list[int] | None = None) -> Exercise | None:
        query = (
            select(Exercise)
            .where(Exercise.skill_name == skill_name)
            .options(selectinload(Exercise.topic).selectinload(Topic.lesson).selectinload(Lesson.module))
            .order_by(Exercise.order_index.asc(), Exercise.id.asc())
        )
        exercises = list(self.db.scalars(query))
        excluded = set(exclude_ids or [])
        for exercise in exercises:
            if exercise.id not in excluded:
                return exercise
        return exercises[0] if exercises else None

    def list_all_topics_for_lesson(self, lesson_id: int) -> list[Topic]:
        query = (
            select(Topic)
            .where(Topic.lesson_id == lesson_id)
            .options(selectinload(Topic.theory_blocks), selectinload(Topic.exercises).selectinload(Exercise.test_cases))
            .order_by(Topic.order_index.asc())
        )
        return list(self.db.scalars(query))

    def count_exercises(self) -> int:
        return int(self.db.scalar(select(func.count(Exercise.id))) or 0)
