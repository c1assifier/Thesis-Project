from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(tags=["lessons"])


@router.get("/lessons/{module_id}", response_model=list[schemas.LessonRead])
def list_lessons(module_id: int, db: Session = Depends(get_db)):
    return crud.get_lessons_by_module(db, module_id)

