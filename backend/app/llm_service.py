from app.services.hint_service import HintResult, HintService


def generate_hint(error_message: str, exercise_description: str) -> HintResult:
    return HintService().generate_hint(error_message, exercise_description)


__all__ = ["HintResult", "HintService", "generate_hint"]
