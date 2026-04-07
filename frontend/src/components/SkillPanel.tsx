import type { ProgressResponse, User } from "../services/api";

type Props = {
  user: User | null;
  progress: ProgressResponse | null;
  isLoading?: boolean;
};

function skillLabel(skillName: string): string {
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
  return labels[skillName] ?? skillName.replaceAll("_", " ");
}

export default function SkillPanel({ user, progress, isLoading = false }: Props) {
  const skills = [...(progress?.skill_scores ?? [])].sort((a, b) => b.skill_score - a.skill_score);
  const successRate = Math.round((progress?.success_rate ?? 0) * 100);

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <section className="edu-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Студент</p>
        <h2 className="mt-2 text-xl font-semibold text-text">{user?.name ?? "Не выбран"}</h2>
        {!user ? (
          <p className="mt-2 text-sm text-muted">Зарегистрируйте студента на главной странице, чтобы видеть адаптивный прогресс.</p>
        ) : null}
      </section>

      <section className="edu-panel p-5">
        <h2 className="edu-section-title">Прогресс</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted">Загрузка прогресса...</p>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Решено упражнений</span>
              <span className="font-semibold text-text">{progress?.completed_exercises ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Завершено модулей</span>
              <span className="font-semibold text-text">
                {progress?.completed_modules ?? 0}/{progress?.total_modules ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Освоено тем</span>
              <span className="font-semibold text-text">
                {progress?.completed_topics ?? 0}/{progress?.total_topics ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Всего отправок</span>
              <span className="font-semibold text-text">{progress?.total_submissions ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Успешность</span>
              <span className="font-semibold text-text">{successRate}%</span>
            </div>
          </div>
        )}
      </section>

      <section className="edu-panel p-5">
        <h2 className="edu-section-title">Навыки</h2>
        {skills.length === 0 ? (
          <p className="mt-3 text-sm text-muted">После первых решений здесь появятся адаптивные оценки навыков.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {skills.map((skill) => {
              const score = Math.max(0, Math.min(100, Math.round(skill.skill_score * 100)));
              return (
                <div key={skill.skill_name}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-700">
                    <span>{skillLabel(skill.skill_name)}</span>
                    <span className="font-medium text-text">
                      {score}% • {skill.skill_level}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </aside>
  );
}
