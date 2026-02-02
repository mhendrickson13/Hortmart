"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/learner/video-player";
import { LessonRow } from "@/components/learner/lesson-row";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Search,
  Star,
  Heart,
  Share2,
  Bookmark,
  Clock,
  Users,
  Globe,
  BarChart3,
  List,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";

interface CoursePlayerProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    level: string;
    language: string;
    creator: {
      id: string;
      name: string | null;
      image: string | null;
    };
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        description?: string | null;
        videoUrl?: string | null;
        durationSeconds: number;
        isLocked: boolean;
        resources: Array<{
          id: string;
          title: string;
          type: string;
          url: string;
          fileSize?: number | null;
        }>;
        progress: {
          progressPercent: number;
          completedAt: Date | null;
          lastWatchedTimestamp: number;
        } | null;
      }>;
    }>;
  };
  currentLessonId?: string;
  initialTime: number;
  enrollmentId: string;
}

export function CoursePlayer({
  course,
  currentLessonId: initialLessonId,
  initialTime,
  enrollmentId,
}: CoursePlayerProps) {
  const router = useRouter();
  const allLessons = course.modules.flatMap((m) => m.lessons);
  
  const [currentLessonId, setCurrentLessonId] = useState(
    initialLessonId || allLessons[0]?.id
  );
  const [showLessonList, setShowLessonList] = useState(false);

  const currentLesson = allLessons.find((l) => l.id === currentLessonId);
  const currentLessonIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => l.progress?.completedAt).length;
  const totalDuration = allLessons.reduce((sum, l) => sum + l.durationSeconds, 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleLessonSelect = useCallback((lessonId: string) => {
    const lesson = allLessons.find((l) => l.id === lessonId);
    if (lesson && !lesson.isLocked) {
      setCurrentLessonId(lessonId);
    }
  }, [allLessons]);

  const handleProgress = useCallback(async (progress: number, currentTime: number) => {
    try {
      await fetch(`/api/lessons/${currentLessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          progressPercent: Math.round(progress),
          lastWatchedTimestamp: Math.floor(currentTime),
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }, [currentLessonId, enrollmentId]);

  const handleComplete = useCallback(async () => {
    try {
      await fetch(`/api/lessons/${currentLessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          progressPercent: 100,
          completed: true,
        }),
      });

      toast({
        title: "Lesson completed!",
        description: "Great job! Keep up the good work.",
        variant: "success",
      });

      // Auto-advance to next lesson
      if (currentLessonIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentLessonIndex + 1];
        if (!nextLesson.isLocked) {
          setTimeout(() => {
            setCurrentLessonId(nextLesson.id);
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Failed to mark as complete:", error);
    }
  }, [currentLessonId, enrollmentId, currentLessonIndex, allLessons]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 h-full">
      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 lg:gap-4">
        {/* Mobile Top Bar */}
        <div className="flex items-center gap-2 lg:gap-3">
          <Button asChild variant="secondary" size="icon" className="h-10 w-10 lg:h-11 lg:w-11">
            <Link href="/my-courses">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-body lg:text-h3 font-bold text-text-1 truncate">{course.title}</h1>
            <p className="text-caption text-text-3 hidden sm:block">
              {course.creator.name}
            </p>
          </div>
          {/* Mobile Actions */}
          <div className="flex items-center gap-1.5 lg:gap-2">
            <Button variant="secondary" size="icon" className="h-10 w-10 lg:hidden">
              <Heart className="w-4 h-4" />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-10 w-10 lg:hidden"
              onClick={() => setShowLessonList(true)}
            >
              <List className="w-4 h-4" />
            </Button>
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <Star className="w-4 h-4" />
                Leave a rating
              </Button>
              <Button variant="secondary" size="icon-sm">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="icon-sm">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="icon-sm">
                <Bookmark className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <VideoPlayer
          src={currentLesson?.videoUrl}
          initialTime={currentLesson?.progress?.lastWatchedTimestamp || 0}
          onProgress={handleProgress}
          onComplete={handleComplete}
        />

        {/* Mobile Lesson Info */}
        <div className="lg:hidden">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-body-sm font-semibold text-text-1 truncate flex-1 mr-2">
                {currentLesson?.title || "Select a lesson"}
              </h3>
              <Pill size="sm">{progressPercent}%</Pill>
            </div>
            <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="text-caption">Overview</TabsTrigger>
            <TabsTrigger value="qa" className="text-caption">Q&A</TabsTrigger>
            <TabsTrigger value="notes" className="text-caption">Notes</TabsTrigger>
            <TabsTrigger value="resources" className="text-caption">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Course Stats - Mobile Compact */}
            <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-3 lg:mb-4">
              <Card className="p-2.5 lg:p-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] lg:text-overline text-text-3 uppercase">Level</div>
                  <div className="text-caption font-semibold text-text-1 truncate">
                    {course.level.replace("_", " ")}
                  </div>
                </div>
              </Card>
              <Card className="p-2.5 lg:p-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] lg:text-overline text-text-3 uppercase">Length</div>
                  <div className="text-caption font-semibold text-text-1">
                    {Math.round(totalDuration / 60)} min
                  </div>
                </div>
              </Card>
              <Card className="p-2.5 lg:p-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] lg:text-overline text-text-3 uppercase">Progress</div>
                  <div className="text-caption font-semibold text-text-1">
                    {completedLessons}/{totalLessons}
                  </div>
                </div>
              </Card>
              <Card className="p-2.5 lg:p-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] lg:text-overline text-text-3 uppercase">Language</div>
                  <div className="text-caption font-semibold text-text-1">
                    {course.language}
                  </div>
                </div>
              </Card>
            </div>

            {/* Lesson Description */}
            {currentLesson?.description && (
              <Card className="p-3 lg:p-4">
                <h3 className="text-body-sm lg:text-body font-semibold text-text-1 mb-1.5 lg:mb-2">
                  {currentLesson.title}
                </h3>
                <p className="text-caption lg:text-body-sm text-text-2">
                  {currentLesson.description}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="qa">
            <Card className="p-6 text-center">
              <p className="text-body-sm text-text-2">
                Q&A feature coming soon. Ask questions about this lesson.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="p-6 text-center">
              <p className="text-body-sm text-text-2">
                Notes feature coming soon. Take timestamped notes while watching.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            {currentLesson?.resources && currentLesson.resources.length > 0 ? (
              <div className="space-y-2">
                {currentLesson.resources.map((resource) => (
                  <Card key={resource.id} className="p-3 flex items-center gap-3">
                    <Pill size="sm">{resource.type.toUpperCase()}</Pill>
                    <span className="text-caption font-semibold text-text-1 flex-1">
                      {resource.title}
                    </span>
                    <Button asChild variant="ghost" size="sm">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-body-sm text-text-2">
                  No resources for this lesson yet.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Sidebar - Lesson List */}
      <aside className="hidden lg:flex w-[360px] flex-shrink-0 rounded-2xl bg-white/85 border border-border/90 p-3.5 flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-body font-bold text-text-1">Course content</h3>
          <span className="text-caption text-text-3">{totalLessons} lessons</span>
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {course.modules.map((module) => (
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

        {/* Mini Chart */}
        <Card className="p-3">
          <h4 className="text-caption font-bold text-text-1 mb-2">
            Your time on the course
          </h4>
          <div className="h-16 flex items-end gap-1">
            {["MON", "TUE", "WED", "THU", "FRI"].map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/20 rounded-t"
                  style={{
                    height: `${[30, 60, 45, 80, 55][i]}%`,
                  }}
                />
                <span className="text-[10px] text-text-3 font-semibold">
                  {day}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </aside>

      {/* Mobile Lesson List Sheet */}
      {showLessonList && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowLessonList(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-white rounded-t-3xl overflow-hidden animate-slide-in-bottom"
            style={{ backgroundColor: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <div>
                <h3 className="text-body font-bold text-text-1">Course content</h3>
                <p className="text-caption text-text-3">{completedLessons}/{totalLessons} completed</p>
              </div>
              <Button 
                variant="secondary" 
                size="icon-sm"
                onClick={() => setShowLessonList(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="px-4 py-3 border-b border-border bg-surface">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-caption text-text-2">Your progress</span>
                <span className="text-caption font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Lesson List */}
            <div className="overflow-auto max-h-[calc(80vh-160px)] p-4 space-y-4">
              {course.modules.map((module) => (
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
                        onClick={() => {
                          handleLessonSelect(lesson.id);
                          setShowLessonList(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
