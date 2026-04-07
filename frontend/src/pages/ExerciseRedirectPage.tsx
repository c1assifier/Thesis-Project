import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { resolveExerciseRoute } from "../services/api";

export default function ExerciseRedirectPage() {
  const { exerciseId = "" } = useParams();
  const navigate = useNavigate();

  const routeQuery = useQuery({
    queryKey: ["exercise-route", exerciseId],
    queryFn: () => resolveExerciseRoute(Number(exerciseId)),
    enabled: Boolean(exerciseId)
  });

  useEffect(() => {
    if (!routeQuery.data) {
      return;
    }
    navigate(
      `/courses/${routeQuery.data.courseId}/modules/${routeQuery.data.moduleId}/lessons/${routeQuery.data.lessonId}/exercises/${routeQuery.data.exerciseId}`,
      { replace: true }
    );
  }, [navigate, routeQuery.data]);

  if (routeQuery.data) {
    return null;
  }

  return (
    <div className="edu-panel p-6">
      <p className="text-sm text-muted">
        {routeQuery.isLoading ? "Подбираем следующий урок и задание..." : "Не удалось определить маршрут для выбранного упражнения."}
      </p>
    </div>
  );
}
