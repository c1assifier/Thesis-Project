import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import CourseStructureView from "../components/portal/CourseStructureView";
import { getCurrentAccount } from "../services/mockAuth";
import { getPortalBootstrap } from "../services/portalApi";
import { getStoredUser } from "../services/userSession";

export default function CoursePage() {
  const account = getCurrentAccount();
  const user = getStoredUser();
  const bootstrapQuery = useQuery({
    queryKey: ["portal-bootstrap", user?.id],
    queryFn: () => getPortalBootstrap(user!.id),
    enabled: user !== null,
  });

  if (!account) {
    return (
      <div className="portal-panel p-6">
        <p className="text-sm text-gray-600">Сначала выполните локальную регистрацию на главной странице.</p>
        <Link to="/" className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:underline">
          Перейти к входу
        </Link>
      </div>
    );
  }

  if (bootstrapQuery.isError) {
    return <div className="portal-panel p-6 text-sm text-red-600">Не удалось загрузить структуру курса.</div>;
  }

  if (bootstrapQuery.isLoading || !bootstrapQuery.data) {
    return <div className="portal-panel p-6 text-sm text-gray-600">Загрузка структуры курса...</div>;
  }

  return <CourseStructureView course={bootstrapQuery.data.course_structure} />;
}
