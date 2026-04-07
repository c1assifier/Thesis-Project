import Editor from "@monaco-editor/react";

import type { Exercise } from "../services/api";

type Props = {
  exercise: Exercise;
  code: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onHint: () => void;
  isRunning: boolean;
  isHintLoading: boolean;
};

export default function EditorPanel({ exercise, code, onChange, onRun, onHint, isRunning, isHintLoading }: Props) {
  return (
    <section className="edu-panel overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Практика</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">{exercise.title}</h1>
        <p className="mt-2 text-sm leading-7 text-slate-700">{exercise.description}</p>
      </div>

      <Editor
        height="520px"
        defaultLanguage="python"
        theme="vs-light"
        value={code}
        onChange={(value) => onChange(value ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 15,
          lineHeight: 22,
          scrollBeyondLastLine: false,
          padding: { top: 16 }
        }}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isRunning ? "Проверка..." : "Run Code / Решить задание"}
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={isHintLoading}
          className="inline-flex items-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-text transition hover:bg-slate-50 disabled:opacity-60"
        >
          {isHintLoading ? "Загрузка..." : "Показать подсказку"}
        </button>
      </div>
    </section>
  );
}
