import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getReadableError, requestExplain, type TopicContent } from "../services/api";

type Props = {
  topic: TopicContent;
  practiceHref?: string;
};

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function buildTheorySource(topic: TopicContent): string {
  return topic.theory_blocks
    .map((block) => `${block.title}\n${block.content}`)
    .join("\n\n")
    .trim();
}

function buildSimplifiedSource(topic: TopicContent): string {
  return topic.theory_blocks
    .map((block) => block.simplified_content.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function formatSkillName(skillName: string): string {
  const labels: Record<string, string> = {
    variables: "Переменные",
    conditions: "Условия",
    loops: "Циклы",
    strings: "Строки",
    lists: "Списки",
    dictionaries: "Словари",
    functions: "Функции",
    files: "Файлы",
    exceptions: "Исключения",
    oop: "ООП"
  };
  return labels[skillName] ?? skillName;
}

export default function TheoryBlock({ topic, practiceHref }: Props) {
  const [isSimplifiedOpen, setIsSimplifiedOpen] = useState(false);
  const [simplifiedText, setSimplifiedText] = useState("");
  const theorySource = useMemo(() => buildTheorySource(topic), [topic]);
  const builtInSimplifiedText = useMemo(() => buildSimplifiedSource(topic), [topic]);
  const exerciseCount = topic.exercises.length;
  const explainMutation = useMutation({
    mutationFn: () => requestExplain(topic.id, 2, theorySource),
    onSuccess: (result) => {
      setSimplifiedText(result.text);
    },
    onError: (explainError) => {
      setSimplifiedText(getReadableError(explainError, "Не удалось получить объяснение."));
    }
  });

  const effectiveSimplifiedText = simplifiedText || builtInSimplifiedText;

  function openSimplifiedMode() {
    setIsSimplifiedOpen(true);
    if (!builtInSimplifiedText && !simplifiedText && !explainMutation.isPending) {
      explainMutation.mutate();
    }
  }

  return (
    <>
      <article className="edu-panel p-8">
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Тема {topic.order_index}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">{topic.title}</h2>
              <p className="mt-3 text-sm text-muted">
                Сложность: {topic.difficulty}. Навык: {formatSkillName(topic.skill_name)}.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
              Практика: {exerciseCount}
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {topic.theory_blocks.length > 0 ? (
            topic.theory_blocks.map((block, index) => {
              const paragraphs = splitParagraphs(block.content);
              const codeSnippets = paragraphs.filter((paragraph) => paragraph.includes("def ") || paragraph.includes("print("));
              const plainParagraphs = paragraphs.filter((paragraph) => !codeSnippets.includes(paragraph));

              return (
                <section key={block.id} className={index > 0 ? "border-t border-slate-200 pt-8" : ""}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold tracking-tight text-text">{block.title}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-600">
                      {block.block_type}
                    </span>
                  </div>
                  <div className="mt-4 space-y-5">
                    {plainParagraphs.map((paragraph, paragraphIndex) => (
                      <p key={`${block.id}-${paragraphIndex}`} className="text-lg leading-8 text-slate-800">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {codeSnippets.length > 0 ? (
                    <div className="mt-6 space-y-4">
                      {codeSnippets.map((snippet, snippetIndex) => (
                        <pre
                          key={`${block.id}-code-${snippetIndex}`}
                          className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm leading-6 text-slate-100"
                        >
                          <code>{snippet}</code>
                        </pre>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })
          ) : (
            <p className="text-base leading-8 text-slate-700">Теория пока не добавлена для этой темы.</p>
          )}
        </div>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Следующий шаг</p>
          <h3 className="mt-2 text-xl font-semibold text-text">После теории переходите к практике</h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Для этой темы доступно {exerciseCount} {exerciseCount === 1 ? "упражнение" : exerciseCount < 5 ? "упражнения" : "упражнений"}.
            Если нужен более мягкий вход, сначала откройте упрощённый режим.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openSimplifiedMode}
              disabled={explainMutation.isPending && !builtInSimplifiedText}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-text transition hover:bg-white disabled:opacity-60"
            >
              {explainMutation.isPending && !builtInSimplifiedText ? "Готовим упрощённый режим..." : "Нужна помощь по теме"}
            </button>
            {practiceHref ? (
              <Link
                to={practiceHref}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Перейти к практике темы
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">
                Практика недоступна
              </span>
            )}
          </div>
        </section>
      </article>

      {isSimplifiedOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Упрощённый режим</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text">{topic.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  В текущей базе для этой темы есть краткая теория, но нет отдельного набора специальных mini-упражнений. Поэтому после
                  упрощённого объяснения вы перейдёте в обычную практику темы.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSimplifiedOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-text hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <h4 className="text-base font-semibold text-primary">Простое объяснение</h4>
              {effectiveSimplifiedText ? (
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{effectiveSimplifiedText}</p>
              ) : explainMutation.isPending ? (
                <p className="mt-3 text-sm text-slate-600">Получаем упрощённое объяснение...</p>
              ) : (
                <p className="mt-3 text-sm text-slate-600">Для этой темы краткая версия пока не подготовлена.</p>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-base font-semibold text-text">Как пройти тему мягче</h4>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                <p>1. Прочитайте короткую версию темы.</p>
                <p>2. Откройте первое упражнение темы и используйте его как тренировочный вход.</p>
                <p>3. После решения продолжайте основной практический путь урока.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {practiceHref ? (
                <Link
                  to={practiceHref}
                  onClick={() => setIsSimplifiedOpen(false)}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Открыть первое упражнение темы
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setIsSimplifiedOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-text hover:bg-slate-50"
              >
                Вернуться к основному уроку
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
