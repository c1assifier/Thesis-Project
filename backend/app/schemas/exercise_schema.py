from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ExerciseSummaryRead(BaseModel):
    id: int
    topic_id: int
    title: str
    description: str
    starter_code: str
    difficulty: str
    skill_name: str
    order_index: int
    topic_title: str
    theory_titles: list[str]


class HintRequest(BaseModel):
    user_id: int
    exercise_id: int
    error_message: str = ""


class HintResponse(BaseModel):
    hint: str
    llm_used: bool


class RecommendationRequest(BaseModel):
    user_id: int
    skill: str


class RecommendationResponse(BaseModel):
    module_id: int | None
    title: str | None
    difficulty: str | None
    reason: str
    next_exercise_id: int | None = None


class ExplainRequest(BaseModel):
    topic_id: int
    level: int


class ExplainResponse(BaseModel):
    text: str
    source: str
    level: int


class UserSkillRead(BaseModel):
    id: int
    user_id: int
    skill_name: str
    diagnostic_score: float
    exercise_score: float
    skill_score: float
    skill_level: str
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)
