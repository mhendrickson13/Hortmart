"use client";

import { cn } from "@/lib/utils";

interface BarChartProps {
  data: Array<{
    label: string;
    value: number;
    secondaryValue?: number;
  }>;
  primaryColor?: string;
  secondaryColor?: string;
  height?: number;
  showLegend?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  className?: string;
}

export function BarChart({
  data,
  primaryColor = "bg-primary",
  secondaryColor = "bg-accent",
  height = 200,
  showLegend = true,
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  className,
}: BarChartProps) {
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.value, d.secondaryValue || 0)),
    1
  );
  const hasSecondary = data.some((d) => d.secondaryValue !== undefined);

  return (
    <div className={cn("w-full", className)}>
      {showLegend && (
        <div className="flex items-center gap-4 mb-4 text-caption text-text-3">
          <span className="flex items-center gap-2">
            <span className={cn("w-3 h-3 rounded", primaryColor)} />
            {primaryLabel}
          </span>
          {hasSecondary && (
            <span className="flex items-center gap-2">
              <span className={cn("w-3 h-3 rounded", secondaryColor)} />
              {secondaryLabel}
            </span>
          )}
        </div>
      )}

      <div
        className="flex items-end justify-between gap-2"
        style={{ height: `${height}px` }}
      >
        {data.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1">
            <div
              className={cn(
                "flex items-end gap-1 w-full",
                hasSecondary ? "gap-1" : ""
              )}
              style={{ height: `${height - 24}px` }}
            >
              {/* Primary bar */}
              <div
                className={cn(
                  "flex-1 rounded-t-lg transition-all duration-300",
                  primaryColor
                )}
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  minHeight: item.value > 0 ? "8px" : "0",
                }}
              />
              {/* Secondary bar */}
              {hasSecondary && (
                <div
                  className={cn(
                    "flex-1 rounded-t-lg transition-all duration-300",
                    secondaryColor
                  )}
                  style={{
                    height: `${((item.secondaryValue || 0) / maxValue) * 100}%`,
                    minHeight: (item.secondaryValue || 0) > 0 ? "8px" : "0",
                  }}
                />
              )}
            </div>
            <span className="text-caption text-text-3">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FunnelStepProps {
  label: string;
  count: number;
  percent: number;
  color?: "primary" | "accent" | "success" | "warning";
}

export function FunnelStep({
  label,
  count,
  percent,
  color = "primary",
}: FunnelStepProps) {
  const colorClasses = {
    primary: "bg-primary",
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-body-sm text-text-2">{label}</div>
      <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
        <div
          className={cn(
            "h-full rounded-lg transition-all duration-500",
            colorClasses[color]
          )}
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-body-sm font-bold text-text-1 drop-shadow-sm">
            {count} ({percent}%)
          </span>
        </div>
      </div>
    </div>
  );
}

interface ProgressDistributionProps {
  data: Record<string, number>;
  height?: number;
  className?: string;
}

export function ProgressDistribution({
  data,
  height = 112,
  className,
}: ProgressDistributionProps) {
  const maxCount = Math.max(...Object.values(data), 1);
  const colors: Record<string, string> = {
    "0-25": "bg-text-1/8",
    "25-50": "bg-text-1/8",
    "50-75": "bg-text-1/8",
    "75-100": "bg-primary/20",
    completed: "bg-success/20",
  };

  return (
    <div
      className={cn("flex items-end gap-2", className)}
      style={{ height: `${height}px` }}
    >
      {Object.entries(data).map(([label, count]) => {
        const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn("w-full rounded-xl", colors[label] || "bg-text-1/8")}
              style={{ height: `${Math.max(heightPercent, 10)}%` }}
            />
            <span className="text-[10px] text-text-3 font-semibold whitespace-nowrap">
              {label === "completed" ? "Done" : label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
