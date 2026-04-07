from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="topics")
    theory_blocks: Mapped[list["TheoryBlock"]] = relationship("TheoryBlock", back_populates="topic", cascade="all, delete-orphan")
    exercises: Mapped[list["Exercise"]] = relationship("Exercise", back_populates="topic", cascade="all, delete-orphan")
    progress_entries: Mapped[list["Progress"]] = relationship("Progress", back_populates="topic", cascade="all, delete-orphan")
