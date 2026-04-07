"""add password hash to users

Revision ID: 0004_user_password_hash
Revises: 0003_module_progress
Create Date: 2026-04-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_user_password_hash"
down_revision = "0003_module_progress"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.execute("UPDATE users SET password_hash = '' WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)


def downgrade() -> None:
    op.drop_column("users", "password_hash")
