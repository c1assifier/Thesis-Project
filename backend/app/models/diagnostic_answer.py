from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DiagnosticAnswer(Base):
    __tablename__ = "diagnostic_answers"
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_user_diagnostic_question"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_tests.id"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_questions.id"), nullable=False, index=True)
    selected_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="diagnostic_answers")
    diagnostic_test: Mapped["DiagnosticTest"] = relationship("DiagnosticTest", back_populates="answers")
    question: Mapped["DiagnosticQuestion"] = relationship("DiagnosticQuestion", back_populates="answers")
