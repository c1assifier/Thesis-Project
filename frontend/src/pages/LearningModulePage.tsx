import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import SkillPanel from "../components/SkillPanel";
import { getCourseOutline, getCourses, getProgress, type User } from "../services/api";
import { getUnlockedModuleIds, sortModulesByOrder } from "../services/moduleProgress";
import { getStoredUser } from "../services/userSession";

function lessonHref(courseId: string, moduleId: string, lessonId: number): string {
  return `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`;
}

export default function LearningModulePage() {
  const { courseId = "", moduleId = "" } = useParams();
  const user = getStoredUser();

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

  const progressQuery = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => getProgress((user as User).id),
    enabled: user !== null
  });

  const modules = outlineQuery.data?.modules ?? [];
  const currentModule = modules.find((moduleItem) => String(moduleItem.id) === moduleId) ?? null;
  const sortedModules = useMemo(() => sortModulesByOrder(modules), [modules]);
  const unlockedSet = useMemo(
    () => getUnlockedModuleIds(modules, progressQuery.data?.completed_module_ids ?? []),
    [modules, progressQuery.data?.completed_module_ids]
  );
  const currentModuleIndex = sortedModules.findIndex((moduleItem) => String(moduleItem.id) === moduleId);
  const previousModule = currentModuleIndex > 0 ? sortedModules[currentModuleIndex - 1] : null;
  const isModuleLocked = Boolean(currentModule && progressQuery.data && !unlockedSet.has(currentModule.id));
  const currentModuleId = Number(moduleId);
  const isModuleCompleted = Boolean(
    progressQuery.data && Number.isFinite(currentModuleId) && progressQuery.data.completed_module_ids.includes(currentModuleId)
  );

  if (!user) {
    return (
      <div className="edu-panel p-6">
        <p className="text-sm text-muted">Сначала выполните локальную регистрацию, чтобы открыть модуль.</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Модуль заблокирован</p>
            <h1 className="mt-2 text-2xl font-semibold text-amber-900">{currentModule?.title}</h1>
            <p className="mt-3 text-sm text-amber-900">Сначала завершите предыдущий модуль, затем откроется доступ к этому разделу.</p>
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
          <Link to="/course" className="text-sm font-medium text-primary hover:underline">
            Назад к курсу
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Модуль</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">{currentModule?.title ?? "Загрузка модуля..."}</h1>
          <p className="mt-3 text-sm text-muted">В модуле {currentModule?.lessons.length ?? 0} уроков. Откройте урок, чтобы изучить теорию и перейти к заданиям.</p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-muted">
              Завершение модуля доступно на последнем уроке.
              {isModuleCompleted ? " Этот модуль уже отмечен как выполненный." : ""}
            </p>
            {isModuleCompleted ? (
              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Выполнен
              </span>
            ) : null}
          </div>
        </div>

        <div className="edu-panel p-6">
          <h2 className="edu-section-title">Уроки модуля</h2>
          <div className="mt-5 space-y-3">
            {currentModule?.lessons.map((lesson) => (
              <div key={lesson.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Урок {lesson.order_index}</p>
                    <h3 className="mt-1 text-lg font-semibold text-text">{lesson.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{lesson.content.slice(0, 160)}...</p>
                  </div>
                  <Link
                    to={lessonHref(courseId, moduleId, lesson.id)}
                    className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Открыть урок
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SkillPanel user={user} progress={progressQuery.data ?? null} isLoading={progressQuery.isLoading} />
    </div>
  );
}
