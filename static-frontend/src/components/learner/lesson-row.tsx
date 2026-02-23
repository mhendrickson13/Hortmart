import { cn, formatDuration, getLessonStatus, type LessonStatus } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { CheckCircle, Lock, Play, Circle } from "lucide-react";

/** Format a date to DD/MM/YYYY HH:mm in CST (America/Chicago) */
function fmtCST(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleString("en-GB", {
    timeZone: "America/Chicago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", "");
}

interface LessonRowProps {
  lesson: {
    id: string;
    title: string;
    durationSeconds: number;
    isLocked: boolean;
  };
  progress?: {
    progressPercent: number;
    completedAt: Date | null;
  } | null;
  isCurrentLesson: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function LessonRow({
  lesson,
  progress,
  isCurrentLesson,
  onClick,
  disabled,
}: LessonRowProps) {
  const status = getLessonStatus(
    progress?.progressPercent || 0,
    lesson.isLocked,
    progress?.completedAt || null,
    isCurrentLesson
  );

  // Determine the underlying progress state (ignoring now_watching override)
  const isCompleted = !!(progress?.completedAt) || (progress?.progressPercent ?? 0) >= 100;
  const hasProgress = (progress?.progressPercent ?? 0) > 0;
  const pct = Math.round(progress?.progressPercent ?? 0);

  const isClickable = !disabled && status !== "locked";

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "w-full rounded-xl border p-3 flex flex-col text-left transition-all",
        status === "now_watching"
          ? "bg-primary text-white border-primary/45 shadow-primary"
          : "bg-white/92 dark:bg-card/92 border-border/95 hover:bg-surface-3",
        status === "locked" && "opacity-55 cursor-not-allowed",
        !isClickable && "cursor-default"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <StatusIcon status={status} isCompleted={isCompleted} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-caption font-bold leading-tight",
              status === "now_watching" ? "text-white" : "text-text-1"
            )}
          >
            {lesson.title}
          </p>
          <div
            className={cn(
              "mt-1.5 flex items-center gap-2.5 text-caption",
              status === "now_watching" ? "text-white/85" : "text-text-3"
            )}
          >
            <span>{isCompleted ? <>Completed{progress?.completedAt && <span className="text-[9px]"> {fmtCST(progress.completedAt)}</span>}</> : formatDuration(lesson.durationSeconds)}</span>
            <StatusPill status={status} progressPercent={pct} isCompleted={isCompleted} />
          </div>
        </div>
      </div>

      {/* Progress bar for lessons with partial progress */}
      {hasProgress && !isCompleted && (
        <div className="mt-2.5 ml-7">
          <div className={cn(
            "w-full h-1.5 rounded-full overflow-hidden",
            status === "now_watching" ? "bg-white/20" : "bg-primary/15"
          )}>
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                status === "now_watching" 
                  ? "bg-white/80" 
                  : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

function StatusIcon({ status, isCompleted }: { status: LessonStatus; isCompleted: boolean }) {
  // When currently watching a completed lesson, show check inside the play circle
  if (status === "now_watching" && isCompleted) {
    return (
      <div className="w-4.5 h-4.5 mt-0.5 rounded-full border-2 border-white/75 bg-white/20 flex items-center justify-center flex-shrink-0">
        <CheckCircle className="w-3 h-3 text-white" />
      </div>
    );
  }

  switch (status) {
    case "completed":
      return (
        <div className="w-4.5 h-4.5 mt-0.5 rounded-full border-2 border-success/65 bg-success/12 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-3 h-3 text-green-700" />
        </div>
      );
    case "now_watching":
      return (
        <div className="w-4.5 h-4.5 mt-0.5 rounded-full border-2 border-white/75 flex items-center justify-center flex-shrink-0">
          <Play className="w-2.5 h-2.5 text-white" fill="currentColor" />
        </div>
      );
    case "in_progress":
      return (
        <div className="w-4.5 h-4.5 mt-0.5 rounded-full border-2 border-primary/50 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      );
    case "locked":
      return (
        <div className="w-4.5 h-4.5 mt-0.5 rounded-full border-2 border-text-3/50 flex items-center justify-center flex-shrink-0">
          <Lock className="w-2.5 h-2.5 text-text-3" />
        </div>
      );
    default:
      return (
        <div className="w-4.5 h-4.5 mt-0.5 rounded-full border-2 border-text-3/50 flex-shrink-0" />
      );
  }
}

function StatusPill({
  status,
  progressPercent,
  isCompleted,
}: {
  status: LessonStatus;
  progressPercent?: number;
  isCompleted: boolean;
}) {
  switch (status) {
    case "completed":
      return <Pill variant="completed" size="sm">COMPLETED</Pill>;
    case "now_watching":
      // Show progress info alongside "NOW WATCHING"
      if (isCompleted) {
        return (
          <span className="flex items-center gap-1.5">
            <Pill
              variant="now-watching"
              size="sm"
              className="bg-white/22 border-white/32"
            >
              NOW WATCHING
            </Pill>
            <span className="text-white/90 font-semibold text-[10px]">✓ DONE</span>
          </span>
        );
      }
      if (progressPercent && progressPercent > 0) {
        return (
          <span className="flex items-center gap-1.5">
            <Pill
              variant="now-watching"
              size="sm"
              className="bg-white/22 border-white/32"
            >
              NOW WATCHING
            </Pill>
            <span className="text-white/90 font-semibold text-[10px]">{progressPercent}%</span>
          </span>
        );
      }
      return (
        <Pill
          variant="now-watching"
          size="sm"
          className="bg-white/22 border-white/32"
        >
          NOW WATCHING
        </Pill>
      );
    case "in_progress":
      return (
        <span className="text-primary font-semibold">
          {progressPercent}%
        </span>
      );
    case "locked":
      return <Pill variant="locked" size="sm">LOCKED</Pill>;
    default:
      return null;
  }
}
