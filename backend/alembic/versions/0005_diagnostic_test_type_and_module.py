"""add diagnostic test type and module link

Revision ID: 0005_diag_test_type
Revises: 0004_user_password_hash

Create Date: 2026-04-05 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_diag_test_type"
down_revision = "0004_user_password_hash"
branch_labels = None
depends_on = None


def _has_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _has_column(inspector, "diagnostic_tests", "test_type"):
        op.add_column("diagnostic_tests", sa.Column("test_type", sa.String(length=20), nullable=True))
        op.execute("UPDATE diagnostic_tests SET test_type = 'entry' WHERE test_type IS NULL")
        op.alter_column("diagnostic_tests", "test_type", existing_type=sa.String(length=20), nullable=False)

    if not _has_column(inspector, "diagnostic_tests", "module_id"):
        op.add_column("diagnostic_tests", sa.Column("module_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_diagnostic_tests_module_id_modules",
            "diagnostic_tests",
            "modules",
            ["module_id"],
            ["id"],
        )
        op.create_index("ix_diagnostic_tests_module_id", "diagnostic_tests", ["module_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _has_column(inspector, "diagnostic_tests", "module_id"):
        indexes = {index["name"] for index in inspector.get_indexes("diagnostic_tests")}
        if "ix_diagnostic_tests_module_id" in indexes:
            op.drop_index("ix_diagnostic_tests_module_id", table_name="diagnostic_tests")
        fks = {fk["name"] for fk in inspector.get_foreign_keys("diagnostic_tests")}
        if "fk_diagnostic_tests_module_id_modules" in fks:
            op.drop_constraint("fk_diagnostic_tests_module_id_modules", "diagnostic_tests", type_="foreignkey")
        op.drop_column("diagnostic_tests", "module_id")

    if _has_column(inspector, "diagnostic_tests", "test_type"):
        op.drop_column("diagnostic_tests", "test_type")
