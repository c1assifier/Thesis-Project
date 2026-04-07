from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.repositories.course_repository import CourseRepository
from app.repositories.submission_repository import SubmissionRepository
from app.schemas.portal_schema import (
    PortalActivityRead,
    PortalBootstrapRead,
    PortalChecklistItemRead,
    PortalCourseModuleRead,
    PortalCourseStructureRead,
    PortalDashboardRead,
    PortalDashboardStatsRead,
    PortalDiagnosticGateRead,
    PortalModuleDetailsRead,
    PortalProfileRead,
    PortalRecommendationRead,
)

_STATUS_BADGE = {
    "completed": "Завершено",
    "in_progress": "В процессе",
    "available": "Доступно",
    "locked": "Заблокировано",
    "not_started": "Не начато",
}

_LEVEL_LABELS = {
    "beginner": "Начинающий",
    "basic": "Базовый",
    "intermediate": "Средний",
    "advanced": "Продвинутый",
}


class PortalService:
    def __init__(self, db: Session):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.sub_repo = SubmissionRepository(db)

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def get_bootstrap(self, user_id: int) -> PortalBootstrapRead:
        user = self.sub_repo.get_user(user_id)
        student_name = user.name if user else "Студент"

        portal_modules = self._build_portal_modules(user_id)
        completed_count = self.sub_repo.count_completed_modules(user_id)
        total_modules = self.sub_repo.count_modules()
        solved_tasks = self.sub_repo.get_completed_exercises_count(user_id)
        total_tasks = self._count_total_exercises()
        accuracy = self.sub_repo.get_success_rate(user_id)
        progress_pct = round(completed_count / total_modules * 100) if total_modules else 0

        skill_scores = self.sub_repo.list_user_skill_scores(user_id)
        top_skill = max(skill_scores, key=lambda s: s.skill_score, default=None)
        level_label = _LEVEL_LABELS.get(top_skill.skill_level, "Начинающий") if top_skill else "Начинающий"
        points = round(sum(s.skill_score for s in skill_scores) / max(len(skill_scores), 1) * 1000)

        activity = self._build_activity(user_id)
        recommendations = self._build_recommendations(portal_modules)

        locked_module_titles = [m.title for m in portal_modules if m.status == "locked"][:4]

        return PortalBootstrapRead(
            app_title="Адаптивное обучение Python",
            dashboard=PortalDashboardRead(
                title="Интеллектуальная система адаптивного обучения Python",
                subtitle="Персонализированный образовательный маршрут",
                student_label=student_name,
                profile=PortalProfileRead(level=level_label, points=points),
                activity=activity,
                stats=PortalDashboardStatsRead(
                    progress_percent=progress_pct,
                    completed_modules=completed_count,
                    total_modules=total_modules,
                    solved_tasks=solved_tasks,
                    total_tasks=total_tasks,
                    accuracy_percent=round(accuracy * 100),
                ),
                recommendations=recommendations,
            ),
            diagnostic_gate=PortalDiagnosticGateRead(
                title="Пройдите диагностику по курсу",
                description=(
                    "Перед началом обучения необходимо пройти диагностику по курсу, "
                    "чтобы определить текущий уровень по основным темам Python. "
                    "Это займет около 20 минут."
                ),
                note="Система адаптирует курс на основе результатов диагностики и предложит оптимальный образовательный путь.",
                action_label="Пройти диагностику",
                locked_modules=locked_module_titles,
            ),
            course_structure=PortalCourseStructureRead(
                title="Курс: Python для начинающих",
                module_count_label=f"{total_modules} модулей",
                modules=portal_modules,
            ),
        )

    def get_module_details(self, portal_module_id: int, user_id: int) -> PortalModuleDetailsRead | None:
        courses = self.course_repo.list_courses()
        if not courses:
            return None
        modules = self.course_repo.list_modules(courses[0].id)
        module_index = portal_module_id - 1
        if module_index < 0 or module_index >= len(modules):
            return None

        db_module = modules[module_index]
        lessons = self.course_repo.list_lessons(db_module.id)
        first_lesson_id = lessons[0].id if lessons else None

        mp = self.sub_repo.get_module_progress_entry(user_id, db_module.id)
        status = mp.status if mp else "not_started"
        completed_lessons = self._count_completed_lessons_in_module(user_id, db_module.id)
        total_lessons = len(lessons)
        progress_pct = round(completed_lessons / total_lessons * 100) if total_lessons else 0

        theory_items, practice_items = self._build_checklist_items(user_id, db_module.id)

        badge = _STATUS_BADGE.get(status, status)
        _ACTION_LABELS = {
            "completed": "Повторить модуль",
            "in_progress": "Продолжить урок",
            "available": "Начать модуль",
            "not_started": "Начать модуль",
            "locked": "Модуль заблокирован",
        }
        action_label = _ACTION_LABELS.get(status, "Перейти к модулю")

        skill_scores = self.sub_repo.list_user_skill_scores(user_id)
        avg_score = sum(s.skill_score for s in skill_scores) / max(len(skill_scores), 1)
        adaptive_desc = f"Сложность: {_LEVEL_LABELS.get(self._level_from_score(avg_score), 'Базовый')} (адаптирована под ваш уровень)"

        return PortalModuleDetailsRead(
            id=portal_module_id,
            linked_course_id=courses[0].id,
            linked_module_id=db_module.id,
            linked_lesson_id=first_lesson_id,
            title=db_module.title,
            status=status,
            badge=badge,
            progress_percent=progress_pct,
            progress_label=f"{completed_lessons}/{total_lessons} уроков • {progress_pct}%",
            adaptive_label="Адаптивный режим",
            adaptive_description=adaptive_desc,
            theory_items=theory_items,
            practice_items=practice_items,
            action_label=action_label,
        )

    # ------------------------------------------------------------------ #
    #  Private helpers                                                     #
    # ------------------------------------------------------------------ #

    def _build_portal_modules(self, user_id: int) -> list[PortalCourseModuleRead]:
        courses = self.course_repo.list_courses()
        if not courses:
            return []
        modules = self.course_repo.list_modules(courses[0].id)
        completed_ids = set(self.sub_repo.list_completed_module_ids(user_id))
        in_progress_ids = self._get_in_progress_module_ids(user_id)
        result = []
        unlocked = True
        for idx, mod in enumerate(modules):
            portal_id = idx + 1
            lessons = self.course_repo.list_lessons(mod.id)
            first_lesson_id = lessons[0].id if lessons else None
            total = len(lessons)
            completed_lessons = self._count_completed_lessons_in_module(user_id, mod.id)
            pct = round(completed_lessons / total * 100) if total else 0

            if mod.id in completed_ids:
                status = "completed"
            elif mod.id in in_progress_ids:
                status = "in_progress"
            elif unlocked:
                status = "available"
            else:
                status = "locked"

            if mod.id not in completed_ids and mod.id not in in_progress_ids:
                unlocked = False

            result.append(PortalCourseModuleRead(
                id=portal_id,
                linked_course_id=courses[0].id,
                linked_module_id=mod.id,
                linked_lesson_id=first_lesson_id,
                title=mod.title,
                status=status,
                progress_percent=pct,
                progress_label=f"{completed_lessons}/{total} уроков • {pct}%",
                badge=_STATUS_BADGE.get(status, status),
            ))
        return result

    def _get_in_progress_module_ids(self, user_id: int) -> set[int]:
        all_mp = self.sub_repo.get_module_progress_for_user(user_id)
        return {mp.module_id for mp in all_mp if mp.status == "in_progress"}

    def _get_topic_ids(self, lesson_id: int) -> list[int]:
        from app.models import Topic
        return list(self.db.scalars(select(Topic.id).where(Topic.lesson_id == lesson_id)))

    def _count_completed_lessons_in_module(self, user_id: int, module_id: int) -> int:
        from app.models import Progress
        lessons = self.course_repo.list_lessons(module_id)
        completed = 0
        for lesson in lessons:
            topic_ids = self._get_topic_ids(lesson.id)
            if not topic_ids:
                continue
            done_count = self.db.scalar(
                select(func.count()).select_from(Progress).where(
                    Progress.user_id == user_id,
                    Progress.topic_id.in_(topic_ids),
                    Progress.status == "completed",
                )
            ) or 0
            if done_count >= len(topic_ids):
                completed += 1
        return completed

    def _build_checklist_items(
        self, user_id: int, module_id: int
    ) -> tuple[list[PortalChecklistItemRead], list[PortalChecklistItemRead]]:
        from app.models import Exercise, Progress, Topic
        lessons = self.course_repo.list_lessons(module_id)
        theory_items: list[PortalChecklistItemRead] = []
        practice_items: list[PortalChecklistItemRead] = []
        passed_ex_ids = set(self.sub_repo.list_passed_exercise_ids(user_id))

        for lesson in lessons:
            topic_ids = self._get_topic_ids(lesson.id)
            if not topic_ids:
                continue
            done_topics = self.db.scalar(
                select(func.count()).select_from(Progress).where(
                    Progress.user_id == user_id,
                    Progress.topic_id.in_(topic_ids),
                    Progress.status == "completed",
                )
            ) or 0
            theory_items.append(PortalChecklistItemRead(
                title=lesson.title,
                completed=done_topics >= len(topic_ids),
                linked_lesson_id=lesson.id,
            ))
            ex_rows = self.db.execute(
                select(Exercise.id, Exercise.title)
                .join(Topic, Exercise.topic_id == Topic.id)
                .where(Topic.lesson_id == lesson.id)
            ).all()
            for ex_id, ex_title in ex_rows:
                practice_items.append(PortalChecklistItemRead(
                    title=ex_title or f"Задача #{ex_id}",
                    completed=ex_id in passed_ex_ids,
                    linked_lesson_id=lesson.id,
                ))

        return theory_items, practice_items

    def _build_activity(self, user_id: int) -> list[PortalActivityRead]:
        rows = self.sub_repo.get_recent_submissions_with_exercise_title(user_id, limit=5)
        if not rows:
            return [PortalActivityRead(label="Пока нет активности. Начните первый урок!")]
        return [PortalActivityRead(label=f'Решена задача: "{ex_title}"') for _, ex_title in rows]

    def _build_recommendations(self, portal_modules: list[PortalCourseModuleRead]) -> list[PortalRecommendationRead]:
        recs: list[PortalRecommendationRead] = []
        for mod in portal_modules:
            if mod.status == "in_progress":
                recs.append(PortalRecommendationRead(
                    title=f"Продолжите: {mod.title}",
                    description=f"Прогресс: {mod.progress_percent}%. Вернитесь к прерванному модулю.",
                ))
            elif mod.status == "available" and len(recs) < 2:
                recs.append(PortalRecommendationRead(
                    title=f"Следующий модуль: {mod.title}",
                    description="На основе вашего прогресса подготовлены задачи.",
                ))
            if len(recs) >= 2:
                break
        if not recs:
            recs.append(PortalRecommendationRead(
                title="Начните с первого модуля",
                description="Пройдите диагностику и начните адаптивное обучение.",
            ))
        return recs

    def _count_total_exercises(self) -> int:
        from app.models import Exercise
        return int(self.db.scalar(select(func.count()).select_from(Exercise)) or 0)

    @staticmethod
    def _level_from_score(score: float) -> str:
        if score < 0.3:
            return "beginner"
        if score < 0.6:
            return "basic"
        if score < 0.8:
            return "intermediate"
        return "advanced"
