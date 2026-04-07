from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.auth_schema import AuthResponse, LoginRequest, RegisterRequest
from app.services.passwords import hash_password, verify_password

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    repository = SubmissionRepository(db)
    try:
        user = repository.create_user(payload.name, password_hash=hash_password(payload.password))
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Пользователь с таким именем уже существует.") from exc
    return AuthResponse(id=user.id, name=user.name)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    repository = SubmissionRepository(db)
    user = repository.get_user_by_name(payload.name)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль.")
    return AuthResponse(id=user.id, name=user.name)
