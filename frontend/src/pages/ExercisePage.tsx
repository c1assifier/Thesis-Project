import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import EditorPanel from "../components/EditorPanel";
import SkillPanel from "../components/SkillPanel";
import SubmissionResult from "../components/SubmissionResult";
import {
  getLessonContent,
  getProgress,
  getReadableError,
  primeExerciseRouteCache,
  requestHint,
  submitSolution,
  type SubmitResponse,
  type User
} from "../services/api";
import { getStoredUser } from "../services/userSession";

export default function ExercisePage() {
  const { courseId = "", moduleId = "", lessonId = "", exerciseId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getStoredUser();

  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [autoRedirect, setAutoRedirect] = useState(false);
  const redirectTimerRef = useRef<number | null>(null);

  const lessonQuery = useQuery({
    queryKey: ["lesson-content", lessonId],
    queryFn: () => getLessonContent(lessonId),
    enabled: Boolean(lessonId)
  });

  const progressQuery = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => getProgress((user as User).id),
    enabled: user !== null
  });

  useEffect(() => {
    if (!lessonQuery.data) {
      return;
    }
    const parsedCourseId = Number(courseId);
    const parsedModuleId = Number(moduleId);
    if (Number.isFinite(parsedCourseId) && Number.isFinite(parsedModuleId)) {
      primeExerciseRouteCache(parsedCourseId, parsedModuleId, lessonQuery.data);
    }
  }, [courseId, lessonQuery.data, moduleId]);

  const topicAndExercise = useMemo(() => {
    for (const topic of lessonQuery.data?.topics ?? []) {
      const exercise = topic.exercises.find((item) => String(item.id) === exerciseId);
      if (exercise) {
        return { topic, exercise };
      }
    }
    return null;
  }, [exerciseId, lessonQuery.data?.topics]);

  useEffect(() => {
    if (!topicAndExercise?.exercise) {
      return;
    }
    setCode(topicAndExercise.exercise.starter_code);
    setHint("");
    setError("");
    setResult(null);
    setAutoRedirect(false);
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, [topicAndExercise?.exercise]);

  useEffect(
    () => () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    },
    []
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !topicAndExercise?.exercise) {
        throw new Error("Сначала зарегистрируйте студента и выберите упражнение.");
      }
      return submitSolution(user.id, topicAndExercise.exercise.id, code);
    },
    onSuccess: async (response) => {
      setResult(response);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["progress", user?.id] });

      if (response.next_exercise_id) {
        setAutoRedirect(true);
        redirectTimerRef.current = window.setTimeout(() => {
          navigate(`/exercise/${response.next_exercise_id}`);
        }, 1800);
      } else {
        setAutoRedirect(false);
      }
    },
    onError: (mutationError) => {
      setError(getReadableError(mutationError, "Не удалось отправить решение."));
    }
  });

  const hintMutation = useMutation({
    mutationFn: async () => {
      if (!user || !topicAndExercise?.exercise) {
        throw new Error("Подсказка недоступна без выбранного упражнения.");
      }
      return requestHint(user.id, topicAndExercise.exercise.id, result?.stderr ?? "");
    },
    onSuccess: (response) => {
      setHint(response.hint);
      setError("");
    },
    onError: (mutationError) => {
      setError(getReadableError(mutationError, "Не удалось получить подсказку."));
    }
  });

  const onNext = () => {
    if (result?.next_exercise_id) {
      navigate(`/exercise/${result.next_exercise_id}`);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-6">
        <div className="edu-panel p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Link to="/course" className="font-medium text-primary hover:underline">
              Курс
            </Link>
            <span>→</span>
            <Link to={`/courses/${courseId}/modules/${moduleId}`} className="font-medium text-primary hover:underline">
              Модуль
            </Link>
            <span>→</span>
            <Link to={`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`} className="font-medium text-primary hover:underline">
              Урок
            </Link>
            <span>→</span>
            <span>Практика</span>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Задание</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">{topicAndExercise?.exercise.title ?? "Загрузка задания..."}</h1>
          <p className="mt-2 text-sm text-muted">
            Тема: {topicAndExercise?.topic.title ?? "—"}.
            <span className="ml-2">
              <Link
                to={`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`}
                className="font-medium text-primary hover:underline"
              >
                Назад к теории
              </Link>
            </span>
          </p>
        </div>

        {lessonQuery.isError ? (
          <div className="edu-panel border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Не удалось загрузить урок: {getReadableError(lessonQuery.error, "ошибка запроса")}
          </div>
        ) : null}

        {topicAndExercise?.exercise ? (
          <>
            <EditorPanel
              exercise={topicAndExercise.exercise}
              code={code}
              onChange={setCode}
              onRun={() => submitMutation.mutate()}
              onHint={() => hintMutation.mutate()}
              isRunning={submitMutation.isPending}
              isHintLoading={hintMutation.isPending}
            />
            <SubmissionResult result={result} hint={hint} error={error} onNext={onNext} autoRedirect={autoRedirect} />
          </>
        ) : (
          <div className="edu-panel p-6 text-sm text-muted">Упражнение не найдено. Проверьте маршрут или откройте урок заново.</div>
        )}
      </section>

      <SkillPanel user={user} progress={progressQuery.data ?? null} isLoading={progressQuery.isLoading} />
    </div>
  );
}
