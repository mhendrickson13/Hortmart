"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LessonRow } from "@/components/learner/lesson-row";
import {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetBody,
} from "@/components/ui/bottom-sheet";
import { ChevronUp, Play } from "lucide-react";

interface MobileLessonSheetProps {
  currentLesson: {
    id: string;
    title: string;
    durationSeconds: number;
  };
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      durationSeconds: number;
      isLocked: boolean;
      progress: {
        progressPercent: number;
        completedAt: Date | null;
      } | null;
    }>;
  }>;
  currentLessonId: string;
  onLessonSelect: (lessonId: string) => void;
  totalLessons: number;
  completedLessons: number;
}

export function MobileLessonSheet({
  currentLesson,
  modules,
  currentLessonId,
  onLessonSelect,
  totalLessons,
  completedLessons,
}: MobileLessonSheetProps) {
  const [open, setOpen] = useState(false);

  const handleLessonSelect = (lessonId: string) => {
    onLessonSelect(lessonId);
    setOpen(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>
        <button className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/95 bg-white/92 shadow-card lg:hidden">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-primary">
            <Play className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-caption font-bold text-text-1 truncate">
              {currentLesson.title}
            </div>
            <div className="text-[11px] text-text-3">
              Up next • {completedLessons}/{totalLessons} completed
            </div>
          </div>
          <ChevronUp className="w-5 h-5 text-text-3" />
        </button>
      </BottomSheetTrigger>

      <BottomSheetContent className="h-[80vh]">
        <BottomSheetHeader>
          <BottomSheetTitle>Course content</BottomSheetTitle>
          <p className="text-caption text-text-3">
            {totalLessons} lessons • {completedLessons} completed
          </p>
        </BottomSheetHeader>

        <BottomSheetBody>
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module.id}>
                <h4 className="text-caption font-semibold text-text-2 mb-2 px-1">
                  {module.title}
                </h4>
                <div className="space-y-2">
                  {module.lessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      progress={lesson.progress}
                      isCurrentLesson={lesson.id === currentLessonId}
                      onClick={() => handleLessonSelect(lesson.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
