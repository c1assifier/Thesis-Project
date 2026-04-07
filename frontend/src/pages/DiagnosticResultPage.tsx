import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import SkillPanel from "../components/SkillPanel";
import { getProgress, type DiagnosticSubmitResult, type User } from "../services/api";
import { getStoredUser } from "../services/userSession";

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

export default function DiagnosticResultPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [result, setResult] = useState<DiagnosticSubmitResult | null>(null);

  const progressQuery = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => getProgress((user as User).id),
    enabled: user !== null
  });

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("diagnostic_result");
      if (!raw) {
        return;
      }
      setResult(JSON.parse(raw) as DiagnosticSubmitResult);
    } catch {
      setResult(null);
    }
  }, []);

  if (!user) {
    return (
      <div className="edu-panel p-6">
        <p className="text-sm text-muted">Сессия пользователя не найдена. Сначала выполните регистрацию.</p>
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
            <span>Результат диагностики</span>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Диагностика завершена</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Профиль диагностики по курсу</h1>
        </div>

        {result ? (
          <section className="edu-panel p-6">
            <h2 className="edu-section-title">Результат диагностики по курсу</h2>
            <p className="mt-3 text-sm text-muted">
              Верно: {result.correct_answers} из {result.total_questions}. Общий балл: {(result.overall_score * 100).toFixed(0)}%.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{result.recommendation}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.skill_scores.map((skill) => (
                <div key={skill.skill_name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-text">{skillLabel(skill.skill_name)}</p>
                  <p className="mt-1 text-sm text-muted">
                    {skill.correct_answers}/{skill.total_questions} • {Math.round(skill.diagnostic_score * 100)}% • {skill.skill_level}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="edu-panel p-6">
            <p className="text-sm text-muted">
              Детальный результат не найден в текущей сессии, но диагностика сохранена. Можно продолжить обучение.
            </p>
          </section>
        )}

        <div className="edu-panel p-5">
          <div className="flex flex-wrap gap-3">
            <Link to="/diagnostic" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-text hover:bg-slate-50">
              Пройти снова
            </Link>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Продолжить обучение
            </button>
          </div>
        </div>
      </section>

      <SkillPanel user={user} progress={progressQuery.data ?? null} isLoading={progressQuery.isLoading} />
    </div>
  );
}
