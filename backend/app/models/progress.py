from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("user_id", "topic_id", name="uq_progress_user_topic"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="in_progress")
    attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_submission_id: Mapped[int | None] = mapped_column(ForeignKey("submissions.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="progress_entries")
    topic: Mapped["Topic"] = relationship("Topic", back_populates="progress_entries")
    last_submission: Mapped["Submission"] = relationship("Submission", foreign_keys=[last_submission_id])
