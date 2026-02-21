import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "amber" | "red";
}

const colorMap = {
  blue: "bg-[#4A7BF7]",
  green: "bg-[#34A853]",
  amber: "bg-[#F5A623]",
  red: "bg-[#EA4335]",
} as const;

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color = "blue",
}: StatCardProps) {
  return (
    <div
      className={`${colorMap[color]} rounded-2xl p-5 text-white shadow-[0_4px_24px_rgba(255,255,255,0.08)] backdrop-blur-sm`}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-[28px] font-extrabold leading-tight tracking-tight">
            {value}
          </div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-white/80">
            {title}
          </div>
        </div>
      </div>

      {(change !== undefined || changeLabel) && (
        <div className="mt-3 border-t border-white/20 pt-3 text-[12px] font-semibold text-white/80">
          {change !== undefined && change !== 0 && (
            <span className="font-bold text-white">
              {change > 0 ? `+${change}%` : `${change}%`}
            </span>
          )}{" "}
          {changeLabel}
        </div>
      )}
    </div>
  );
}
