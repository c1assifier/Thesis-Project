from pydantic import BaseModel, Field


class AdaptiveSubmitAnswer(BaseModel):
    question_id: int
    selected_answer: str


class AdaptiveEntrySubmitRequest(BaseModel):
    user_id: int
    answers: list[AdaptiveSubmitAnswer]


class AdaptiveTestSubmitRequest(BaseModel):
    user_id: int
    answers: list[AdaptiveSubmitAnswer]


class SkillScoreRead(BaseModel):
    skill_name: str
    score: float


class WeakSkillRead(BaseModel):
    skill_name: str
    score: float
    deficit: float


class AdaptiveModuleRead(BaseModel):
    module_id: int
    title: str
    difficulty: str
    order_index: int
    priority: float
    reason: str
    status: str
    skills: list[str] = Field(default_factory=list)


class AdaptiveSimpleTopicRead(BaseModel):
    topic_id: int
    title: str
    skill_name: str
    simple_theory: str


class AdaptiveEntrySubmitResponse(BaseModel):
    entry_test_id: int
    overall_score: float
    weak_skills: list[WeakSkillRead]
    skill_scores: list[SkillScoreRead]
    modules: list[AdaptiveModuleRead]


class AdaptivePathResponse(BaseModel):
    user_id: int
    weak_skills: list[WeakSkillRead]
    modules: list[AdaptiveModuleRead]


class AdaptiveNextStepResponse(BaseModel):
    user_id: int
    module_id: int
    step: str
    chunked: bool
    micro_test_id: int | None = None
    module_test_id: int | None = None
    simple_topics: list[AdaptiveSimpleTopicRead] = Field(default_factory=list)


class AdaptiveTestSubmitResponse(BaseModel):
    test_id: int
    test_type: str
    module_id: int | None = None
    overall_score: float
    passed: bool
    skill_scores: list[SkillScoreRead]
    next_step: AdaptiveNextStepResponse


class AdaptiveProgressResponse(BaseModel):
    user_id: int
    completed_modules: int
    total_modules: int
    completed_module_ids: list[int]
    completed_topics: int
    total_topics: int
    weak_skills: list[WeakSkillRead]
    modules: list[AdaptiveModuleRead]
