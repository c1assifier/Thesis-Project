import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { githubLight } from "@uiw/codemirror-theme-github";
import { EditorView } from "@codemirror/view";

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

const editorTheme = EditorView.theme({
  "&": { fontSize: "15px" },
  ".cm-content": { padding: "16px 0", lineHeight: "22px" },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

export default function EditorPanel({ exercise, code, onChange, onRun, onHint, isRunning, isHintLoading }: Props) {
  return (
    <section className="edu-panel overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Практика</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">{exercise.title}</h1>
        <p className="mt-2 text-sm leading-7 text-slate-700">{exercise.description}</p>
      </div>

      <CodeMirror
        value={code}
        height="520px"
        extensions={[python(), editorTheme]}
        theme={githubLight}
        onChange={(value) => onChange(value)}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightActiveLine: true,
          highlightSelectionMatches: false,
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
