import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getReadableError, requestExplain, type ExplainLevel, type TopicContent } from "../services/api";

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
  const [explainText, setExplainText] = useState("");
  const theorySource = useMemo(() => buildTheorySource(topic), [topic]);
  const explainMutation = useMutation({
    mutationFn: (level: ExplainLevel) => requestExplain(topic.id, level, theorySource),
    onSuccess: (result) => {
      setExplainText(result.text);
    },
    onError: (explainError) => {
      setExplainText(getReadableError(explainError, "Не удалось получить объяснение."));
    }
  });

  return (
    <article className="edu-panel p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Тема {topic.order_index}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text">{topic.title}</h2>
          <p className="mt-3 text-sm text-muted">
            Сложность: {topic.difficulty}. Навык: {formatSkillName(topic.skill_name)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => explainMutation.mutate(2)}
            disabled={explainMutation.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-text transition hover:bg-slate-50 disabled:opacity-60"
          >
            Объяснить проще
          </button>
          <button
            type="button"
            onClick={() => explainMutation.mutate(3)}
            disabled={explainMutation.isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-text transition hover:bg-slate-50 disabled:opacity-60"
          >
            Объяснить как ребёнку
          </button>
          {practiceHref ? (
            <Link
              to={practiceHref}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Перейти к заданию
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
              Упражнение недоступно
            </span>
          )}
        </div>
      </div>

      {explainText ? (
        <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="text-base font-semibold text-primary">Упрощённое объяснение</h3>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{explainText}</p>
        </section>
      ) : null}

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
    </article>
  );
}
