from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(tags=["exercises"])


@router.get("/exercises/{lesson_id}", response_model=list[schemas.ExerciseRead])
def list_exercises(lesson_id: int, db: Session = Depends(get_db)):
    return crud.get_exercises_by_lesson(db, lesson_id)

