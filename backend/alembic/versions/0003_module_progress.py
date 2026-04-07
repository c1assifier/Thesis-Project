"""module progress tracking

Revision ID: 0003_module_progress
Revises: 0002_diagnostic_and_progress
Create Date: 2026-03-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_module_progress"
down_revision = "0002_diagnostic_and_progress"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "module_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="completed"),
        sa.Column("completed_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"]),
        sa.UniqueConstraint("user_id", "module_id", name="uq_module_progress_user_module"),
    )
    op.create_index("ix_module_progress_id", "module_progress", ["id"])
    op.create_index("ix_module_progress_user_id", "module_progress", ["user_id"])
    op.create_index("ix_module_progress_module_id", "module_progress", ["module_id"])


def downgrade() -> None:
    op.drop_index("ix_module_progress_module_id", table_name="module_progress")
    op.drop_index("ix_module_progress_user_id", table_name="module_progress")
    op.drop_index("ix_module_progress_id", table_name="module_progress")
    op.drop_table("module_progress")
