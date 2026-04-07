from app.models.course import Course
from app.models.diagnostic_answer import DiagnosticAnswer
from app.models.diagnostic_question import DiagnosticQuestion
from app.models.diagnostic_test import DiagnosticTest
from app.models.exercise import Exercise
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.module_progress import ModuleProgress
from app.models.progress import Progress
from app.models.skill_mapping import SkillMapping
from app.models.submission import Submission
from app.models.test_case import TestCase
from app.models.theory_block import TheoryBlock
from app.models.topic import Topic
from app.models.user import User
from app.models.user_skill import UserSkill

__all__ = [
    "Course",
    "DiagnosticTest",
    "DiagnosticQuestion",
    "DiagnosticAnswer",
    "SkillMapping",
    "Module",
    "ModuleProgress",
    "Lesson",
    "Topic",
    "TheoryBlock",
    "Exercise",
    "TestCase",
    "Progress",
    "User",
    "Submission",
    "UserSkill",
]
