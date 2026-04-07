import { Link } from "react-router-dom";

import type { PortalCourseStructure } from "../../services/portalApi";
import { CheckCircleIcon, CircleIcon, LockKeyIcon, PlayIcon } from "./PortalIcons";
import { PortalPanel, PortalProgressBar, PortalStatusBadge, PortalWireframe } from "./PortalPrimitives";

function iconForStatus(status: string) {
  if (status === "completed") {
    return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
  }
  if (status === "in_progress") {
    return <PlayIcon className="h-5 w-5 text-blue-600" />;
  }
  if (status === "locked") {
    return <LockKeyIcon className="h-5 w-5 text-gray-400" />;
  }
  return <CircleIcon className="h-5 w-5 text-gray-400" />;
}

function cardClassName(status: string): string {
  if (status === "completed") {
    return "border-green-300 bg-green-50";
  }
  if (status === "in_progress") {
    return "border-blue-300 bg-blue-50";
  }
  if (status === "locked") {
    return "border-gray-300 bg-gray-100 opacity-70";
  }
  return "border-gray-300 bg-white";
}

export default function CourseStructureView({ course }: { course: PortalCourseStructure }) {
  return (
    <PortalPanel className="p-6">
      <PortalWireframe className="space-y-4 p-6">
        <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-500 text-[10px] text-gray-500">C</span>
            <h1 className="font-semibold text-gray-900">{course.title}</h1>
          </div>
          <div className="text-sm text-gray-600">{course.module_count_label}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {course.modules.map((module) => (
            <Link key={module.id} to={`/modules/${module.id}`} className={`rounded-xl border-2 p-4 transition hover:shadow-sm ${cardClassName(module.status)}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {iconForStatus(module.status)}
                  <span className="font-semibold text-gray-900">{module.title}</span>
                </div>
                <PortalStatusBadge status={module.status}>{module.badge}</PortalStatusBadge>
              </div>
              <PortalProgressBar value={module.progress_percent} className="mb-2" />
              <div className="text-sm text-gray-600">{module.progress_label}</div>
            </Link>
          ))}
        </div>
      </PortalWireframe>
    </PortalPanel>
  );
}
