import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

// Matches client_designs/admin_dashboard_desktop.html exactly
export function StatCard({
  title,
  value,
  change,
  changeLabel,
}: StatCardProps) {
  return (
    <Card className="p-3.5">
      {/* Title - matches .card .k */}
      <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
        {title}
      </div>
      
      {/* Value - matches .card .v */}
      <div className="mt-2.5 text-[22px] font-black tracking-tight text-text-1">
        {value}
      </div>
      
      {/* Subtitle - matches .card .s */}
      {(change !== undefined || changeLabel) && (
        <div className="mt-2 text-[12px] font-extrabold text-text-2">
          {change !== undefined && change !== 0 && (
            <span className="text-primary-600 font-black">
              {change > 0 ? `+${change}%` : `${change}%`}
            </span>
          )}{" "}
          {changeLabel}
        </div>
      )}
    </Card>
  );
}
