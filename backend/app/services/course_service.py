import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Course, Exercise, Lesson, Module, TestCase, TheoryBlock, Topic
from app.repositories.course_repository import CourseRepository
from app.repositories.exercise_repository import ExerciseRepository


class CourseService:
    def __init__(self, db: Session):
        self.db = db
        self.course_repository = CourseRepository(db)
        self.exercise_repository = ExerciseRepository(db)

    def list_courses(self):
        return self.course_repository.list_courses()

    def list_modules(self, course_id: int):
        return self.course_repository.list_modules(course_id)

    def list_lessons(self, module_id: int):
        return self.course_repository.list_lessons(module_id)

    def list_exercises_by_lesson(self, lesson_id: int):
        return self.exercise_repository.list_exercises_by_lesson(lesson_id)

    def get_lesson_content(self, lesson_id: int):
        return self.course_repository.get_lesson_with_content(lesson_id)

    def count_exercises(self) -> int:
        return self.exercise_repository.count_exercises()

    def seed_course_content(self) -> None:
        existing_courses = self.course_repository.list_courses()
        if existing_courses:
            for course in existing_courses:
                self._ensure_intro_module(course.id)
            self.db.commit()
            return

        seed_path = Path(settings.seed_data_path)
        if not seed_path.exists():
            seed_path = Path(__file__).resolve().parent.parent / "data" / "course_seed.json"

        payload = json.loads(seed_path.read_text(encoding="utf-8"))
        for course_payload in payload["courses"]:
            course = Course(
                title=course_payload["title"],
                description=course_payload["description"],
                goals=course_payload["goals"],
                adaptive_overview=course_payload["adaptive_overview"],
            )
            self.db.add(course)
            self.db.flush()
            self._seed_intro_module(course.id)

            for module_payload in course_payload["modules"]:
                module = Module(
                    course_id=course.id,
                    title=module_payload["title"],
                    difficulty=module_payload["difficulty"],
                    order_index=module_payload["order_index"],
                )
                self.db.add(module)
                self.db.flush()

                for lesson_payload in module_payload["lessons"]:
                    lesson = Lesson(
                        module_id=module.id,
                        title=lesson_payload["title"],
                        content=lesson_payload["content"],
                        order_index=lesson_payload["order_index"],
                    )
                    self.db.add(lesson)
                    self.db.flush()

                    for topic_payload in lesson_payload["topics"]:
                        topic = Topic(
                            lesson_id=lesson.id,
                            title=topic_payload["title"],
                            difficulty=topic_payload["difficulty"],
                            skill_name=topic_payload["skill_name"],
                            order_index=topic_payload["order_index"],
                        )
                        self.db.add(topic)
                        self.db.flush()

                        for theory_payload in topic_payload["theory_blocks"]:
                            self.db.add(
                                TheoryBlock(
                                    topic_id=topic.id,
                                    title=theory_payload["title"],
                                    block_type=theory_payload.get("block_type", "text"),
                                    content=theory_payload["content"],
                                    simplified_content=theory_payload.get("simplified_content", ""),
                                    difficulty=theory_payload["difficulty"],
                                    order_index=theory_payload["order_index"],
                                )
                            )
                        self.db.flush()

                        for exercise_payload in topic_payload["exercises"]:
                            exercise = Exercise(
                                topic_id=topic.id,
                                title=exercise_payload["title"],
                                description=exercise_payload["description"],
                                starter_code=exercise_payload["starter_code"],
                                solution=exercise_payload["solution"],
                                difficulty=exercise_payload["difficulty"],
                                skill_name=exercise_payload["skill_name"],
                                order_index=exercise_payload["order_index"],
                            )
                            self.db.add(exercise)
                            self.db.flush()

                            for test_case_payload in exercise_payload["test_cases"]:
                                self.db.add(
                                    TestCase(
                                        exercise_id=exercise.id,
                                        title=test_case_payload["title"],
                                        input_data=test_case_payload.get("input_data", ""),
                                        expected_output=test_case_payload.get("expected_output", ""),
                                        assertion_code=test_case_payload["assertion_code"],
                                        order_index=test_case_payload["order_index"],
                                    )
                                )

        self.db.commit()

    def _seed_intro_module(self, course_id: int) -> None:
        modules = self.course_repository.list_modules(course_id)
        if modules:
            first_module = min(modules, key=lambda module: module.order_index)
            if first_module.order_index == 0 and first_module.title.startswith("Модуль 0"):
                return

        intro_module = Module(
            course_id=course_id,
            title="Модуль 0 — Введение",
            difficulty="easy",
            order_index=0,
        )
        self.db.add(intro_module)
        self.db.flush()

        intro_lessons = [
            ("О курсе", "Вы узнаете структуру курса, роли теории и практики, а также как фиксируется прогресс."),
            (
                "Как проходит обучение",
                "Курс проходит по шагам: теория, короткая проверка понимания, практическое упражнение и обратная связь.",
            ),
            (
                "Как работает адаптация",
                "Система отслеживает ответы и попытки решения, обновляет skill_score и подбирает следующую тему автоматически.",
            ),
            (
                "Что делать, если не получается",
                "Используйте подсказки, упрощённые объяснения и дополнительные упражнения. Ошибки нужны для диагностики пробелов.",
            ),
            (
                "Входное тестирование",
                "После этого урока откройте диагностический тест, чтобы система сформировала индивидуальную траекторию обучения.",
            ),
        ]

        for index, (title, content) in enumerate(intro_lessons, start=1):
            self.db.add(
                Lesson(
                    module_id=intro_module.id,
                    title=title,
                    content=content,
                    order_index=index,
                )
            )

    def _ensure_intro_module(self, course_id: int) -> None:
        modules = self.course_repository.list_modules(course_id)
        if any(module.order_index == 0 for module in modules):
            return
        self._seed_intro_module(course_id)
