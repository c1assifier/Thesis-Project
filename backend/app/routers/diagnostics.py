from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.diagnostic_schema import DiagnosticSubmitRequest, DiagnosticSubmitResponse, DiagnosticTestRead
from app.services.diagnostic_service import DiagnosticService

router = APIRouter(tags=["diagnostics"])


@router.get("/diagnostic-tests/active", response_model=DiagnosticTestRead)
def get_active_diagnostic_test(db: Session = Depends(get_db)):
    service = DiagnosticService(db)
    return service.get_active_test_payload()


@router.get("/diagnostic-tests/{test_id}", response_model=DiagnosticTestRead)
def get_diagnostic_test(test_id: int, db: Session = Depends(get_db)):
    service = DiagnosticService(db)
    return service.get_test_payload(test_id)


@router.post("/diagnostic-tests/{test_id}/submit", response_model=DiagnosticSubmitResponse)
def submit_diagnostic_test(test_id: int, payload: DiagnosticSubmitRequest, db: Session = Depends(get_db)):
    service = DiagnosticService(db)
    return service.submit_diagnostic(test_id, payload)
