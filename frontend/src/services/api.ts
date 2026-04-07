import axios, { AxiosError } from "axios";

type UnknownRecord = Record<string, unknown>;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000"
});

let loggingConfigured = false;

function isLoggingEnabled(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }
  try {
    return window.localStorage.getItem("debug_api") === "1";
  } catch {
    return false;
  }
}

function readBackendErrorMessage(payload: unknown): string {
  if (typeof payload === "string") {
    return payload.trim();
  }
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as UnknownRecord;
  const detail = record.detail;
  if (typeof detail === "string") {
    return detail.trim();
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === "object" && item && "msg" in item ? String((item as { msg?: unknown }).msg ?? "") : ""))
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }
  const message = record.message;
  if (typeof message === "string") {
    return message.trim();
  }
  const error = record.error;
  if (typeof error === "string") {
    return error.trim();
  }
  return "";
}

function configureApiLogging(): void {
  if (loggingConfigured) {
    return;
  }
  loggingConfigured = true;

  api.interceptors.request.use((config) => {
    if (isLoggingEnabled()) {
      console.info("[API][Request]", {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        data: config.data
      });
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      if (isLoggingEnabled()) {
        console.info("[API][Response]", {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          data: response.data
        });
      }
      return response;
    },
    (error: AxiosError) => {
      const backendMessage = readBackendErrorMessage(error.response?.data);
      console.error("[API][Error]", {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status,
        code: error.code,
        message: error.message,
        backendMessage,
        responseData: error.response?.data
      });
      return Promise.reject(error);
    }
  );
}

configureApiLogging();

export type ExplainLevel = 2 | 3;

export interface Course {
  id: number;
  title: string;
  description: string;
  goals: string;
  adaptive_overview: string;
}

export interface Module {
  id: number;
  course_id: number;
  title: string;
  difficulty: string;
  order_index: number;
}

export interface Lesson {
  id: number;
  module_id: number;
  title: string;
  content: string;
  order_index: number;
}

export interface TheoryBlockData {
  id: number;
  topic_id: number;
  title: string;
  block_type: string;
  content: string;
  simplified_content: string;
  difficulty: string;
  order_index: number;
}

export interface Exercise {
  id: number;
  topic_id: number;
  title: string;
  description: string;
  starter_code: string;
  difficulty: string;
  skill_name: string;
  order_index: number;
}

export interface TopicContent {
  id: number;
  lesson_id: number;
  title: string;
  difficulty: string;
  skill_name: string;
  order_index: number;
  theory_blocks: TheoryBlockData[];
  exercises: Exercise[];
}

export interface LessonContent extends Lesson {
  topics: TopicContent[];
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export interface CourseOutline {
  course_id: number;
  modules: ModuleWithLessons[];
  total_lessons: number;
}

export interface User {
  id: number;
  name: string;
  intro_completed: boolean;
  diagnostic_completed: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
}

export interface UserSkill {
  id?: number;
  skill_name: string;
  diagnostic_score: number;
  exercise_score: number;
  skill_score: number;
  skill_level: string;
  last_updated: string;
}

export interface ProgressResponse {
  user_id: number;
  completed_exercises: number;
  total_submissions: number;
  success_rate: number;
  completed_modules: number;
  total_modules: number;
  completed_module_ids: number[];
  completed_topics: number;
  total_topics: number;
  intro_completed: boolean;
  diagnostic_completed: boolean;
  skill_scores: UserSkill[];
}

export interface ModuleCompleteResponse {
  user_id: number;
  module_id: number;
  status: string;
}

export interface DiagnosticQuestion {
  id: number;
  question_text: string;
  question_type: string;
  code_snippet: string;
  options: string[];
  order_index: number;
}

export interface DiagnosticTest {
  id: number;
  title: string;
  description: string;
  total_questions: number;
  questions: DiagnosticQuestion[];
}

export interface AdaptiveModule {
  module_id: number;
  title: string;
  difficulty: string;
  order_index: number;
  priority: number;
  reason: string;
  status: string;
  skills: string[];
}

export interface AdaptivePathResponse {
  user_id: number;
  weak_skills: Array<{
    skill_name: string;
    score: number;
    deficit: number;
  }>;
  modules: AdaptiveModule[];
}

export interface AdaptiveSimpleTopic {
  topic_id: number;
  title: string;
  skill_name: string;
  simple_theory: string;
}

export interface AdaptiveNextStepResponse {
  user_id: number;
  module_id: number;
  step: string;
  chunked: boolean;
  micro_test_id: number | null;
  module_test_id: number | null;
  simple_topics: AdaptiveSimpleTopic[];
}

export interface AdaptiveTestSubmitResult {
  test_id: number;
  test_type: string;
  module_id: number | null;
  overall_score: number;
  passed: boolean;
  skill_scores: Array<{ skill_name: string; score: number }>;
  next_step: AdaptiveNextStepResponse;
}

export interface DiagnosticSubmitResult {
  test_id: number;
  total_questions: number;
  correct_answers: number;
  overall_score: number;
  recommendation: string;
  skill_scores: Array<{
    skill_name: string;
    correct_answers: number;
    total_questions: number;
    diagnostic_score: number;
    skill_level: string;
  }>;
}

export interface SubmitResponse {
  submission: {
    id: number;
    result: string;
    attempts: number;
  };
  stdout: string;
  stderr: string;
  passed: boolean;
  feedback: string;
  execution_time: number;
  recommendation: string | null;
  next_exercise_id: number | null;
  skill_scores: UserSkill[];
}

export interface HintResponse {
  hint: string;
  llm_used: boolean;
}

export interface ExplainResponse {
  text: string;
  source: "backend" | "fallback";
  level: ExplainLevel;
}

export interface ExerciseRoute {
  courseId: number;
  moduleId: number;
  lessonId: number;
  topicId: number;
  exerciseId: number;
}

const exerciseRouteCache = new Map<number, ExerciseRoute>();

export function getReadableError(error: unknown, fallback = "Произошла ошибка."): string {
  if (error instanceof AxiosError) {
    const backendMessage = readBackendErrorMessage(error.response?.data);
    if (backendMessage) {
      return backendMessage;
    }
    if (error.response?.status) {
      return `Ошибка ${error.response.status}: ${error.message}`;
    }
    return `Ошибка сети: ${error.message}`;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function readRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function readRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter((item): item is UnknownRecord => typeof item === "object" && item !== null) : [];
}

function normalizeCourse(raw: UnknownRecord): Course {
  return {
    id: readNumber(raw.id),
    title: readString(raw.title, "Курс Python"),
    description: readString(raw.description, ""),
    goals: readString(raw.goals, ""),
    adaptive_overview: readString(raw.adaptive_overview, "")
  };
}

function normalizeModule(raw: UnknownRecord): Module {
  return {
    id: readNumber(raw.id),
    course_id: readNumber(raw.course_id),
    title: readString(raw.title, "Модуль"),
    difficulty: readString(raw.difficulty, "medium"),
    order_index: readNumber(raw.order_index, 0)
  };
}

function normalizeLesson(raw: UnknownRecord): Lesson {
  return {
    id: readNumber(raw.id),
    module_id: readNumber(raw.module_id),
    title: readString(raw.title, "Урок"),
    content: readString(raw.content, ""),
    order_index: readNumber(raw.order_index, 0)
  };
}

function normalizeTheoryBlock(raw: UnknownRecord, topicId: number): TheoryBlockData {
  return {
    id: readNumber(raw.id),
    topic_id: readNumber(raw.topic_id, topicId),
    title: readString(raw.title, "Теория"),
    block_type: readString(raw.block_type, "text"),
    content: readString(raw.content, ""),
    simplified_content: readString(raw.simplified_content, ""),
    difficulty: readString(raw.difficulty, "medium"),
    order_index: readNumber(raw.order_index, 0)
  };
}

function normalizeExercise(raw: UnknownRecord): Exercise {
  return {
    id: readNumber(raw.id),
    topic_id: readNumber(raw.topic_id),
    title: readString(raw.title, "Упражнение"),
    description: readString(raw.description, "Описание упражнения пока не заполнено."),
    starter_code: readString(raw.starter_code, "def solve():\n    pass\n"),
    difficulty: readString(raw.difficulty, "medium"),
    skill_name: readString(raw.skill_name, "functions"),
    order_index: readNumber(raw.order_index, 0)
  };
}

function normalizeTopic(raw: UnknownRecord): TopicContent {
  const topicId = readNumber(raw.id);
  const theoryBlocks = readRecordArray(raw.theory_blocks)
    .map((item) => normalizeTheoryBlock(item, topicId))
    .sort((a, b) => a.order_index - b.order_index);
  const exercises = readRecordArray(raw.exercises)
    .map(normalizeExercise)
    .sort((a, b) => a.order_index - b.order_index);

  return {
    id: topicId,
    lesson_id: readNumber(raw.lesson_id),
    title: readString(raw.title, "Тема"),
    difficulty: readString(raw.difficulty, "medium"),
    skill_name: readString(raw.skill_name, "functions"),
    order_index: readNumber(raw.order_index, 0),
    theory_blocks: theoryBlocks,
    exercises
  };
}

function normalizeLessonContent(raw: UnknownRecord): LessonContent {
  return {
    ...normalizeLesson(raw),
    topics: readRecordArray(raw.topics)
      .map(normalizeTopic)
      .sort((a, b) => a.order_index - b.order_index)
  };
}

function normalizeSkill(raw: UnknownRecord): UserSkill {
  return {
    id: typeof raw.id === "number" ? raw.id : undefined,
    skill_name: readString(raw.skill_name || raw.skill, "skill"),
    diagnostic_score: typeof raw.diagnostic_score === "number" ? raw.diagnostic_score : 0.5,
    exercise_score: typeof raw.exercise_score === "number" ? raw.exercise_score : 0.5,
    skill_score: typeof raw.skill_score === "number" ? raw.skill_score : readNumber(raw.score, 0),
    skill_level: readString(raw.skill_level, "basic"),
    last_updated: readString(raw.last_updated, "")
  };
}

function normalizeProgress(raw: UnknownRecord): ProgressResponse {
  return {
    user_id: readNumber(raw.user_id, 0),
    completed_exercises: readNumber(raw.completed_exercises, 0),
    total_submissions: readNumber(raw.total_submissions, 0),
    success_rate: typeof raw.success_rate === "number" ? raw.success_rate : 0,
    completed_modules: readNumber(raw.completed_modules, 0),
    total_modules: readNumber(raw.total_modules, 0),
    completed_module_ids: Array.isArray(raw.completed_module_ids)
      ? raw.completed_module_ids.map((item) => readNumber(item, 0)).filter((item) => item > 0)
      : [],
    completed_topics: readNumber(raw.completed_topics, 0),
    total_topics: readNumber(raw.total_topics, 0),
    intro_completed: raw.intro_completed === true,
    diagnostic_completed: raw.diagnostic_completed === true,
    skill_scores: readRecordArray(raw.skill_scores).map(normalizeSkill)
  };
}

function normalizeModuleCompleteResponse(raw: UnknownRecord): ModuleCompleteResponse {
  return {
    user_id: readNumber(raw.user_id, 0),
    module_id: readNumber(raw.module_id, 0),
    status: readString(raw.status, "completed")
  };
}

function normalizeUser(raw: UnknownRecord): User {
  return {
    id: readNumber(raw.id),
    name: readString(raw.name, ""),
    intro_completed: raw.intro_completed === true,
    diagnostic_completed: raw.diagnostic_completed === true
  };
}

function normalizeDiagnosticQuestion(raw: UnknownRecord): DiagnosticQuestion {
  return {
    id: readNumber(raw.id),
    question_text: readString(raw.question_text, ""),
    question_type: readString(raw.question_type, "multiple_choice"),
    code_snippet: readString(raw.code_snippet, ""),
    options: Array.isArray(raw.options) ? raw.options.map((item) => readString(item, "")).filter(Boolean) : [],
    order_index: readNumber(raw.order_index, 0)
  };
}

function normalizeDiagnosticTest(raw: UnknownRecord): DiagnosticTest {
  return {
    id: readNumber(raw.id),
    title: readString(raw.title, "Диагностический тест"),
    description: readString(raw.description, ""),
    total_questions: readNumber(raw.total_questions, 0),
    questions: readRecordArray(raw.questions).map(normalizeDiagnosticQuestion).sort((a, b) => a.order_index - b.order_index)
  };
}

function normalizeAdaptiveModule(raw: UnknownRecord): AdaptiveModule {
  return {
    module_id: readNumber(raw.module_id, 0),
    title: readString(raw.title, "Модуль"),
    difficulty: readString(raw.difficulty, "medium"),
    order_index: readNumber(raw.order_index, 0),
    priority: typeof raw.priority === "number" ? raw.priority : 0,
    reason: readString(raw.reason, ""),
    status: readString(raw.status, "not_started"),
    skills: Array.isArray(raw.skills) ? raw.skills.map((item) => readString(item, "")).filter(Boolean) : []
  };
}

function normalizeAdaptivePath(raw: UnknownRecord): AdaptivePathResponse {
  return {
    user_id: readNumber(raw.user_id, 0),
    weak_skills: readRecordArray(raw.weak_skills).map((item) => ({
      skill_name: readString(item.skill_name, "skill"),
      score: typeof item.score === "number" ? item.score : 0,
      deficit: typeof item.deficit === "number" ? item.deficit : 0
    })),
    modules: readRecordArray(raw.modules).map(normalizeAdaptiveModule)
  };
}

function normalizeAdaptiveNextStep(raw: UnknownRecord): AdaptiveNextStepResponse {
  return {
    user_id: readNumber(raw.user_id, 0),
    module_id: readNumber(raw.module_id, 0),
    step: readString(raw.step, ""),
    chunked: raw.chunked === true,
    micro_test_id: typeof raw.micro_test_id === "number" ? raw.micro_test_id : null,
    module_test_id: typeof raw.module_test_id === "number" ? raw.module_test_id : null,
    simple_topics: readRecordArray(raw.simple_topics).map((item) => ({
      topic_id: readNumber(item.topic_id, 0),
      title: readString(item.title, "Тема"),
      skill_name: readString(item.skill_name, "skill"),
      simple_theory: readString(item.simple_theory, "")
    }))
  };
}

function normalizeAdaptiveTestSubmitResult(raw: UnknownRecord): AdaptiveTestSubmitResult {
  return {
    test_id: readNumber(raw.test_id, 0),
    test_type: readString(raw.test_type, ""),
    module_id: typeof raw.module_id === "number" ? raw.module_id : null,
    overall_score: typeof raw.overall_score === "number" ? raw.overall_score : 0,
    passed: raw.passed === true,
    skill_scores: readRecordArray(raw.skill_scores).map((item) => ({
      skill_name: readString(item.skill_name, "skill"),
      score: typeof item.score === "number" ? item.score : 0
    })),
    next_step: normalizeAdaptiveNextStep(readRecord(raw.next_step))
  };
}

function normalizeDiagnosticSubmitResult(raw: UnknownRecord): DiagnosticSubmitResult {
  const skillScores = readRecordArray(raw.skill_scores).map((item) => ({
    skill_name: readString(item.skill_name, "skill"),
    correct_answers: readNumber(item.correct_answers, 0),
    total_questions: readNumber(item.total_questions, 0),
    diagnostic_score: typeof item.diagnostic_score === "number" ? item.diagnostic_score : 0,
    skill_level: readString(item.skill_level, "basic")
  }));

  return {
    test_id: readNumber(raw.test_id, 0),
    total_questions: readNumber(raw.total_questions, 0),
    correct_answers: readNumber(raw.correct_answers, 0),
    overall_score: typeof raw.overall_score === "number" ? raw.overall_score : 0,
    recommendation: readString(raw.recommendation, ""),
    skill_scores: skillScores
  };
}

function normalizeSubmitResponse(raw: UnknownRecord): SubmitResponse {
  const submission = readRecord(raw.submission);
  return {
    submission: {
      id: readNumber(submission.id, 0),
      result: readString(submission.result, "unknown"),
      attempts: readNumber(submission.attempts, 0)
    },
    stdout: readString(raw.stdout, ""),
    stderr: readString(raw.stderr, ""),
    passed: raw.passed === true,
    feedback: readString(raw.feedback, ""),
    execution_time: typeof raw.execution_time === "number" ? raw.execution_time : 0,
    recommendation: typeof raw.recommendation === "string" ? raw.recommendation : null,
    next_exercise_id: typeof raw.next_exercise_id === "number" ? raw.next_exercise_id : null,
    skill_scores: readRecordArray(raw.skill_scores).map(normalizeSkill)
  };
}

function buildFallbackExplain(source: string, level: ExplainLevel): string {
  const normalized = source.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Краткое объяснение пока недоступно. Прочитайте теорию и попробуйте решить задачу шаг за шагом.";
  }

  const firstSentence = normalized.split(/[.!?]/)[0]?.trim() ?? normalized.slice(0, 180);
  if (level === 2) {
    return `Проще: ${firstSentence}. Сфокусируйтесь на одной идее, затем проверьте её на маленьком примере.`;
  }

  return `Как ребёнку: представь, что программа это инструкция из двух шагов. Шаг 1: ${firstSentence}. Шаг 2: запусти код и сравни результат с ожидаемым.`;
}

function extractExplainText(payload: UnknownRecord): string {
  return (
    readString(payload.explanation) ||
    readString(payload.text) ||
    readString(payload.hint) ||
    readString(payload.message)
  ).trim();
}

export function primeExerciseRouteCache(courseId: number, moduleId: number, lesson: LessonContent): void {
  for (const topic of lesson.topics) {
    for (const exercise of topic.exercises) {
      exerciseRouteCache.set(exercise.id, {
        courseId,
        moduleId,
        lessonId: lesson.id,
        topicId: topic.id,
        exerciseId: exercise.id
      });
    }
  }
}

export async function getCourses(): Promise<Course[]> {
  const response = await api.get<UnknownRecord[]>("/courses");
  return response.data.map(normalizeCourse);
}

export async function getModules(courseId: string): Promise<Module[]> {
  const response = await api.get<UnknownRecord[]>(`/modules/${courseId}`);
  return response.data.map(normalizeModule).sort((a, b) => a.order_index - b.order_index);
}

export async function getLessons(moduleId: string): Promise<Lesson[]> {
  const response = await api.get<UnknownRecord[]>(`/lessons/${moduleId}`);
  return response.data.map(normalizeLesson).sort((a, b) => a.order_index - b.order_index);
}

export async function getLessonContent(lessonId: number | string): Promise<LessonContent> {
  const response = await api.get<UnknownRecord>(`/lessons/content/${lessonId}`);
  return normalizeLessonContent(response.data);
}

export async function getCourseOutline(courseId: number): Promise<CourseOutline> {
  const modules = await getModules(String(courseId));
  const modulesWithLessons = await Promise.all(
    modules.map(async (moduleItem) => ({
      ...moduleItem,
      lessons: await getLessons(String(moduleItem.id))
    }))
  );

  return {
    course_id: courseId,
    modules: modulesWithLessons,
    total_lessons: modulesWithLessons.reduce((count, moduleItem) => count + moduleItem.lessons.length, 0)
  };
}

export async function resolveExerciseRoute(exerciseId: number): Promise<ExerciseRoute | null> {
  const cachedRoute = exerciseRouteCache.get(exerciseId);
  if (cachedRoute) {
    return cachedRoute;
  }

  const courses = await getCourses();
  for (const course of courses) {
    const modules = await getModules(String(course.id));
    for (const moduleItem of modules) {
      const lessons = await getLessons(String(moduleItem.id));
      const lessonContents = await Promise.all(lessons.map((lesson) => getLessonContent(lesson.id)));
      for (const lessonContent of lessonContents) {
        primeExerciseRouteCache(course.id, moduleItem.id, lessonContent);
      }

      const route = exerciseRouteCache.get(exerciseId);
      if (route) {
        return route;
      }
    }
  }

  return null;
}

export async function registerUser(name: string): Promise<User> {
  const response = await api.post<UnknownRecord>("/register_user", { name });
  return normalizeUser(response.data);
}

export async function registerAuth(name: string, password: string): Promise<AuthUser> {
  const response = await api.post<UnknownRecord>("/register", { name, password });
  return {
    id: readNumber(response.data.id),
    name: readString(response.data.name, "")
  };
}

export async function loginAuth(name: string, password: string): Promise<AuthUser> {
  const response = await api.post<UnknownRecord>("/login", { name, password });
  return {
    id: readNumber(response.data.id),
    name: readString(response.data.name, "")
  };
}

export async function completeIntro(userId: number): Promise<User> {
  const response = await api.post<UnknownRecord>(`/users/${userId}/complete_intro`);
  return normalizeUser(response.data);
}

export async function completeModule(userId: number, moduleId: number): Promise<ModuleCompleteResponse> {
  const response = await api.post<UnknownRecord>(`/modules/${moduleId}/complete`, { user_id: userId });
  return normalizeModuleCompleteResponse(response.data);
}

export async function getActiveDiagnosticTest(): Promise<DiagnosticTest> {
  const response = await api.get<UnknownRecord>("/diagnostic-tests/active");
  return normalizeDiagnosticTest(response.data);
}

export async function getDiagnosticTestById(testId: number): Promise<DiagnosticTest> {
  const response = await api.get<UnknownRecord>(`/diagnostic-tests/${testId}`);
  return normalizeDiagnosticTest(response.data);
}

export async function submitDiagnosticTest(
  testId: number,
  userId: number,
  answers: Array<{ question_id: number; selected_answer: string }>
): Promise<DiagnosticSubmitResult> {
  const response = await api.post<UnknownRecord>(`/diagnostic-tests/${testId}/submit`, {
    user_id: userId,
    answers
  });
  return normalizeDiagnosticSubmitResult(response.data);
}

export async function getAdaptivePath(userId: number): Promise<AdaptivePathResponse> {
  const response = await api.get<UnknownRecord>(`/adaptive/path/${userId}`);
  return normalizeAdaptivePath(response.data);
}

export async function getAdaptiveModuleNextStep(userId: number, moduleId: number): Promise<AdaptiveNextStepResponse> {
  const response = await api.get<UnknownRecord>(`/adaptive/modules/${moduleId}/next-step`, { params: { user_id: userId } });
  return normalizeAdaptiveNextStep(response.data);
}

export async function submitAdaptiveMicroTest(
  testId: number,
  userId: number,
  answers: Array<{ question_id: number; selected_answer: string }>
): Promise<AdaptiveTestSubmitResult> {
  const response = await api.post<UnknownRecord>(`/adaptive/micro-tests/${testId}/submit`, {
    user_id: userId,
    answers
  });
  return normalizeAdaptiveTestSubmitResult(response.data);
}

export async function submitAdaptiveModuleTest(
  testId: number,
  userId: number,
  answers: Array<{ question_id: number; selected_answer: string }>
): Promise<AdaptiveTestSubmitResult> {
  const response = await api.post<UnknownRecord>(`/adaptive/module-tests/${testId}/submit`, {
    user_id: userId,
    answers
  });
  return normalizeAdaptiveTestSubmitResult(response.data);
}

export async function submitSolution(userId: number, exerciseId: number, code: string): Promise<SubmitResponse> {
  const response = await api.post<UnknownRecord>("/submit", {
    user_id: userId,
    exercise_id: exerciseId,
    code
  });
  return normalizeSubmitResponse(response.data);
}

export async function requestHint(userId: number, exerciseId: number, errorMessage: string): Promise<HintResponse> {
  const response = await api.post<HintResponse>("/hint", {
    user_id: userId,
    exercise_id: exerciseId,
    error_message: errorMessage
  });
  return response.data;
}

export async function requestExplain(topicId: number, level: ExplainLevel, theorySource: string): Promise<ExplainResponse> {
  try {
    const response = await api.post<UnknownRecord>("/explain", {
      topic_id: topicId,
      level
    });
    const text = extractExplainText(response.data);
    if (text) {
      return {
        text,
        source: "backend",
        level
      };
    }
  } catch {
    // Fallback below intentionally keeps UX available even if endpoint is absent.
  }

  return {
    text: buildFallbackExplain(theorySource, level),
    source: "fallback",
    level
  };
}

export async function getProgress(userId: number): Promise<ProgressResponse> {
  const response = await api.get<UnknownRecord>(`/progress/${userId}`);
  return normalizeProgress(response.data);
}
