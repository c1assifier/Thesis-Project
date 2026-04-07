MIN_SKILL_SCORE = 0.0
MAX_SKILL_SCORE = 1.0

CORE_SKILLS = ("variables", "conditions", "loops", "strings", "lists", "functions")


def clamp_score(value: float) -> float:
    return max(MIN_SKILL_SCORE, min(MAX_SKILL_SCORE, value))


def level_from_score(score: float) -> str:
    bounded = clamp_score(score)
    if bounded < 0.3:
        return "beginner"
    if bounded < 0.6:
        return "basic"
    if bounded < 0.8:
        return "intermediate"
    return "advanced"
