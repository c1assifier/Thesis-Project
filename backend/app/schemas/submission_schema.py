from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.exercise_schema import UserSkillRead


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class UserRead(BaseModel):
    id: int
    name: str
    intro_completed: bool
    diagnostic_completed: bool

    model_config = ConfigDict(from_attributes=True)


class SubmissionCreate(BaseModel):
    user_id: int
    exercise_id: int
    code: str


class SubmissionRead(BaseModel):
    id: int
    user_id: int
    exercise_id: int
    code: str
    result: str
    attempts: int
    stdout: str
    stderr: str
    execution_time: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionResponse(BaseModel):
    submission: SubmissionRead
    stdout: str
    stderr: str
    passed: bool
    feedback: str
    execution_time: float
    recommendation: str | None = None
    next_exercise_id: int | None = None
    skill_scores: list[UserSkillRead] = Field(default_factory=list)


class ProgressResponse(BaseModel):
    user_id: int
    completed_exercises: int
    total_submissions: int
    success_rate: float
    completed_modules: int
    total_modules: int
    completed_module_ids: list[int]
    completed_topics: int
    total_topics: int
    intro_completed: bool
    diagnostic_completed: bool
    skill_scores: list[UserSkillRead]


class ModuleCompleteRequest(BaseModel):
    user_id: int


class ModuleCompleteResponse(BaseModel):
    user_id: int
    module_id: int
    status: str
