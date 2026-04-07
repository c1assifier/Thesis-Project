from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Module
from app.schemas.course_schema import ModuleRead
from app.schemas.submission_schema import ModuleCompleteRequest, ModuleCompleteResponse
from app.repositories.submission_repository import SubmissionRepository
from app.services.course_service import CourseService

router = APIRouter(tags=["modules"])


@router.get("/modules/{course_id}", response_model=list[ModuleRead])
def list_modules(course_id: int, db: Session = Depends(get_db)):
    return CourseService(db).list_modules(course_id)


@router.post("/modules/{module_id}/complete", response_model=ModuleCompleteResponse)
def complete_module(module_id: int, payload: ModuleCompleteRequest, db: Session = Depends(get_db)):
    repository = SubmissionRepository(db)
    user = repository.get_user(payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found.")

    record = repository.complete_module(payload.user_id, module_id)
    return ModuleCompleteResponse(user_id=payload.user_id, module_id=module_id, status=record.status)
