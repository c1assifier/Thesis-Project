from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import adaptive_engine, schemas
from app.database import get_db

router = APIRouter(tags=["recommendations"])


@router.post("/recommend_next_module", response_model=schemas.RecommendationResponse)
def recommend_next_module(payload: schemas.RecommendationRequest, db: Session = Depends(get_db)):
    module, reason = adaptive_engine.recommend_next_module(db, payload.user_id, payload.skill)
    if module is None:
        return schemas.RecommendationResponse(module_id=None, title=None, difficulty=None, reason=reason)
    return schemas.RecommendationResponse(
        module_id=module.id,
        title=module.title,
        difficulty=module.difficulty,
        reason=reason,
    )

