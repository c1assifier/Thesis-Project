"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("goals", sa.Text(), nullable=False, server_default=""),
        sa.Column("adaptive_overview", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_courses_id", "courses", ["id"])

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_users_id", "users", ["id"])

    op.create_table(
        "modules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("difficulty", sa.String(length=50), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
    )
    op.create_index("ix_modules_id", "modules", ["id"])
    op.create_index("ix_modules_course_id", "modules", ["course_id"])

    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"]),
    )
    op.create_index("ix_lessons_id", "lessons", ["id"])
    op.create_index("ix_lessons_module_id", "lessons", ["module_id"])

    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("difficulty", sa.String(length=50), nullable=False),
        sa.Column("skill_name", sa.String(length=100), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"]),
    )
    op.create_index("ix_topics_id", "topics", ["id"])
    op.create_index("ix_topics_lesson_id", "topics", ["lesson_id"])
    op.create_index("ix_topics_skill_name", "topics", ["skill_name"])

    op.create_table(
        "theory_blocks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.String(length=50), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
    )
    op.create_index("ix_theory_blocks_id", "theory_blocks", ["id"])
    op.create_index("ix_theory_blocks_topic_id", "theory_blocks", ["topic_id"])

    op.create_table(
        "exercises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("starter_code", sa.Text(), nullable=False),
        sa.Column("solution", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.String(length=50), nullable=False),
        sa.Column("skill_name", sa.String(length=100), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
    )
    op.create_index("ix_exercises_id", "exercises", ["id"])
    op.create_index("ix_exercises_topic_id", "exercises", ["topic_id"])
    op.create_index("ix_exercises_skill_name", "exercises", ["skill_name"])

    op.create_table(
        "test_cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("input_data", sa.Text(), nullable=False, server_default=""),
        sa.Column("expected_output", sa.Text(), nullable=False, server_default=""),
        sa.Column("assertion_code", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
    )
    op.create_index("ix_test_cases_id", "test_cases", ["id"])
    op.create_index("ix_test_cases_exercise_id", "test_cases", ["exercise_id"])

    op.create_table(
        "user_skills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("skill_name", sa.String(length=100), nullable=False),
        sa.Column("skill_score", sa.Float(), nullable=False, server_default="0.5"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("user_id", "skill_name", name="uq_user_skill_name"),
    )
    op.create_index("ix_user_skills_id", "user_skills", ["id"])
    op.create_index("ix_user_skills_user_id", "user_skills", ["user_id"])

    op.create_table(
        "submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("exercise_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("result", sa.String(length=50), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("stdout", sa.Text(), nullable=False, server_default=""),
        sa.Column("stderr", sa.Text(), nullable=False, server_default=""),
        sa.Column("execution_time", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["exercise_id"], ["exercises.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_submissions_id", "submissions", ["id"])
    op.create_index("ix_submissions_user_id", "submissions", ["user_id"])
    op.create_index("ix_submissions_exercise_id", "submissions", ["exercise_id"])


def downgrade() -> None:
    op.drop_index("ix_submissions_exercise_id", table_name="submissions")
    op.drop_index("ix_submissions_user_id", table_name="submissions")
    op.drop_index("ix_submissions_id", table_name="submissions")
    op.drop_table("submissions")
    op.drop_index("ix_user_skills_user_id", table_name="user_skills")
    op.drop_index("ix_user_skills_id", table_name="user_skills")
    op.drop_table("user_skills")
    op.drop_index("ix_test_cases_exercise_id", table_name="test_cases")
    op.drop_index("ix_test_cases_id", table_name="test_cases")
    op.drop_table("test_cases")
    op.drop_index("ix_exercises_skill_name", table_name="exercises")
    op.drop_index("ix_exercises_topic_id", table_name="exercises")
    op.drop_index("ix_exercises_id", table_name="exercises")
    op.drop_table("exercises")
    op.drop_index("ix_theory_blocks_topic_id", table_name="theory_blocks")
    op.drop_index("ix_theory_blocks_id", table_name="theory_blocks")
    op.drop_table("theory_blocks")
    op.drop_index("ix_topics_skill_name", table_name="topics")
    op.drop_index("ix_topics_lesson_id", table_name="topics")
    op.drop_index("ix_topics_id", table_name="topics")
    op.drop_table("topics")
    op.drop_index("ix_lessons_module_id", table_name="lessons")
    op.drop_index("ix_lessons_id", table_name="lessons")
    op.drop_table("lessons")
    op.drop_index("ix_modules_course_id", table_name="modules")
    op.drop_index("ix_modules_id", table_name="modules")
    op.drop_table("modules")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_courses_id", table_name="courses")
    op.drop_table("courses")

