/**
 * Health Indicator - Visual health status dot with tooltip
 */

import { cn } from "@/lib/utils";

export type HealthStatus = "healthy" | "warning" | "critical";

interface HealthIndicatorProps {
  status: HealthStatus;
  tooltip?: string;
}

const healthConfig: Record<HealthStatus, { color: string; label: string }> = {
  healthy: { color: "bg-green-500", label: "On track" },
  warning: { color: "bg-amber-500", label: "Some issues" },
  critical: { color: "bg-red-500", label: "Critical blockers" },
};

export function HealthIndicator({ status, tooltip }: HealthIndicatorProps) {
  const config = healthConfig[status];
  const ariaLabel = tooltip || `Project health: ${config.label}`;

  return (
    <div
      className="relative group"
      title={tooltip || config.label}
      role="status"
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "w-2.5 h-2.5 rounded-full",
          config.color,
          "ring-2 ring-white dark:ring-gray-900",
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{ariaLabel}</span>
      {tooltip && (
        <div className="absolute left-0 top-6 hidden group-hover:block z-10 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg border">
          {tooltip}
        </div>
      )}
    </div>
  );
}
