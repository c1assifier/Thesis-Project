from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(tags=["courses"])


@router.get("/courses", response_model=list[schemas.CourseRead])
def list_courses(db: Session = Depends(get_db)):
    return crud.get_courses(db)

