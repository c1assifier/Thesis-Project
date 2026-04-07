import { Link } from "react-router-dom";

import { type ModuleWithLessons } from "../services/api";
import { getUnlockedModuleIds } from "../services/moduleProgress";

type Props = {
  courseId: number;
  modules: ModuleWithLessons[];
  disabled?: boolean;
  completedModuleIds?: number[];
};

function moduleHref(courseId: number, moduleId: number): string {
  return `/courses/${courseId}/modules/${moduleId}`;
}

export default function ModuleList({ courseId, modules, disabled = false, completedModuleIds = [] }: Props) {
  const completedSet = new Set(completedModuleIds);
  const unlockedSet = getUnlockedModuleIds(modules, completedModuleIds);

  return (
    <section className="edu-panel p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Структура курса</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">Модули</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{modules.length} модулей</span>
      </div>

      <div className="mt-5 space-y-3">
        {disabled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Модули откроются после прохождения диагностики по курсу.
          </div>
        ) : null}
        {modules.map((moduleItem) => {
          const isCompleted = completedSet.has(moduleItem.id);
          const isLockedBySequence = !unlockedSet.has(moduleItem.id);
          const isLocked = disabled || isLockedBySequence;

          return (
            <div
              key={moduleItem.id}
              className={`rounded-xl border p-4 transition ${
                isCompleted ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Модуль {moduleItem.order_index}</p>
                  <h3 className="mt-1 text-lg font-semibold text-text">{moduleItem.title}</h3>
                  <p className="mt-2 text-sm text-muted">
                    {moduleItem.lessons.length} уроков, уровень {moduleItem.difficulty}
                  </p>
                  {isCompleted ? (
                    <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      Выполнен
                    </span>
                  ) : isLockedBySequence && !disabled ? (
                    <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                      Заблокирован
                    </span>
                  ) : null}
                </div>
                <Link
                  to={moduleHref(courseId, moduleItem.id)}
                  onClick={(event) => {
                    if (isLocked) {
                      event.preventDefault();
                    }
                  }}
                  className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                    isLocked ? "cursor-not-allowed bg-slate-400" : "bg-primary hover:bg-blue-700"
                  }`}
                >
                  {isLockedBySequence && !disabled ? "Недоступен" : "Далее"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
