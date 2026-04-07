"""add attempts counter to module progress

Revision ID: 0006_mod_progress_attempts
Revises: 0005_diag_test_type
Create Date: 2026-04-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_mod_progress_attempts"
down_revision = "0005_diag_test_type"
branch_labels = None
depends_on = None


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not _has_column(inspector, "module_progress", "attempts_count"):
        op.add_column("module_progress", sa.Column("attempts_count", sa.Integer(), nullable=True))
        op.execute("UPDATE module_progress SET attempts_count = 0 WHERE attempts_count IS NULL")
        op.alter_column("module_progress", "attempts_count", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _has_column(inspector, "module_progress", "attempts_count"):
        op.drop_column("module_progress", "attempts_count")
