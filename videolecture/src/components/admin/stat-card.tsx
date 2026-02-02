import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
}: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] sm:text-overline text-text-3 uppercase tracking-wide">
          {title}
        </div>
        {icon && <div className="text-text-2 hidden sm:block">{icon}</div>}
      </div>
      <div className="mt-1.5 sm:mt-2.5 text-h3 sm:text-h2 font-bold text-text-1">{value}</div>
      {(change !== undefined || changeLabel) && (
        <div className="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {change !== undefined && (
            <>
              {isPositive && (
                <span className="text-[10px] sm:text-caption font-semibold text-green-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  +{change}%
                </span>
              )}
              {isNegative && (
                <span className="text-[10px] sm:text-caption font-semibold text-red-600 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {change}%
                </span>
              )}
              {!isPositive && !isNegative && change === 0 && (
                <span className="text-[10px] sm:text-caption font-semibold text-text-3">
                  0%
                </span>
              )}
            </>
          )}
          {changeLabel && (
            <span className="text-[10px] sm:text-caption text-text-2 truncate">{changeLabel}</span>
          )}
        </div>
      )}
    </Card>
  );
}
