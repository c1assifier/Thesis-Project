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
      ? "bg-emerald-600 text-white"
      : status === "in_progress"
        ? "bg-blue-600 text-white"
        : status === "locked"
          ? "border border-slate-300 bg-white text-slate-500"
          : "border border-slate-300 bg-white text-slate-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

type ProgressBarColor = "blue" | "amber" | "emerald";

const colorMap: Record<ProgressBarColor, string> = {
  blue: "bg-blue-600",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
};

export function PortalProgressBar({
  value,
  className,
  color = "blue",
}: {
  value: number;
  className?: string;
  color?: ProgressBarColor;
}) {
  return (
    <div className={["h-2.5 w-full overflow-hidden rounded-full bg-slate-200", className].filter(Boolean).join(" ")}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[color]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
