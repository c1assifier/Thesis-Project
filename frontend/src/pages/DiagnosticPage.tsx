import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import SkillPanel from "../components/SkillPanel";
import {
  getActiveDiagnosticTest,
  getDiagnosticTestById,
  getProgress,
  getReadableError,
  submitAdaptiveMicroTest,
  submitAdaptiveModuleTest,
  submitDiagnosticTest,
  type User
} from "../services/api";
import { getStoredUser, saveStoredUser } from "../services/userSession";

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const adaptiveTestIdRaw = searchParams.get("adaptive_test_id");
  const adaptiveTypeRaw = searchParams.get("adaptive_type");
  const adaptiveModuleIdRaw = searchParams.get("module_id");
  const adaptiveTestId = adaptiveTestIdRaw ? Number(adaptiveTestIdRaw) : null;
  const adaptiveModuleId = adaptiveModuleIdRaw ? Number(adaptiveModuleIdRaw) : null;
  const adaptiveType =
    adaptiveTypeRaw === "micro" || adaptiveTypeRaw === "module" ? adaptiveTypeRaw : null;
  const isAdaptiveFlow = adaptiveTestId !== null && Number.isFinite(adaptiveTestId) && adaptiveType !== null;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const diagnosticQuery = useQuery({
    queryKey: ["diagnostic-test", isAdaptiveFlow ? adaptiveTestId : "active"],
    queryFn: () => (isAdaptiveFlow ? getDiagnosticTestById(adaptiveTestId as number) : getActiveDiagnosticTest()),
    enabled: user !== null
  });

  const progressQuery = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => getProgress((user as User).id),
    enabled: user !== null
  });

  const answeredCount = useMemo(
    () => Object.values(selectedAnswers).filter((item) => item.trim().length > 0).length,
    [selectedAnswers]
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !diagnosticQuery.data) {
        throw new Error("Диагностика недоступна без авторизованного пользователя.");
      }

      const answers = diagnosticQuery.data.questions.map((question) => ({
        question_id: question.id,
        selected_answer: selectedAnswers[question.id] ?? ""
      }));
      if (isAdaptiveFlow && adaptiveType === "micro") {
        return submitAdaptiveMicroTest(diagnosticQuery.data.id, user.id, answers);
      }
      if (isAdaptiveFlow && adaptiveType === "module") {
        return submitAdaptiveModuleTest(diagnosticQuery.data.id, user.id, answers);
      }
      return submitDiagnosticTest(diagnosticQuery.data.id, user.id, answers);
    },
    onSuccess: async (payload) => {
      setError("");
      if (!isAdaptiveFlow && user) {
        saveStoredUser({
          ...user,
          diagnostic_completed: true
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["progress", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["adaptive-path", user?.id] });
      if (!isAdaptiveFlow) {
        await queryClient.invalidateQueries({ queryKey: ["portal-bootstrap", user?.id] });
      }
      if (isAdaptiveFlow) {
        navigate(adaptiveModuleId ? `/modules/${adaptiveModuleId}` : "/course");
        return;
      }
      window.sessionStorage.setItem("diagnostic_result", JSON.stringify(payload));
      navigate("/diagnostic/result");
    },
    onError: (mutationError) => {
      setError(getReadableError(mutationError, "Не удалось отправить диагностику."));
    }
  });

  if (!user) {
    return (
      <div className="edu-panel p-6">
        <p className="text-sm text-muted">Сначала зарегистрируйте студента на главной странице.</p>
        <Link to="/" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
          Перейти на главную
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-6">
        <div className="edu-panel p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Link to="/" className="font-medium text-primary hover:underline">
              Главная
            </Link>
            <span>→</span>
            <span>Диагностика по курсу</span>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Диагностика</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">
            {diagnosticQuery.data?.title ?? "Загрузка диагностики..."}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            {diagnosticQuery.data?.description ?? "Получаем вопросы и формируем профиль освоения курса."}
          </p>
        </div>

        {diagnosticQuery.data ? (
          <div className="space-y-4">
            {diagnosticQuery.data.questions.map((question, index) => (
              <article key={question.id} className="edu-panel p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Вопрос {index + 1} / {diagnosticQuery.data.total_questions}
                </p>
                <p className="mt-2 text-base font-medium text-text">{question.question_text}</p>
                {question.code_snippet ? (
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-100">
                    <code>{question.code_snippet}</code>
                  </pre>
                ) : null}

                <div className="mt-4 space-y-2">
                  {question.options.map((option) => {
                    const selected = selectedAnswers[question.id] === option;
                    return (
                      <label
                        key={`${question.id}-${option}`}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          selected ? "border-primary bg-blue-50 text-text" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={selected}
                          onChange={() => {
                            setSelectedAnswers((prev) => ({ ...prev, [question.id]: option }));
                          }}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </article>
            ))}

            <div className="edu-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Отмечено ответов: <span className="font-semibold text-text">{answeredCount}</span> из{" "}
                  {diagnosticQuery.data.total_questions}
                </p>
                <button
                  type="button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || answeredCount !== diagnosticQuery.data.total_questions}
                  className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitMutation.isPending ? "Проверка..." : isAdaptiveFlow ? "Завершить тест" : "Завершить диагностику"}
                </button>
              </div>
              {answeredCount !== diagnosticQuery.data.total_questions ? (
                <p className="mt-2 text-xs text-amber-700">Ответьте на все вопросы, чтобы завершить диагностику.</p>
              ) : null}
              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </div>
          </div>
        ) : (
          <div className="edu-panel p-6 text-sm text-muted">{diagnosticQuery.isLoading ? "Загрузка диагностики..." : "Не удалось загрузить диагностику."}</div>
        )}
      </section>

      <SkillPanel user={user} progress={progressQuery.data ?? null} isLoading={progressQuery.isLoading} />
    </div>
  );
}
