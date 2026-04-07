from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories.exercise_repository import ExerciseRepository


class ExplainService:
    def __init__(self, db: Session):
        self.repository = ExerciseRepository(db)

    def explain_topic(self, topic_id: int, level: int) -> str:
        topic = self.repository.get_topic_with_theory(topic_id)
        if topic is None:
            raise HTTPException(status_code=404, detail="Тема не найдена.")

        blocks = sorted(topic.theory_blocks, key=lambda item: item.order_index)
        if not blocks:
            return "Для темы пока не добавлена теория. Начните с практики и вернитесь к объяснению позже."

        if level <= 2:
            chunks: list[str] = []
            for block in blocks:
                if block.simplified_content.strip():
                    chunks.append(block.simplified_content.strip())
                else:
                    sentence = block.content.strip().split(".")[0].strip()
                    chunks.append(f"{sentence}.")
            return "\n\n".join(chunks).strip()

        # Level 3 ("как ребёнку"): короткий сценарий из шагов и метафора.
        first_block = blocks[0]
        anchor = first_block.simplified_content.strip() or first_block.content.strip().split(".")[0].strip()
        return (
            f"Представь, что программа — это инструкция для робота.\n"
            f"1. Сначала робот читает правило: {anchor}.\n"
            "2. Потом он выполняет шаги по очереди, не пропуская команды.\n"
            "3. В конце сравни результат с ожидаемым и исправь один шаг, если ответ не совпал."
        )
