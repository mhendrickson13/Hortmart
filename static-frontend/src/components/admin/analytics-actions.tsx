import { Download, Calendar } from "lucide-react";
import { toast } from "@/components/ui/toaster";

export function AnalyticsActions() {
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() =>
          toast({
            title: "Export coming soon",
            description: "Analytics export is under development.",
            variant: "info",
          })
        }
        className="h-10 px-3.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)]"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
      <button
        onClick={() =>
          toast({
            title: "Date range coming soon",
            description: "Custom date range filtering is under development.",
            variant: "info",
          })
        }
        className="h-10 px-3.5 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] inline-flex items-center gap-2 shadow-[0_16px_34px_rgba(47,111,237,0.22)]"
      >
        <Calendar className="w-4 h-4" />
        Date range
      </button>
    </div>
  );
}
