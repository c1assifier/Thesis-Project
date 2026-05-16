import { Link } from "react-router-dom";

import type { PortalCourseStructure } from "../../services/portalApi";
import { CheckCircleIcon, CircleIcon, LockKeyIcon, PlayIcon } from "./PortalIcons";
import { PortalPanel, PortalProgressBar, PortalStatusBadge, PortalWireframe } from "./PortalPrimitives";

function iconForStatus(status: string) {
  if (status === "completed") return <CheckCircleIcon className="h-5 w-5 text-emerald-600" />;
  if (status === "in_progress") return <PlayIcon className="h-5 w-5 text-blue-600" />;
  if (status === "locked") return <LockKeyIcon className="h-5 w-5 text-slate-400" />;
  return <CircleIcon className="h-5 w-5 text-slate-400" />;
}

function cardBorderClass(status: string): string {
  if (status === "completed") return "border-emerald-200 bg-emerald-50/60";
  if (status === "in_progress") return "border-blue-200 bg-blue-50/60";
  if (status === "locked") return "border-slate-200 bg-slate-50 opacity-70";
  return "border-slate-200 bg-white";
}

function cardHoverClass(status: string): string {
  if (status === "locked") return "cursor-not-allowed";
  return "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all";
}

/** Иконка молнии ⚡ — знакомо из диагностики */
function ZapIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export default function CourseStructureView({ course }: { course: PortalCourseStructure }) {
  return (
    <PortalPanel className="p-6">
      <PortalWireframe className="space-y-4 p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-400 text-[10px] font-bold text-slate-500">
              C
            </span>
            <h1 className="font-semibold text-slate-900">{course.title}</h1>
          </div>
          <div className="text-sm text-slate-500">{course.module_count_label}</div>
        </div>

        {/* Сетка модулей */}
        <div className="grid gap-3 md:grid-cols-2">
          {course.modules.map((module) => {
            const masteredCount = module.mastered_lessons_count ?? 0;

            const cardContent = (
              <>
                {/* Шапка карточки */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {iconForStatus(module.status)}
                    <span className="font-semibold text-slate-900 leading-snug">{module.title}</span>
                  </div>
                  <PortalStatusBadge status={module.status}>{module.badge}</PortalStatusBadge>
                </div>

                {/* Прогресс */}
                <PortalProgressBar value={module.progress_percent} className="mb-2" />
                <div className="text-sm text-slate-500">{module.progress_label}</div>

                {/* Адаптивный бейдж: знакомые темы из диагностики */}
                {masteredCount > 0 && module.status !== "completed" ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <ZapIcon className="h-3 w-3" />
                    {masteredCount === 1
                      ? "1 урок знаком из диагностики"
                      : `${masteredCount} урока знакомо из диагностики`}
                  </div>
                ) : null}

                {/* Подсказка для заблокированных */}
                {module.status === "locked" ? (
                  <div className="mt-3 text-xs font-medium text-slate-400">
                    Сначала завершите предыдущий модуль
                  </div>
                ) : null}
              </>
            );

            if (module.status === "locked") {
              return (
                <div
                  key={module.id}
                  aria-disabled="true"
                  className={`rounded-xl border p-4 ${cardBorderClass(module.status)} ${cardHoverClass(module.status)}`}
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={module.id}
                to={`/modules/${module.id}`}
                className={`block rounded-xl border p-4 ${cardBorderClass(module.status)} ${cardHoverClass(module.status)}`}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </PortalWireframe>
    </PortalPanel>
  );
}
