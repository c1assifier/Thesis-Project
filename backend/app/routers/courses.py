from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.course_schema import CourseRead
from app.services.course_service import CourseService

router = APIRouter(tags=["courses"])


@router.get("/courses", response_model=list[CourseRead])
def list_courses(db: Session = Depends(get_db)):
    return CourseService(db).list_courses()

