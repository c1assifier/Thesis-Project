"""diagnostic and adaptive progression

Revision ID: 0002_diagnostic_and_progress
Revises: 0001_initial_schema
Create Date: 2026-03-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_diagnostic_and_progress"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("intro_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("diagnostic_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))

    op.add_column("user_skills", sa.Column("diagnostic_score", sa.Float(), nullable=False, server_default="0.5"))
    op.add_column("user_skills", sa.Column("exercise_score", sa.Float(), nullable=False, server_default="0.5"))
    op.add_column("user_skills", sa.Column("skill_level", sa.String(length=32), nullable=False, server_default="basic"))
    op.add_column("user_skills", sa.Column("last_updated", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))

    op.add_column("theory_blocks", sa.Column("block_type", sa.String(length=32), nullable=False, server_default="text"))
    op.add_column("theory_blocks", sa.Column("simplified_content", sa.Text(), nullable=False, server_default=""))

    op.create_table(
        "diagnostic_tests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_diagnostic_tests_id", "diagnostic_tests", ["id"])

    op.create_table(
        "diagnostic_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("test_id", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=50), nullable=False),
        sa.Column("code_snippet", sa.Text(), nullable=False, server_default=""),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_answer", sa.String(length=255), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["test_id"], ["diagnostic_tests.id"]),
    )
    op.create_index("ix_diagnostic_questions_id", "diagnostic_questions", ["id"])
    op.create_index("ix_diagnostic_questions_test_id", "diagnostic_questions", ["test_id"])

    op.create_table(
        "skill_mapping",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("skill_name", sa.String(length=100), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["question_id"], ["diagnostic_questions.id"]),
        sa.UniqueConstraint("question_id", "skill_name", name="uq_question_skill_mapping"),
    )
    op.create_index("ix_skill_mapping_id", "skill_mapping", ["id"])
    op.create_index("ix_skill_mapping_question_id", "skill_mapping", ["question_id"])
    op.create_index("ix_skill_mapping_skill_name", "skill_mapping", ["skill_name"])

    op.create_table(
        "diagnostic_answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("test_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("selected_answer", sa.String(length=255), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["test_id"], ["diagnostic_tests.id"]),
        sa.ForeignKeyConstraint(["question_id"], ["diagnostic_questions.id"]),
        sa.UniqueConstraint("user_id", "question_id", name="uq_user_diagnostic_question"),
    )
    op.create_index("ix_diagnostic_answers_id", "diagnostic_answers", ["id"])
    op.create_index("ix_diagnostic_answers_user_id", "diagnostic_answers", ["user_id"])
    op.create_index("ix_diagnostic_answers_test_id", "diagnostic_answers", ["test_id"])
    op.create_index("ix_diagnostic_answers_question_id", "diagnostic_answers", ["question_id"])

    op.create_table(
        "progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="in_progress"),
        sa.Column("attempts_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_submission_id", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
        sa.ForeignKeyConstraint(["last_submission_id"], ["submissions.id"]),
        sa.UniqueConstraint("user_id", "topic_id", name="uq_progress_user_topic"),
    )
    op.create_index("ix_progress_id", "progress", ["id"])
    op.create_index("ix_progress_user_id", "progress", ["user_id"])
    op.create_index("ix_progress_topic_id", "progress", ["topic_id"])


def downgrade() -> None:
    op.drop_index("ix_progress_topic_id", table_name="progress")
    op.drop_index("ix_progress_user_id", table_name="progress")
    op.drop_index("ix_progress_id", table_name="progress")
    op.drop_table("progress")

    op.drop_index("ix_diagnostic_answers_question_id", table_name="diagnostic_answers")
    op.drop_index("ix_diagnostic_answers_test_id", table_name="diagnostic_answers")
    op.drop_index("ix_diagnostic_answers_user_id", table_name="diagnostic_answers")
    op.drop_index("ix_diagnostic_answers_id", table_name="diagnostic_answers")
    op.drop_table("diagnostic_answers")

    op.drop_index("ix_skill_mapping_skill_name", table_name="skill_mapping")
    op.drop_index("ix_skill_mapping_question_id", table_name="skill_mapping")
    op.drop_index("ix_skill_mapping_id", table_name="skill_mapping")
    op.drop_table("skill_mapping")

    op.drop_index("ix_diagnostic_questions_test_id", table_name="diagnostic_questions")
    op.drop_index("ix_diagnostic_questions_id", table_name="diagnostic_questions")
    op.drop_table("diagnostic_questions")

    op.drop_index("ix_diagnostic_tests_id", table_name="diagnostic_tests")
    op.drop_table("diagnostic_tests")

    op.drop_column("theory_blocks", "simplified_content")
    op.drop_column("theory_blocks", "block_type")

    op.drop_column("user_skills", "last_updated")
    op.drop_column("user_skills", "skill_level")
    op.drop_column("user_skills", "exercise_score")
    op.drop_column("user_skills", "diagnostic_score")

    op.drop_column("users", "created_at")
    op.drop_column("users", "diagnostic_completed")
    op.drop_column("users", "intro_completed")
