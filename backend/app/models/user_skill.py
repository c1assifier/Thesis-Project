from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserSkill(Base):
    __tablename__ = "user_skills"
    __table_args__ = (UniqueConstraint("user_id", "skill_name", name="uq_user_skill_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False)
    diagnostic_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    exercise_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    skill_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    skill_level: Mapped[str] = mapped_column(String(32), nullable=False, default="basic")
    last_updated: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="skills")
