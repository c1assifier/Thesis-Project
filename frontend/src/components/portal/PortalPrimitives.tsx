import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function PortalPanel({ children, className }: PanelProps) {
  return <div className={["portal-panel", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function PortalWireframe({ children, className }: PanelProps) {
  return <div className={["portal-wireframe", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function PortalStatusBadge({ status, children }: { status: string; children: ReactNode }) {
  const classes =
    status === "completed"
      ? "bg-green-600 text-white"
      : status === "in_progress"
        ? "bg-blue-600 text-white"
        : status === "locked"
          ? "border border-gray-300 bg-white text-gray-600"
          : "border border-gray-300 bg-white text-gray-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

export function PortalProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={["h-2.5 w-full overflow-hidden rounded-full bg-gray-200", className].filter(Boolean).join(" ")}>
      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
