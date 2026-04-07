from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    goals: Mapped[str] = mapped_column(Text, nullable=False, default="")
    adaptive_overview: Mapped[str] = mapped_column(Text, nullable=False, default="")

    modules: Mapped[list["Module"]] = relationship("Module", back_populates="course", cascade="all, delete-orphan")

