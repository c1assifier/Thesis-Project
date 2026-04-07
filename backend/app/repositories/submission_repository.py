from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Exercise, Module, ModuleProgress, Progress, Submission, Topic, User, UserSkill
from app.services.passwords import make_unusable_password_hash
from app.services.skill_utils import CORE_SKILLS, level_from_score


class SubmissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_user_by_name(self, name: str) -> User | None:
        query = select(User).where(User.name == name)
        return self.db.scalar(query)

    def create_user(self, name: str, password_hash: str | None = None) -> User:
        user = User(name=name, password_hash=password_hash or make_unusable_password_hash())
        self.db.add(user)
        self.db.flush()
        for skill_name in CORE_SKILLS:
            self.db.add(
                UserSkill(
                    user_id=user.id,
                    skill_name=skill_name,
                    diagnostic_score=0.5,
                    exercise_score=0.5,
                    skill_score=0.5,
                    skill_level=level_from_score(0.5),
                )
            )
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_submission(
        self,
        user_id: int,
        exercise_id: int,
        code: str,
        result: str,
        attempts: int,
        stdout: str,
        stderr: str,
        execution_time: float,
    ) -> Submission:
        submission = Submission(
            user_id=user_id,
            exercise_id=exercise_id,
            code=code,
            result=result,
            attempts=attempts,
            stdout=stdout,
            stderr=stderr,
            execution_time=execution_time,
        )
        self.db.add(submission)
        self.db.commit()
        self.db.refresh(submission)
        return submission

    def count_attempts(self, user_id: int, exercise_id: int) -> int:
        query = select(func.count(Submission.id)).where(Submission.user_id == user_id, Submission.exercise_id == exercise_id)
        return int(self.db.scalar(query) or 0)

    def count_failed_attempts(self, user_id: int, exercise_id: int) -> int:
        query = select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.exercise_id == exercise_id,
            Submission.result == "failed",
        )
        return int(self.db.scalar(query) or 0)

    def list_user_skill_scores(self, user_id: int) -> list[UserSkill]:
        query = select(UserSkill).where(UserSkill.user_id == user_id).order_by(UserSkill.skill_name.asc())
        return list(self.db.scalars(query))

    def get_user_skill(self, user_id: int, skill_name: str) -> UserSkill | None:
        query = select(UserSkill).where(UserSkill.user_id == user_id, UserSkill.skill_name == skill_name)
        return self.db.scalar(query)

    def save_user_skill(self, user_skill: UserSkill) -> UserSkill:
        self.db.add(user_skill)
        self.db.commit()
        self.db.refresh(user_skill)
        return user_skill

    def save_user_skill_without_commit(self, user_skill: UserSkill) -> UserSkill:
        self.db.add(user_skill)
        return user_skill

    def get_completed_exercises_count(self, user_id: int) -> int:
        query = select(func.count(func.distinct(Submission.exercise_id))).where(
            Submission.user_id == user_id,
            Submission.result == "passed",
        )
        return int(self.db.scalar(query) or 0)

    def get_total_submissions(self, user_id: int) -> int:
        query = select(func.count(Submission.id)).where(Submission.user_id == user_id)
        return int(self.db.scalar(query) or 0)

    def get_success_rate(self, user_id: int) -> float:
        total = self.get_total_submissions(user_id)
        if total == 0:
            return 0.0
        passed_query = select(func.count(Submission.id)).where(Submission.user_id == user_id, Submission.result == "passed")
        passed = int(self.db.scalar(passed_query) or 0)
        return passed / total

    def list_passed_exercise_ids(self, user_id: int) -> list[int]:
        query = select(Submission.exercise_id).where(Submission.user_id == user_id, Submission.result == "passed")
        return list(dict.fromkeys(self.db.scalars(query)))

    def get_progress_entry(self, user_id: int, topic_id: int) -> Progress | None:
        query = select(Progress).where(Progress.user_id == user_id, Progress.topic_id == topic_id)
        return self.db.scalar(query)

    def save_progress_entry(self, progress_entry: Progress) -> Progress:
        progress_entry.updated_at = datetime.utcnow()
        self.db.add(progress_entry)
        self.db.commit()
        self.db.refresh(progress_entry)
        return progress_entry

    def update_progress_entry(
        self,
        user_id: int,
        topic_id: int,
        status: str,
        attempts_count: int,
        last_submission_id: int,
    ) -> Progress:
        progress_entry = self.get_progress_entry(user_id, topic_id)
        if progress_entry is None:
            progress_entry = Progress(
                user_id=user_id,
                topic_id=topic_id,
                status=status,
                attempts_count=attempts_count,
                last_submission_id=last_submission_id,
            )
        else:
            progress_entry.status = status
            progress_entry.attempts_count = attempts_count
            progress_entry.last_submission_id = last_submission_id

        return self.save_progress_entry(progress_entry)

    def list_progress_entries(self, user_id: int) -> list[Progress]:
        query = (
            select(Progress)
            .where(Progress.user_id == user_id)
            .order_by(Progress.updated_at.desc(), Progress.id.desc())
        )
        return list(self.db.scalars(query))

    def count_completed_topics(self, user_id: int) -> int:
        query = select(func.count(Progress.id)).where(Progress.user_id == user_id, Progress.status == "completed")
        return int(self.db.scalar(query) or 0)

    def count_topics(self) -> int:
        return int(self.db.scalar(select(func.count(Topic.id))) or 0)

    def list_completed_module_ids(self, user_id: int) -> list[int]:
        query = (
            select(ModuleProgress.module_id)
            .where(ModuleProgress.user_id == user_id, ModuleProgress.status == "completed")
            .order_by(ModuleProgress.module_id.asc())
        )
        return list(self.db.scalars(query))

    def count_completed_modules(self, user_id: int) -> int:
        query = select(func.count(ModuleProgress.id)).where(
            ModuleProgress.user_id == user_id,
            ModuleProgress.status == "completed",
        )
        return int(self.db.scalar(query) or 0)

    def get_module_progress_for_user(self, user_id: int) -> list[ModuleProgress]:
        query = select(ModuleProgress).where(ModuleProgress.user_id == user_id)
        return list(self.db.scalars(query))

    def get_module_progress_entry(self, user_id: int, module_id: int) -> ModuleProgress | None:
        query = select(ModuleProgress).where(
            ModuleProgress.user_id == user_id,
            ModuleProgress.module_id == module_id,
        )
        return self.db.scalar(query)

    def get_recent_submissions_with_exercise_title(self, user_id: int, limit: int = 5) -> list[tuple[Submission, str]]:
        query = (
            select(Submission, Exercise.title)
            .join(Exercise, Submission.exercise_id == Exercise.id)
            .where(Submission.user_id == user_id, Submission.result == "passed")
            .order_by(Submission.created_at.desc())
            .limit(limit)
        )
        rows = self.db.execute(query).all()
        return [(row[0], row[1]) for row in rows]

    def count_modules(self) -> int:
        query = select(func.count(Module.id))
        return int(self.db.scalar(query) or 0)

    def complete_module(self, user_id: int, module_id: int) -> ModuleProgress:
        query = select(ModuleProgress).where(
            ModuleProgress.user_id == user_id,
            ModuleProgress.module_id == module_id,
        )
        module_progress = self.db.scalar(query)
        if module_progress is None:
            module_progress = ModuleProgress(user_id=user_id, module_id=module_id, status="completed", attempts_count=0)
        else:
            module_progress.status = "completed"
            module_progress.attempts_count = 0
            module_progress.completed_at = datetime.utcnow()

        self.db.add(module_progress)
        self.db.commit()
        self.db.refresh(module_progress)
        return module_progress

    def set_intro_completed(self, user_id: int, value: bool = True) -> User | None:
        user = self.get_user(user_id)
        if user is None:
            return None
        user.intro_completed = value
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def set_diagnostic_completed(self, user_id: int, value: bool = True) -> User | None:
        user = self.get_user(user_id)
        if user is None:
            return None
        user.diagnostic_completed = value
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
