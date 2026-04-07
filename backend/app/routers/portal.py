from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.portal_schema import PortalBootstrapRead, PortalModuleDetailsRead
from app.services.portal_service import PortalService

router = APIRouter(prefix="/portal", tags=["portal"])


@router.get("/bootstrap", response_model=PortalBootstrapRead)
def get_portal_bootstrap(user_id: int = Query(...), db: Session = Depends(get_db)):
    return PortalService(db).get_bootstrap(user_id)


@router.get("/modules/{portal_module_id}", response_model=PortalModuleDetailsRead)
def get_portal_module_details(
    portal_module_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    payload = PortalService(db).get_module_details(portal_module_id, user_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Portal module not found.")
    return payload
