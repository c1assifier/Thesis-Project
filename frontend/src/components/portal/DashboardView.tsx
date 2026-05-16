import { useNavigate } from "react-router-dom";

import type { MockAccount } from "../../services/mockAuth";
import type { PortalBootstrap } from "../../services/portalApi";
import { BookIcon, ChartIcon, ClockIcon, PlayIcon, TargetIcon } from "./PortalIcons";
import { PortalProgressBar } from "./PortalPrimitives";

const MAX_POINTS = 1000;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

function getLevelDescription(level: string): string {
  const normalized = level.toLowerCase();
  if (normalized.includes("нач")) return "Стартовый уровень — система даёт больше подсказок и простых заданий";
  if (normalized.includes("баз")) return "Базовый уровень — закрепляйте основы и переходите к практике";
  if (normalized.includes("сред")) return "Средний уровень — основы понятны, важна регулярная практика";
  if (normalized.includes("прод")) return "Продвинутый уровень — берите сложные темы и нестандартные задачи";
  return "Уровень рассчитывается по диагностике и решённым заданиям";
}

type LevelStyle = { dot: string; badge: string; badgeText: string };

function getLevelStyle(level: string): LevelStyle {
  const normalized = level.toLowerCase();
  if (normalized.includes("нач")) return { dot: "bg-blue-400", badge: "bg-blue-50 border-blue-100", badgeText: "text-blue-700" };
  if (normalized.includes("баз")) return { dot: "bg-emerald-400", badge: "bg-emerald-50 border-emerald-100", badgeText: "text-emerald-700" };
  if (normalized.includes("сред")) return { dot: "bg-amber-400", badge: "bg-amber-50 border-amber-100", badgeText: "text-amber-700" };
  if (normalized.includes("прод")) return { dot: "bg-violet-400", badge: "bg-violet-50 border-violet-100", badgeText: "text-violet-700" };
  return { dot: "bg-slate-400", badge: "bg-slate-50 border-slate-200", badgeText: "text-slate-700" };
}

export default function DashboardView({
  account,
  bootstrap,
}: {
  account: MockAccount;
  bootstrap: PortalBootstrap;
}) {
  const navigate = useNavigate();
  const { dashboard } = bootstrap;

  const points = Math.max(0, Math.min(MAX_POINTS, dashboard.profile.points));
  const pointsPercent = Math.round((points / MAX_POINTS) * 100);

  const hasLearningProgress =
    dashboard.stats.completed_modules > 0 ||
    dashboard.stats.solved_tasks > 0 ||
    dashboard.stats.progress_percent > 0;
  const hasRecommendations = hasLearningProgress && dashboard.recommendations.length > 0;

  const levelStyle = getLevelStyle(dashboard.profile.level);

  return (
    <div className="space-y-4">
      {/* ─── Main card ─── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.07)]">
        <div className="grid gap-0 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">

          {/* ── Sidebar ── */}
          <aside className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 p-6 lg:border-b-0 lg:border-r lg:border-slate-100">

            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-base font-bold tracking-wide text-white ring-4 ring-blue-100">
                  {getInitials(account.name)}
                </div>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Студент
                </p>
                <h1 className="mt-0.5 truncate text-base font-semibold text-slate-900">
                  {account.name}
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">Python — адаптивный курс</p>
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Level card */}
            <div className={`rounded-xl border p-4 ${levelStyle.badge} bg-white`}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${levelStyle.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Уровень
                  </span>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${levelStyle.badge} ${levelStyle.badgeText}`}
                >
                  {dashboard.profile.level}
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                {getLevelDescription(dashboard.profile.level)}
              </p>
            </div>

            {/* XP card */}
            <div className="rounded-xl border border-amber-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Баллы опыта
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {points.toLocaleString("ru-RU")}
                  <span className="ml-1 font-normal text-slate-400">
                    / {MAX_POINTS.toLocaleString("ru-RU")}
                  </span>
                </span>
              </div>
              <PortalProgressBar value={pointsPercent} className="h-1.5" color="amber" />
              <p className="mt-2 text-xs text-slate-400">
                накапливается за диагностику и практику
              </p>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex flex-col gap-5 p-6">

            {/* Header: title + CTA */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Ваш прогресс по курсу
                </h2>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">
                  Здесь видно, сколько материала закрыто, сколько задач решено и как идут первые попытки.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/course")}
                className="portal-button-primary shrink-0 self-start"
              >
                <PlayIcon className="mr-2 h-4 w-4" />
                Продолжить обучение
              </button>
            </div>

            {/* Progress bar block */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Завершено курса</p>
                  <p className="mt-0.5 text-xs text-slate-400">по завершённым модулям</p>
                </div>
                <span className="text-3xl font-bold tabular-nums text-blue-600">
                  {dashboard.stats.progress_percent}%
                </span>
              </div>
              <PortalProgressBar value={dashboard.stats.progress_percent} className="h-2" color="blue" />
            </div>

            {/* Stats grid */}
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Modules */}
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Модули
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <BookIcon className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {dashboard.stats.completed_modules}
                  <span className="ml-1 text-base font-normal text-slate-400">
                    / {dashboard.stats.total_modules}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">тем завершено</p>
              </div>

              {/* Practice */}
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Практика
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <TargetIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {dashboard.stats.solved_tasks}
                  <span className="ml-1 text-base font-normal text-slate-400">
                    / {dashboard.stats.total_tasks}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">задач решено</p>
              </div>

              {/* Accuracy */}
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Точность
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                    <ChartIcon className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {dashboard.stats.accuracy_percent}%
                </div>
                <p className="mt-1 text-xs text-slate-400">с первой попытки</p>
              </div>
            </div>

            {/* Recommendations */}
            {hasRecommendations && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100">
                    <TargetIcon className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Рекомендации</h3>
                </div>
                <div className="space-y-2">
                  {dashboard.recommendations.map((rec) => (
                    <div
                      key={rec.title}
                      className="rounded-lg border border-emerald-100 bg-white px-4 py-3 shadow-sm"
                    >
                      <p className="text-sm font-semibold text-slate-900">{rec.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity feed */}
            {dashboard.activity.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                <div className="mb-3 flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">Последняя активность</h3>
                </div>
                <ul className="space-y-1.5">
                  {dashboard.activity.map((item, idx) => (
                    <li
                      key={item.label}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${idx === 0 ? "bg-blue-500" : "bg-slate-300"}`}
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
