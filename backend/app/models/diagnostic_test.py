from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DiagnosticTest(Base):
    __tablename__ = "diagnostic_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    test_type: Mapped[str] = mapped_column(String(20), nullable=False, default="entry")
    module_id: Mapped[int | None] = mapped_column(ForeignKey("modules.id"), nullable=True, index=True)

    questions: Mapped[list["DiagnosticQuestion"]] = relationship(
        "DiagnosticQuestion",
        back_populates="diagnostic_test",
        cascade="all, delete-orphan",
    )
    answers: Mapped[list["DiagnosticAnswer"]] = relationship(
        "DiagnosticAnswer",
        back_populates="diagnostic_test",
        cascade="all, delete-orphan",
    )
    module: Mapped["Module | None"] = relationship("Module")
