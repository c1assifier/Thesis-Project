from pydantic import BaseModel, ConfigDict


class TheoryBlockRead(BaseModel):
    id: int
    topic_id: int
    title: str
    block_type: str
    content: str
    simplified_content: str
    difficulty: str
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class ExerciseRead(BaseModel):
    id: int
    topic_id: int
    title: str
    description: str
    starter_code: str
    difficulty: str
    skill_name: str
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class TopicRead(BaseModel):
    id: int
    lesson_id: int
    title: str
    difficulty: str
    skill_name: str
    order_index: int
    theory_blocks: list[TheoryBlockRead]
    exercises: list[ExerciseRead]

    model_config = ConfigDict(from_attributes=True)


class LessonRead(BaseModel):
    id: int
    module_id: int
    title: str
    content: str
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class LessonContentRead(BaseModel):
    id: int
    module_id: int
    title: str
    content: str
    order_index: int
    topics: list[TopicRead]

    model_config = ConfigDict(from_attributes=True)


class ModuleRead(BaseModel):
    id: int
    course_id: int
    title: str
    difficulty: str
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class CourseRead(BaseModel):
    id: int
    title: str
    description: str
    goals: str
    adaptive_overview: str

    model_config = ConfigDict(from_attributes=True)
