from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(tags=["modules"])


@router.get("/modules/{course_id}", response_model=list[schemas.ModuleRead])
def list_modules(course_id: int, db: Session = Depends(get_db)):
    return crud.get_modules_by_course(db, course_id)

