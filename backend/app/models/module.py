from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    lessons: Mapped[list["Lesson"]] = relationship("Lesson", back_populates="module", cascade="all, delete-orphan")
    module_progress_entries: Mapped[list["ModuleProgress"]] = relationship(
        "ModuleProgress",
        back_populates="module",
        cascade="all, delete-orphan",
    )
