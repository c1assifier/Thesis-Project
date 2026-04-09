import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import ModuleDetailsView from "../components/portal/ModuleDetailsView";
import { getAdaptivePath } from "../services/api";
import { getPortalModuleDetails } from "../services/portalApi";
import { getStoredUser } from "../services/userSession";

export default function ModulePage() {
  const { moduleId = "" } = useParams();
  const user = getStoredUser();
  const parsedModuleId = Number(moduleId);

  const moduleQuery = useQuery({
    queryKey: ["portal-module", parsedModuleId, user?.id],
    queryFn: () => getPortalModuleDetails(parsedModuleId, user!.id),
    enabled: user !== null && Number.isFinite(parsedModuleId),
  });

  const adaptivePathQuery = useQuery({
    queryKey: ["adaptive-path", user?.id],
    queryFn: () => getAdaptivePath(user!.id),
    enabled: user !== null
  });

  if (!user) {
    return (
      <div className="portal-panel p-6">
        <p className="text-sm text-gray-600">Сначала выполните локальную регистрацию на главной странице.</p>
        <Link to="/" className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:underline">
          Перейти к входу
        </Link>
      </div>
    );
  }

  if (moduleQuery.isError) {
    return <div className="portal-panel p-6 text-sm text-red-600">Не удалось загрузить детали модуля.</div>;
  }

  if (moduleQuery.isLoading || !moduleQuery.data) {
    return <div className="portal-panel p-6 text-sm text-gray-600">Загрузка деталей модуля...</div>;
  }

  if (moduleQuery.data.status === "locked") {
    return (
      <div className="portal-panel max-w-3xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Модуль заблокирован</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{moduleQuery.data.title}</h1>
        <p className="mt-3 text-sm leading-7 text-gray-700">
          Этот модуль пока недоступен. Сначала завершите предыдущий модуль, после чего доступ откроется автоматически.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/course" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-slate-50">
            Вернуться к курсу
          </Link>
        </div>
      </div>
    );
  }

  const adaptiveModuleStatus =
    adaptivePathQuery.data?.modules.find((item) => item.module_id === parsedModuleId)?.status ?? "not_started";

  return <ModuleDetailsView module={moduleQuery.data} userId={user.id} adaptiveModuleStatus={adaptiveModuleStatus} />;
}
