import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import SkillPanel from "../components/SkillPanel";
import TheoryBlock from "../components/TheoryBlock";
import {
  completeModule,
  getCourseOutline,
  getCourses,
  getLessonContent,
  getProgress,
  getReadableError,
  primeExerciseRouteCache,
  type User
} from "../services/api";
import { getUnlockedModuleIds, sortModulesByOrder } from "../services/moduleProgress";
import { getStoredUser } from "../services/userSession";

function exerciseHref(courseId: string, moduleId: string, lessonId: string, exerciseId: number): string {
  return `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/exercises/${exerciseId}`;
}

function lessonHref(courseId: string, moduleId: string, lessonId: number): string {
  return `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`;
}

export default function LessonPage() {
  const { courseId = "", moduleId = "", lessonId = "" } = useParams();
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const [completeError, setCompleteError] = useState("");

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: getCourses
  });

  const currentCourse = useMemo(
    () => coursesQuery.data?.find((course) => String(course.id) === courseId) ?? coursesQuery.data?.[0] ?? null,
    [courseId, coursesQuery.data]
  );

  const outlineQuery = useQuery({
    queryKey: ["course-outline", currentCourse?.id],
    queryFn: () => getCourseOutline((currentCourse as NonNullable<typeof currentCourse>).id),
    enabled: currentCourse !== null
  });

  const lessonQuery = useQuery({
    queryKey: ["lesson-content", lessonId],
    queryFn: () => getLessonContent(lessonId),
    enabled: Boolean(lessonId)
  });

  const progressQuery = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => getProgress((user as User).id),
    enabled: user !== null
  });

  useEffect(() => {
    if (!lessonQuery.data) {
      return;
    }
    const parsedCourseId = Number(courseId);
    const parsedModuleId = Number(moduleId);
    if (Number.isFinite(parsedCourseId) && Number.isFinite(parsedModuleId)) {
      primeExerciseRouteCache(parsedCourseId, parsedModuleId, lessonQuery.data);
    }
  }, [courseId, lessonQuery.data, moduleId]);

  const modules = outlineQuery.data?.modules ?? [];
  const currentModule = modules.find((item) => String(item.id) === moduleId) ?? null;
  const moduleLessons = currentModule?.lessons ?? [];
  const sortedModules = useMemo(() => sortModulesByOrder(modules), [modules]);
  const unlockedSet = useMemo(
    () => getUnlockedModuleIds(modules, progressQuery.data?.completed_module_ids ?? []),
    [modules, progressQuery.data?.completed_module_ids]
  );
  const currentModuleIndex = sortedModules.findIndex((item) => String(item.id) === moduleId);
  const previousModule = currentModuleIndex > 0 ? sortedModules[currentModuleIndex - 1] : null;
  const nextModule = currentModuleIndex >= 0 && currentModuleIndex < sortedModules.length - 1 ? sortedModules[currentModuleIndex + 1] : null;
  const isModuleLocked = Boolean(currentModule && progressQuery.data && !unlockedSet.has(currentModule.id));

  const lessonIndex = moduleLessons.findIndex((item) => String(item.id) === lessonId);
  const previousLesson = lessonIndex > 0 ? moduleLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < moduleLessons.length - 1 ? moduleLessons[lessonIndex + 1] : null;
  const currentModuleId = Number(moduleId);
  const isLastLesson = lessonIndex >= 0 && lessonIndex === moduleLessons.length - 1;
  const isModuleCompleted = Boolean(
    progressQuery.data && Number.isFinite(currentModuleId) && progressQuery.data.completed_module_ids.includes(currentModuleId)
  );

  const completeModuleMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Сначала зарегистрируйте студента.");
      }
      if (!Number.isFinite(currentModuleId)) {
        throw new Error("Некорректный модуль.");
      }
      return completeModule(user.id, currentModuleId);
    },
    onSuccess: async () => {
      setCompleteError("");
      await queryClient.invalidateQueries({ queryKey: ["progress", user?.id] });
    },
    onError: (mutationError) => {
      setCompleteError(getReadableError(mutationError, "Не удалось завершить модуль."));
    }
  });

  if (!user) {
    return (
      <div className="edu-panel p-6">
        <p className="text-sm text-muted">Сначала зарегистрируйте студента, чтобы открыть урок.</p>
        <Link to="/" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  if (isModuleLocked) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="edu-panel border-amber-200 bg-amber-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Урок недоступен</p>
            <h1 className="mt-2 text-2xl font-semibold text-amber-900">{lessonQuery.data?.title ?? "Урок"}</h1>
            <p className="mt-3 text-sm text-amber-900">
              Сначала завершите предыдущий модуль. После этого уроки текущего модуля откроются автоматически.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/course" className="inline-flex rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">
                К курсу
              </Link>
              {previousModule ? (
                <Link
                  to={`/courses/${courseId}/modules/${previousModule.id}`}
                  className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Открыть предыдущий модуль
                </Link>
              ) : null}
            </div>
          </div>
        </section>
        <SkillPanel user={user} progress={progressQuery.data ?? null} isLoading={progressQuery.isLoading} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-6">
        <div className="edu-panel p-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <Link to="/course" className="font-medium text-primary hover:underline">
              Курс
            </Link>
            <span>→</span>
            <Link to={`/courses/${courseId}/modules/${moduleId}`} className="font-medium text-primary hover:underline">
              Модуль
            </Link>
            <span>→</span>
            <span>Урок</span>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Урок</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-text">{lessonQuery.data?.title ?? "Загрузка урока..."}</h1>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-slate-700">
            {lessonQuery.data?.content || "Контент урока загружается с сервера."}
          </p>
        </div>

        {lessonQuery.data?.topics.map((topic) => (
          <TheoryBlock
            key={topic.id}
            topic={topic}
            practiceHref={topic.exercises[0] ? exerciseHref(courseId, moduleId, lessonId, topic.exercises[0].id) : undefined}
          />
        ))}

        <div className="edu-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Навигация по урокам</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {previousLesson ? (
                <Link
                  to={lessonHref(courseId, moduleId, previousLesson.id)}
                  className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-text transition hover:bg-slate-50"
                >
                  Назад
                </Link>
              ) : null}
              {nextLesson ? (
                <Link
                  to={lessonHref(courseId, moduleId, nextLesson.id)}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Далее
                </Link>
              ) : null}
            </div>
          </div>
          {isLastLesson ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-lime-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Финальный урок модуля</p>
                  <p className="mt-1 text-sm text-emerald-900">
                    Вы дошли до последнего урока. Зафиксируйте завершение модуля, чтобы перейти дальше по курсу.
                  </p>
                </div>
                {isModuleCompleted ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Выполнен
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!isModuleCompleted ? (
                  <button
                    type="button"
                    onClick={() => completeModuleMutation.mutate()}
                    disabled={completeModuleMutation.isPending || !user}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {completeModuleMutation.isPending ? "Сохраняем..." : "Завершить модуль"}
                  </button>
                ) : null}
                <Link
                  to="/course"
                  className="inline-flex rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  Вернуться к курсу
                </Link>
                {nextModule ? (
                  isModuleCompleted ? (
                    <Link
                      to={`/courses/${courseId}/modules/${nextModule.id}`}
                      className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      К следующему модулю
                    </Link>
                  ) : (
                    <span className="inline-flex rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
                      Сначала завершите модуль
                    </span>
                  )
                ) : null}
              </div>
              {completeError ? <p className="mt-2 text-sm text-red-600">{completeError}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <SkillPanel user={user} progress={progressQuery.data ?? null} isLoading={progressQuery.isLoading} />
    </div>
  );
}
