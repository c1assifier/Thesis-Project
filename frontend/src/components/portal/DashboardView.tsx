import { useNavigate } from "react-router-dom";

import type { MockAccount } from "../../services/mockAuth";
import type { PortalBootstrap } from "../../services/portalApi";
import { ClockIcon, HomeIcon, PlayIcon, TargetIcon } from "./PortalIcons";
import { PortalPanel, PortalProgressBar, PortalWireframe } from "./PortalPrimitives";

export default function DashboardView({ account, bootstrap }: { account: MockAccount; bootstrap: PortalBootstrap }) {
  const navigate = useNavigate();
  const { dashboard } = bootstrap;

  return (
    <div className="space-y-6">
      <PortalPanel className="p-6">
        <PortalWireframe className="p-6">
          <div className="mb-6 flex items-center justify-between border-b-2 border-gray-200 pb-4">
            <div className="flex items-center gap-4">
              <HomeIcon className="h-5 w-5 text-gray-400" />
              <span className="font-semibold text-gray-900">{bootstrap.app_title}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-gray-700">
                {account.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-sm text-gray-700">{account.name}</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="mb-4 rounded-xl border border-gray-300 bg-gray-50 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-300 text-lg font-semibold text-gray-700">
                    {account.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{account.name}</div>
                    <div className="text-sm text-gray-600">Студент</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Уровень:</span>
                    <span className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700">
                      {dashboard.profile.level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Баллы:</span>
                    <span className="font-semibold">{dashboard.profile.points.toLocaleString("ru-RU")}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-700">Последняя активность</span>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  {dashboard.activity.map((item, index) => (
                    <div key={item.label} className={index < dashboard.activity.length - 1 ? "border-b border-gray-200 pb-2" : ""}>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Общий прогресс курса</h2>
                  <span className="text-sm text-gray-600">{dashboard.stats.progress_percent}%</span>
                </div>

                <PortalProgressBar value={dashboard.stats.progress_percent} className="mb-4" />

                <div className="grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-gray-600">Завершено</div>
                    <div className="text-lg font-semibold">
                      {dashboard.stats.completed_modules}/{dashboard.stats.total_modules}
                    </div>
                    <div className="text-xs text-gray-500">модулей</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Решено задач</div>
                    <div className="text-lg font-semibold">
                      {dashboard.stats.solved_tasks}/{dashboard.stats.total_tasks}
                    </div>
                    <div className="text-xs text-gray-500">практических</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Точность</div>
                    <div className="text-lg font-semibold">{dashboard.stats.accuracy_percent}%</div>
                    <div className="text-xs text-gray-500">первая попытка</div>
                  </div>
                </div>

                <button type="button" onClick={() => navigate("/course")} className="portal-button-primary mt-4 w-full">
                  <PlayIcon className="mr-2 h-4 w-4" />
                  Продолжить обучение
                </button>
              </div>

              <div className="rounded-xl border-2 border-gray-300 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <TargetIcon className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Рекомендации системы</h3>
                </div>

                <div className="space-y-3">
                  {dashboard.recommendations.map((recommendation) => (
                    <div key={recommendation.title} className="rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm">
                      <div className="mb-1 font-semibold">{recommendation.title}</div>
                      <div className="text-gray-600">{recommendation.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </PortalWireframe>
      </PortalPanel>
    </div>
  );
}
