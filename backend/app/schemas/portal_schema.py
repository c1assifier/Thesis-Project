from pydantic import BaseModel, Field


class PortalProfileRead(BaseModel):
    level: str
    points: int


class PortalActivityRead(BaseModel):
    label: str


class PortalRecommendationRead(BaseModel):
    title: str
    description: str


class PortalDashboardStatsRead(BaseModel):
    progress_percent: int
    completed_modules: int
    total_modules: int
    solved_tasks: int
    total_tasks: int
    accuracy_percent: int


class PortalDashboardRead(BaseModel):
    title: str
    subtitle: str
    student_label: str
    profile: PortalProfileRead
    activity: list[PortalActivityRead] = Field(default_factory=list)
    stats: PortalDashboardStatsRead
    recommendations: list[PortalRecommendationRead] = Field(default_factory=list)


class PortalCourseModuleRead(BaseModel):
    id: int
    linked_course_id: int | None = None
    linked_module_id: int | None = None
    linked_lesson_id: int | None = None
    title: str
    status: str
    progress_percent: int
    progress_label: str
    badge: str


class PortalCourseStructureRead(BaseModel):
    title: str
    module_count_label: str
    modules: list[PortalCourseModuleRead] = Field(default_factory=list)


class PortalDiagnosticGateRead(BaseModel):
    title: str
    description: str
    note: str
    action_label: str
    locked_modules: list[str] = Field(default_factory=list)


class PortalBootstrapRead(BaseModel):
    app_title: str
    dashboard: PortalDashboardRead
    diagnostic_gate: PortalDiagnosticGateRead
    course_structure: PortalCourseStructureRead


class PortalChecklistItemRead(BaseModel):
    title: str
    completed: bool
    linked_lesson_id: int | None = None


class PortalModuleDetailsRead(BaseModel):
    id: int
    linked_course_id: int | None = None
    linked_module_id: int | None = None
    linked_lesson_id: int | None = None
    title: str
    status: str
    badge: str
    progress_percent: int
    progress_label: str
    adaptive_label: str
    adaptive_description: str
    theory_items: list[PortalChecklistItemRead] = Field(default_factory=list)
    practice_items: list[PortalChecklistItemRead] = Field(default_factory=list)
    action_label: str
