"use client";

import { cn, formatDuration, getLessonStatus, type LessonStatus } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { CheckCircle, Lock, Play, Circle } from "lucide-react";

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

  const isClickable = !disabled && status !== "locked";

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cn(
        "w-full rounded-xl border p-3 flex items-start gap-3 text-left transition-all",
        status === "now_watching"
          ? "bg-primary text-white border-primary/45 shadow-primary"
          : "bg-white/92 border-border/95 hover:bg-surface-3",
        status === "locked" && "opacity-55 cursor-not-allowed",
        !isClickable && "cursor-default"
      )}
    >
      {/* Status Icon */}
      <StatusIcon status={status} />

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
          <span>{formatDuration(lesson.durationSeconds)}</span>
          <StatusPill status={status} progressPercent={progress?.progressPercent} />
        </div>
      </div>
    </button>
  );
}

function StatusIcon({ status }: { status: LessonStatus }) {
  const baseClasses = "w-4.5 h-4.5 mt-0.5 flex-shrink-0";

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
}: {
  status: LessonStatus;
  progressPercent?: number;
}) {
  switch (status) {
    case "completed":
      return <Pill variant="completed" size="sm">COMPLETED</Pill>;
    case "now_watching":
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
