from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    starter_code: Mapped[str] = mapped_column(Text, nullable=False)
    solution: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    topic: Mapped["Topic"] = relationship("Topic", back_populates="exercises")
    test_cases: Mapped[list["TestCase"]] = relationship("TestCase", back_populates="exercise", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="exercise", cascade="all, delete-orphan")

