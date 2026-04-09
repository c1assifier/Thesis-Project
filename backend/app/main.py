from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models import (
    Course,
    DiagnosticAnswer,
    DiagnosticQuestion,
    DiagnosticTest,
    Exercise,
    Lesson,
    Module,
    ModuleProgress,
    Progress,
    SkillMapping,
    Submission,
    TestCase,
    TheoryBlock,
    Topic,
    User,
    UserSkill,
)
from app.routers import adaptive, auth, courses, diagnostics, exercises, lessons, modules, portal, submissions
from app.services.course_service import CourseService
from app.services.diagnostic_service import DiagnosticService


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        CourseService(db).seed_course_content()
        DiagnosticService(db).seed_diagnostic_content()
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router)
app.include_router(modules.router)
app.include_router(lessons.router)
app.include_router(exercises.router)
app.include_router(adaptive.router)
app.include_router(auth.router)
app.include_router(submissions.router)
app.include_router(diagnostics.router)
app.include_router(portal.router)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}
