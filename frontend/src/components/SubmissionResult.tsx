import type { SubmitResponse } from "../services/api";

type Props = {
  result: SubmitResponse | null;
  hint: string;
  error: string;
  onNext: () => void;
  autoRedirect: boolean;
};

export default function SubmissionResult({ result, hint, error, onNext, autoRedirect }: Props) {
  return (
    <section className="edu-panel p-6">
      <h2 className="edu-section-title">Результат проверки</h2>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {result ? (
        <div className="mt-5 space-y-4">
          <div className={`rounded-lg px-4 py-3 text-sm ${result.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            <p className="font-semibold">{result.passed ? "Все тесты пройдены" : "Часть тестов не пройдена"}</p>
            <p className="mt-1">{result.feedback}</p>
            <p className="mt-1">Попытка: {result.submission.attempts}</p>
            <p className="mt-1">Время выполнения: {result.execution_time.toFixed(3)} сек.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-text">stdout</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm text-slate-700">{result.stdout || "Нет вывода"}</pre>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-text">stderr</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm text-slate-700">{result.stderr || "Ошибок нет"}</pre>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-text">Рекомендация системы</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {result.recommendation || "Продолжайте решать задания. После накопления результатов система уточнит рекомендацию."}
            </p>
          </div>

          {result.next_exercise_id ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Следующее задание
              </button>
              {autoRedirect ? <p className="text-sm text-muted">Переход к следующему заданию выполняется автоматически...</p> : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">После запуска кода здесь появятся stdout, stderr и feedback.</p>
      )}

      {hint ? (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-primary">Подсказка</p>
          <p className="mt-1">{hint}</p>
        </div>
      ) : null}
    </section>
  );
}
