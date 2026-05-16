import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { getAdaptiveModuleNextStep, getReadableError, type AdaptiveNextStepResponse } from "../../services/api";
import type { PortalChecklistItem, PortalModuleDetails } from "../../services/portalApi";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  CircleIcon,
  CodeIcon,
  FileIcon,
  PlayIcon,
  TargetIcon,
} from "./PortalIcons";
import { PortalPanel, PortalProgressBar, PortalStatusBadge, PortalWireframe } from "./PortalPrimitives";

// ── Иконка молнии (знакомо из диагностики) ─────────────────────────────────
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

// ── Строка чеклиста ─────────────────────────────────────────────────────────
function ChecklistRow({
  item,
  href,
}: {
  item: PortalChecklistItem;
  href?: string;
}) {
  const { completed, known_from_diagnostic: known, title } = item;

  /**
   * Три состояния строки:
   *  1. completed          — зелёная галочка, приглушённый текст
   *  2. known_from_diagnostic (но не completed) — янтарный фон, бейдж «из диагностики»
   *  3. обычное            — серый кружок, нейтральный стиль
   */
  const rowStyle = completed
    ? "border-slate-200 bg-slate-50"
    : known
      ? "border-amber-200 bg-amber-50/70 ring-1 ring-amber-100"
      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50";

  const inner = (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-colors ${rowStyle}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Статус иконки */}
        {completed ? (
          <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : known ? (
          <ZapIcon className="h-4 w-4 shrink-0 text-amber-500" />
        ) : (
          <CircleIcon className="h-4 w-4 shrink-0 text-slate-300" />
        )}

        {/* Название */}
        <span
          className={`truncate text-sm ${
            completed
              ? "text-slate-400 line-through"
              : known
                ? "font-medium text-slate-800"
                : "text-slate-700"
          }`}
        >
          {title}
        </span>

        {/* Бейдж «Знаю из диагностики» — только если не completed */}
        {known && !completed ? (
          <span className="ml-1 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Знаю
          </span>
        ) : null}
      </div>

      <ChevronRightIcon className="ml-2 h-4 w-4 shrink-0 text-slate-300" />
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ── Главный компонент ───────────────────────────────────────────────────────
type Props = {
  module: PortalModuleDetails;
  userId: number;
  adaptiveModuleStatus: string;
};

export default function ModuleDetailsView({ module, userId, adaptiveModuleStatus }: Props) {
  const navigate = useNavigate();
  const [nextStep, setNextStep] = useState<AdaptiveNextStepResponse | null>(null);
  const [splitError, setSplitError] = useState("");

  // Считаем сколько теоретических тем знакомо из диагностики (не завершено)
  const knownTheoryCount = module.theory_items.filter(
    (i) => i.known_from_diagnostic && !i.completed
  ).length;

  function openLearningFlow() {
    if (module.linked_course_id && module.linked_module_id && module.linked_lesson_id) {
      navigate(
        `/courses/${module.linked_course_id}/modules/${module.linked_module_id}/lessons/${module.linked_lesson_id}`
      );
      return;
    }
    navigate("/course");
  }

  const simplifyMutation = useMutation({
    mutationFn: () => getAdaptiveModuleNextStep(userId, module.id),
    onSuccess: (payload) => {
      setSplitError("");
      setNextStep(payload);
    },
    onError: (error) => {
      setSplitError(getReadableError(error, "Не удалось получить упрощённый режим."));
    },
  });

  const showSplitButton =
    adaptiveModuleStatus === "struggling" || nextStep?.step === "simple_theory";

  function openMicroTestFlow() {
    if (!nextStep?.micro_test_id) return;
    navigate(
      `/diagnostic?adaptive_test_id=${nextStep.micro_test_id}&adaptive_type=micro&module_id=${module.id}`
    );
  }

  function getLessonHref(item: PortalChecklistItem) {
    return item.linked_lesson_id && module.linked_course_id && module.linked_module_id
      ? `/courses/${module.linked_course_id}/modules/${module.linked_module_id}/lessons/${item.linked_lesson_id}`
      : undefined;
  }

  return (
    <PortalPanel className="mx-auto max-w-4xl p-6">
      <PortalWireframe className="space-y-4 p-6">

        {/* Заголовок модуля */}
        <div className="border-b border-slate-200 pb-4">
          <PortalStatusBadge status={module.status}>{module.badge}</PortalStatusBadge>
          <h1 className="mb-2 mt-2 text-lg font-semibold text-slate-900">{module.title}</h1>
          <PortalProgressBar value={module.progress_percent} className="mb-2" />
          <div className="text-sm text-slate-500">{module.progress_label}</div>
        </div>

        {/* Адаптивный блок */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
          <div className="mb-1 flex items-center gap-2">
            <TargetIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">{module.adaptive_label}</span>
          </div>
          <div className="text-xs text-slate-600">{module.adaptive_description}</div>
        </div>

        {/* Адаптивная подсказка: знакомые темы */}
        {knownTheoryCount > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <ZapIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {knownTheoryCount === 1
                  ? "1 тема знакома по результатам диагностики"
                  : `${knownTheoryCount} темы знакомы по результатам диагностики`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Отмеченные темы связаны с навыками, которые ты уже показал на входном тесте.
                Их можно пройти быстрее или использовать как повторение.
              </p>
            </div>
          </div>
        ) : null}

        {/* Теория */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Теория</span>
          </div>
          <div className="space-y-2">
            {module.theory_items.map((item) => (
              <ChecklistRow key={item.title} item={item} href={getLessonHref(item)} />
            ))}
          </div>
        </div>

        {/* Практика */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CodeIcon className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Практика</span>
          </div>
          <div className="space-y-2">
            {module.practice_items.map((item) => (
              <ChecklistRow key={item.title} item={item} href={getLessonHref(item)} />
            ))}
          </div>
        </div>

        {/* Основная кнопка действия */}
        <button type="button" onClick={openLearningFlow} className="portal-button-primary w-full">
          <PlayIcon className="mr-2 h-4 w-4" />
          {module.action_label}
        </button>

        {/* Кнопка упрощённого объяснения */}
        {showSplitButton ? (
          <button
            type="button"
            onClick={() => simplifyMutation.mutate()}
            disabled={simplifyMutation.isPending}
            className="portal-button-secondary w-full"
          >
            {simplifyMutation.isPending ? "Загрузка..." : "Не понял? Объяснить проще"}
          </button>
        ) : null}

        {splitError ? <div className="text-sm text-red-600">{splitError}</div> : null}

        {/* Упрощённый режим */}
        {nextStep && (nextStep.step === "simple_theory" || adaptiveModuleStatus === "struggling") ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Упрощённое объяснение</p>
              <button
                type="button"
                onClick={() => setNextStep(null)}
                className="text-xs text-slate-500 underline hover:text-slate-700"
              >
                Вернуться к обычному режиму
              </button>
            </div>
            <div className="space-y-2">
              {nextStep.simple_topics.map((topic) => (
                <div key={topic.topic_id} className="rounded-lg border border-amber-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-800">{topic.title}</p>
                  {topic.simple_theory ? (
                    <p className="mt-2 text-sm text-slate-600">{topic.simple_theory}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {nextStep.micro_test_id ? (
              <button type="button" onClick={openMicroTestFlow} className="portal-button-primary w-full">
                Перейти к micro-test
              </button>
            ) : (
              <p className="text-xs text-slate-500">Micro-test пока недоступен для этого модуля.</p>
            )}
          </div>
        ) : null}
      </PortalWireframe>
    </PortalPanel>
  );
}
