from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.course_schema import LessonContentRead, LessonRead
from app.services.course_service import CourseService

router = APIRouter(tags=["lessons"])


@router.get("/lessons/{module_id}", response_model=list[LessonRead])
def list_lessons(module_id: int, db: Session = Depends(get_db)):
    return CourseService(db).list_lessons(module_id)


@router.get("/lessons/content/{lesson_id}", response_model=LessonContentRead)
def get_lesson_content(lesson_id: int, db: Session = Depends(get_db)):
    lesson = CourseService(db).get_lesson_content(lesson_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    return lesson

