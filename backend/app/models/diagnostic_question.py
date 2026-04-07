from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DiagnosticQuestion(Base):
    __tablename__ = "diagnostic_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_tests.id"), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)
    code_snippet: Mapped[str] = mapped_column(Text, nullable=False, default="")
    options: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    diagnostic_test: Mapped["DiagnosticTest"] = relationship("DiagnosticTest", back_populates="questions")
    answers: Mapped[list["DiagnosticAnswer"]] = relationship(
        "DiagnosticAnswer",
        back_populates="question",
        cascade="all, delete-orphan",
    )
    skill_mappings: Mapped[list["SkillMapping"]] = relationship(
        "SkillMapping",
        back_populates="question",
        cascade="all, delete-orphan",
    )
