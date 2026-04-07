from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    DiagnosticAnswer,
    DiagnosticQuestion,
    DiagnosticTest,
    SkillMapping,
    User,
    UserSkill,
)


class DiagnosticRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_active_test(self) -> DiagnosticTest | None:
        query = (
            select(DiagnosticTest)
            .where(DiagnosticTest.is_active.is_(True))
            .options(
                selectinload(DiagnosticTest.questions).selectinload(DiagnosticQuestion.skill_mappings),
            )
            .order_by(DiagnosticTest.id.asc())
        )
        return self.db.scalars(query).first()

    def get_test_with_questions(self, test_id: int) -> DiagnosticTest | None:
        query = (
            select(DiagnosticTest)
            .where(DiagnosticTest.id == test_id)
            .options(
                selectinload(DiagnosticTest.questions).selectinload(DiagnosticQuestion.skill_mappings),
            )
        )
        return self.db.scalar(query)

    def get_user(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def clear_user_answers_for_test(self, user_id: int, test_id: int) -> None:
        self.db.execute(
            delete(DiagnosticAnswer).where(
                DiagnosticAnswer.user_id == user_id,
                DiagnosticAnswer.test_id == test_id,
            )
        )

    def create_diagnostic_answer(
        self,
        user_id: int,
        test_id: int,
        question_id: int,
        selected_answer: str,
        is_correct: bool,
    ) -> DiagnosticAnswer:
        answer = DiagnosticAnswer(
            user_id=user_id,
            test_id=test_id,
            question_id=question_id,
            selected_answer=selected_answer,
            is_correct=is_correct,
        )
        self.db.add(answer)
        return answer

    def get_user_skill(self, user_id: int, skill_name: str) -> UserSkill | None:
        query = select(UserSkill).where(
            UserSkill.user_id == user_id,
            UserSkill.skill_name == skill_name,
        )
        return self.db.scalar(query)

    def save_user_skill(self, user_skill: UserSkill) -> UserSkill:
        self.db.add(user_skill)
        return user_skill

    def commit(self) -> None:
        self.db.commit()

    def refresh(self, instance: object) -> None:
        self.db.refresh(instance)

    def list_all_skill_mappings(self) -> list[SkillMapping]:
        return list(self.db.scalars(select(SkillMapping)))
