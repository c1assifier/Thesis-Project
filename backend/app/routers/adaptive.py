from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.adaptive_schema import (
    AdaptiveEntrySubmitRequest,
    AdaptiveEntrySubmitResponse,
    AdaptiveNextStepResponse,
    AdaptivePathResponse,
    AdaptiveProgressResponse,
    AdaptiveTestSubmitRequest,
    AdaptiveTestSubmitResponse,
)
from app.services.adaptive_learning_service import AdaptiveLearningService

router = APIRouter(prefix="/adaptive", tags=["adaptive"])


@router.post("/entry/submit", response_model=AdaptiveEntrySubmitResponse)
def submit_entry_test(payload: AdaptiveEntrySubmitRequest, db: Session = Depends(get_db)):
    return AdaptiveLearningService(db).submit_entry(payload)


@router.get("/path/{user_id}", response_model=AdaptivePathResponse)
def get_adaptive_path(user_id: int, db: Session = Depends(get_db)):
    return AdaptiveLearningService(db).get_personalized_path(user_id)


@router.get("/modules/{module_id}/next-step", response_model=AdaptiveNextStepResponse)
def get_module_next_step(module_id: int, user_id: int, db: Session = Depends(get_db)):
    return AdaptiveLearningService(db).get_next_step(user_id=user_id, module_id=module_id)


@router.post("/micro-tests/{test_id}/submit", response_model=AdaptiveTestSubmitResponse)
def submit_micro_test(test_id: int, payload: AdaptiveTestSubmitRequest, db: Session = Depends(get_db)):
    return AdaptiveLearningService(db).submit_micro_test(test_id=test_id, payload=payload)


@router.post("/module-tests/{test_id}/submit", response_model=AdaptiveTestSubmitResponse)
def submit_module_test(test_id: int, payload: AdaptiveTestSubmitRequest, db: Session = Depends(get_db)):
    return AdaptiveLearningService(db).submit_module_test(test_id=test_id, payload=payload)


@router.get("/progress/{user_id}", response_model=AdaptiveProgressResponse)
def get_adaptive_progress(user_id: int, db: Session = Depends(get_db)):
    return AdaptiveLearningService(db).get_adaptive_progress(user_id)
