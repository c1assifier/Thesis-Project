import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { getAdaptiveModuleNextStep, getReadableError, type AdaptiveNextStepResponse } from "../../services/api";
import type { PortalModuleDetails } from "../../services/portalApi";
import { CheckCircleIcon, ChevronRightIcon, CircleIcon, CodeIcon, FileIcon, PlayIcon, TargetIcon } from "./PortalIcons";
import { PortalPanel, PortalProgressBar, PortalStatusBadge, PortalWireframe } from "./PortalPrimitives";

function ChecklistRow({ completed, title, href }: { completed: boolean; title: string; href?: string }) {
  const inner = (
    <div className="flex items-center justify-between rounded-xl border border-gray-300 bg-gray-50 p-2">
      <div className="flex items-center gap-2 text-sm">
        {completed ? <CheckCircleIcon className="h-4 w-4 text-green-600" /> : <CircleIcon className="h-4 w-4 text-gray-400" />}
        <span className={completed ? "text-gray-500" : "text-gray-800"}>{title}</span>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
    </div>
  );
  if (href) {
    return <Link to={href} className="block hover:opacity-80 transition-opacity">{inner}</Link>;
  }
  return inner;
}

type Props = {
  module: PortalModuleDetails;
  userId: number;
  adaptiveModuleStatus: string;
};

export default function ModuleDetailsView({ module, userId, adaptiveModuleStatus }: Props) {
  const navigate = useNavigate();
  const [nextStep, setNextStep] = useState<AdaptiveNextStepResponse | null>(null);
  const [splitError, setSplitError] = useState("");

  function openLearningFlow() {
    if (module.linked_course_id && module.linked_module_id && module.linked_lesson_id) {
      navigate(`/courses/${module.linked_course_id}/modules/${module.linked_module_id}/lessons/${module.linked_lesson_id}`);
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
    }
  });

  const showSplitButton = adaptiveModuleStatus === "struggling" || nextStep?.step === "simple_theory";

  function openMicroTestFlow() {
    if (!nextStep?.micro_test_id) {
      return;
    }
    navigate(
      `/diagnostic?adaptive_test_id=${nextStep.micro_test_id}&adaptive_type=micro&module_id=${module.id}`
    );
  }

  return (
    <PortalPanel className="mx-auto max-w-4xl p-6">
      <PortalWireframe className="space-y-4 p-6">
        <div className="border-b-2 border-gray-200 pb-4">
          <PortalStatusBadge status={module.status}>{module.badge}</PortalStatusBadge>
          <h1 className="mb-2 mt-2 text-lg font-semibold text-gray-900">{module.title}</h1>
          <PortalProgressBar value={module.progress_percent} className="mb-2" />
          <div className="text-sm text-gray-600">{module.progress_label}</div>
        </div>

        <div className="rounded-xl border border-blue-300 bg-blue-50 p-3">
          <div className="mb-1 flex items-center gap-2">
            <TargetIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">{module.adaptive_label}</span>
          </div>
          <div className="text-xs text-gray-600">{module.adaptive_description}</div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Теория</span>
          </div>
          <div className="space-y-2">
            {module.theory_items.map((item) => (
              <ChecklistRow
                key={item.title}
                completed={item.completed}
                title={item.title}
                href={
                  item.linked_lesson_id && module.linked_course_id && module.linked_module_id
                    ? `/courses/${module.linked_course_id}/modules/${module.linked_module_id}/lessons/${item.linked_lesson_id}`
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <CodeIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Практика</span>
          </div>
          <div className="space-y-2">
            {module.practice_items.map((item) => (
              <ChecklistRow
                key={item.title}
                completed={item.completed}
                title={item.title}
                href={
                  item.linked_lesson_id && module.linked_course_id && module.linked_module_id
                    ? `/courses/${module.linked_course_id}/modules/${module.linked_module_id}/lessons/${item.linked_lesson_id}`
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        <button type="button" onClick={openLearningFlow} className="portal-button-primary w-full">
          <PlayIcon className="mr-2 h-4 w-4" />
          {module.action_label}
        </button>

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

        {nextStep && (nextStep.step === "simple_theory" || adaptiveModuleStatus === "struggling") ? (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Упрощённое объяснение</p>
              <button
                type="button"
                onClick={() => setNextStep(null)}
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                Вернуться к обычному режиму
              </button>
            </div>
            <div className="space-y-2">
              {nextStep.simple_topics.map((topic) => (
                <div key={topic.topic_id} className="rounded-lg border border-amber-200 bg-white p-3">
                  <p className="text-sm font-semibold text-gray-800">{topic.title}</p>
                  {topic.simple_theory ? <p className="mt-2 text-sm text-gray-700">{topic.simple_theory}</p> : null}
                </div>
              ))}
            </div>

            {nextStep.micro_test_id ? (
              <button type="button" onClick={openMicroTestFlow} className="portal-button-primary w-full">
                Перейти к micro-test
              </button>
            ) : (
              <p className="text-xs text-gray-600">Micro-test пока недоступен для этого модуля.</p>
            )}
          </div>
        ) : null}
      </PortalWireframe>
    </PortalPanel>
  );
}
