from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    intro_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    diagnostic_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    skills: Mapped[list["UserSkill"]] = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    progress_entries: Mapped[list["Progress"]] = relationship("Progress", back_populates="user", cascade="all, delete-orphan")
    module_progress_entries: Mapped[list["ModuleProgress"]] = relationship(
        "ModuleProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    diagnostic_answers: Mapped[list["DiagnosticAnswer"]] = relationship(
        "DiagnosticAnswer",
        back_populates="user",
        cascade="all, delete-orphan",
    )
