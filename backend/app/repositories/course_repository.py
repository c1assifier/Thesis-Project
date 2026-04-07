from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Course, Lesson, Module, Topic


class CourseRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_courses(self) -> list[Course]:
        return list(self.db.scalars(select(Course).order_by(Course.id.asc())))

    def list_modules(self, course_id: int) -> list[Module]:
        query = select(Module).where(Module.course_id == course_id).order_by(Module.order_index.asc())
        return list(self.db.scalars(query))

    def list_lessons(self, module_id: int) -> list[Lesson]:
        query = select(Lesson).where(Lesson.module_id == module_id).order_by(Lesson.order_index.asc())
        return list(self.db.scalars(query))

    def get_lesson_with_content(self, lesson_id: int) -> Lesson | None:
        query = (
            select(Lesson)
            .where(Lesson.id == lesson_id)
            .options(
                selectinload(Lesson.topics)
                .selectinload(Topic.theory_blocks),
                selectinload(Lesson.topics)
                .selectinload(Topic.exercises),
            )
        )
        return self.db.scalar(query)

