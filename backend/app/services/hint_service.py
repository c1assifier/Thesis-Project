from dataclasses import dataclass

import requests

from app.core.config import settings


@dataclass
class HintResult:
    hint: str
    llm_used: bool


def _rule_based_hint(error_message: str, exercise_description: str) -> str:
    error_lower = error_message.lower()
    if "assert" in error_lower:
        return "Сравните ожидаемый результат теста с фактическим значением функции и проверьте граничные случаи."
    if "syntax" in error_lower:
        return "Проверьте синтаксис: двоеточия, скобки и отступы часто становятся причиной такой ошибки."
    if "nameerror" in error_lower:
        return "Убедитесь, что имя функции и переменных совпадает с условием задания."
    if "typeerror" in error_lower:
        return "Сверьте типы аргументов и возвращаемого значения с тем, что требует упражнение."
    return f"Вернитесь к описанию задания и выделите ключевое требование: {exercise_description[:160]}"


class HintService:
    def generate_hint(self, error_message: str, exercise_description: str) -> HintResult:
        if not settings.llm_enabled or settings.llm_provider != "ollama":
            return HintResult(_rule_based_hint(error_message, exercise_description), False)

        prompt = (
            "Ты преподаватель Python. Дай одну краткую подсказку на русском языке без полного решения.\n"
            f"Задание: {exercise_description}\n"
            f"Ошибка: {error_message}\n"
        )
        try:
            response = requests.post(
                f"{settings.ollama_url}/api/generate",
                json={"model": settings.ollama_model, "prompt": prompt, "stream": False},
                timeout=10,
            )
            response.raise_for_status()
            payload = response.json()
            hint = payload.get("response", "").strip()
            if hint:
                return HintResult(hint, True)
        except requests.RequestException:
            pass

        return HintResult(_rule_based_hint(error_message, exercise_description), False)

