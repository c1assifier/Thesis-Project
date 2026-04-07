from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ModuleProgress(Base):
    __tablename__ = "module_progress"
    __table_args__ = (UniqueConstraint("user_id", "module_id", name="uq_module_progress_user_module"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="completed")
    attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="module_progress_entries")
    module: Mapped["Module"] = relationship("Module", back_populates="module_progress_entries")
