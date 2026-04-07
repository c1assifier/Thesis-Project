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

function skillLabel(skillName: string): string {
  const labels: Record<string, string> = {
    variables: "Переменные",
    conditions: "Условия",
    loops: "Циклы",
    strings: "Строки",
    lists: "Списки",
    functions: "Функции"
  };
  return labels[skillName] ?? skillName;
}

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
  const diagnosticAverage = useMemo(() => {
    const skillScores = progressQuery.data?.skill_scores ?? [];
    if (skillScores.length === 0) {
      return 0;
    }
    const total = skillScores.reduce((sum, skill) => sum + skill.diagnostic_score, 0);
    return Math.round((total / skillScores.length) * 100);
  }, [progressQuery.data?.skill_scores]);
  const shouldLockBaseDiagnostic = !isAdaptiveFlow && progressQuery.data?.diagnostic_completed === true;
  const shouldWaitForBaseDiagnosticStatus = !isAdaptiveFlow && progressQuery.isLoading && !progressQuery.data;

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
            {shouldLockBaseDiagnostic ? "Статистика стартовой диагностики" : diagnosticQuery.data?.title ?? "Загрузка диагностики..."}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            {shouldLockBaseDiagnostic
              ? "Базовый диагностический тест уже завершён. Ниже сохранены итоговые показатели по навыкам и текущему уровню подготовки."
              : diagnosticQuery.data?.description ?? "Получаем вопросы и формируем профиль освоения курса."}
          </p>
        </div>

        {shouldWaitForBaseDiagnosticStatus ? (
          <div className="edu-panel p-6 text-sm text-muted">Проверяем статус диагностики...</div>
        ) : shouldLockBaseDiagnostic ? (
          <div className="space-y-4">
            <section className="edu-panel border-emerald-200 bg-emerald-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Диагностика уже завершена</p>
              <h2 className="mt-2 text-2xl font-semibold text-emerald-950">Повторное прохождение закрыто</h2>
              <p className="mt-3 text-sm leading-7 text-emerald-900">
                Базовый диагностический тест уже сохранён в вашем профиле. Эта вкладка теперь показывает только статистику по стартовой
                диагностике и текущему уровню навыков.
              </p>
            </section>

            <section className="edu-panel p-6">
              <h2 className="edu-section-title">Статистика диагностики</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-muted">Диагностика</p>
                  <p className="mt-2 text-2xl font-semibold text-text">Завершена</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-muted">Средний балл по навыкам</p>
                  <p className="mt-2 text-2xl font-semibold text-text">{diagnosticAverage}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-muted">Статус доступа</p>
                  <p className="mt-2 text-2xl font-semibold text-text">Курс открыт</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {(progressQuery.data?.skill_scores ?? []).map((skill) => (
                  <div key={skill.skill_name} className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-text">{skillLabel(skill.skill_name)}</p>
                    <p className="mt-1 text-sm text-muted">
                      Диагностика: {Math.round(skill.diagnostic_score * 100)}% • Итоговый уровень: {skill.skill_level}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/diagnostic/result" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-text hover:bg-slate-50">
                  Открыть экран результата
                </Link>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Продолжить обучение
                </button>
              </div>
            </section>
          </div>
        ) : diagnosticQuery.data ? (
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
