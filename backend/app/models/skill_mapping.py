from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SkillMapping(Base):
    __tablename__ = "skill_mapping"
    __table_args__ = (UniqueConstraint("question_id", "skill_name", name="uq_question_skill_mapping"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_questions.id"), nullable=False, index=True)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    question: Mapped["DiagnosticQuestion"] = relationship("DiagnosticQuestion", back_populates="skill_mappings")
