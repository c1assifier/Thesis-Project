from pydantic import BaseModel


class DiagnosticQuestionRead(BaseModel):
    id: int
    question_text: str
    question_type: str
    code_snippet: str
    options: list[str]
    order_index: int


class DiagnosticTestRead(BaseModel):
    id: int
    title: str
    description: str
    total_questions: int
    questions: list[DiagnosticQuestionRead]


class DiagnosticSubmitAnswer(BaseModel):
    question_id: int
    selected_answer: str


class DiagnosticSubmitRequest(BaseModel):
    user_id: int
    answers: list[DiagnosticSubmitAnswer]


class SkillDiagnosticResult(BaseModel):
    skill_name: str
    correct_answers: int
    total_questions: int
    diagnostic_score: float
    skill_level: str


class DiagnosticSubmitResponse(BaseModel):
    test_id: int
    total_questions: int
    correct_answers: int
    overall_score: float
    skill_scores: list[SkillDiagnosticResult]
    recommendation: str
