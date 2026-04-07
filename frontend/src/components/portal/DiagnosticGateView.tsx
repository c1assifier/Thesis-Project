import { useNavigate } from "react-router-dom";

import type { PortalBootstrap } from "../../services/portalApi";
import { AlertIcon, FileIcon, LockKeyIcon } from "./PortalIcons";
import { PortalPanel, PortalStatusBadge, PortalWireframe } from "./PortalPrimitives";

export default function DiagnosticGateView({ bootstrap }: { bootstrap: PortalBootstrap }) {
  const navigate = useNavigate();
  const { diagnostic_gate: diagnosticGate } = bootstrap;

  return (
    <PortalPanel className="mx-auto max-w-5xl p-6">
      <PortalWireframe className="space-y-4 p-6">
        <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4">
          <span className="font-semibold text-gray-900">Панель студента</span>
          <div className="h-8 w-8 rounded-full bg-gray-300" />
        </div>

        <div className="rounded-2xl border-2 border-yellow-400 bg-yellow-50 p-6">
          <div className="flex gap-4">
            <div className="shrink-0 text-yellow-600">
              <AlertIcon className="h-8 w-8" />
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">{diagnosticGate.title}</h2>
              <p className="text-sm text-gray-700">{diagnosticGate.description}</p>
              <p className="text-sm text-gray-600">{diagnosticGate.note}</p>
              <button type="button" onClick={() => navigate("/diagnostic")} className="inline-flex items-center rounded-xl bg-yellow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-700">
                <FileIcon className="mr-2 h-4 w-4" />
                {diagnosticGate.action_label}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700">Структура курса (недоступна)</div>

          {diagnosticGate.locked_modules.map((module) => (
            <div key={module} className="rounded-xl border border-gray-300 bg-gray-100 p-3 opacity-70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LockKeyIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{module}</span>
                </div>
                <PortalStatusBadge status="locked">Заблокировано</PortalStatusBadge>
              </div>
            </div>
          ))}
        </div>
      </PortalWireframe>
    </PortalPanel>
  );
}
