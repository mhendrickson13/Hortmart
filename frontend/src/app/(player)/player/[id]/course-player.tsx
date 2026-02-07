"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VideoPlayer, VideoPlayerRef } from "@/components/learner/video-player";
import { LessonRow } from "@/components/learner/lesson-row";
import { QASection } from "@/components/learner/qa-section";
import { NotesSection } from "@/components/learner/notes-section";
import { RatingDialog } from "@/components/learner/rating-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lessons as lessonsApi } from "@/lib/api-client";
import {
  ChevronLeft,
  Star,
  Heart,
  Share2,
  Bookmark,
  Clock,
  Users,
  Globe,
  BarChart3,
  List,
  Play,
  SkipBack,
  SkipForward,
  CheckCircle,
  Circle,
  Lock,
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
  otherStudents: Array<{
    id: string;
    name: string | null;
    image: string | null;
  }>;
  totalOtherStudents: number;
}

export function CoursePlayer({
  course,
  currentLessonId: initialLessonId,
  initialTime,
  enrollmentId,
  otherStudents,
  totalOtherStudents,
}: CoursePlayerProps) {
  const videoRef = useRef<VideoPlayerRef>(null);
  const allLessons = course.modules.flatMap((m) => m.lessons);
  
  const [currentLessonId, setCurrentLessonId] = useState(
    initialLessonId || allLessons[0]?.id
  );
  const [showLessonList, setShowLessonList] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast({ 
      title: isFavorited ? "Removed from favorites" : "Added to favorites", 
      variant: "success" 
    });
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast({ 
      title: isBookmarked ? "Bookmark removed" : "Lesson bookmarked", 
      variant: "success" 
    });
  };

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
    if (!currentLessonId) return;
    try {
      await lessonsApi.updateProgress(currentLessonId, {
        progressPercent: Math.round(progress),
        lastWatchedTimestamp: Math.floor(currentTime),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }, [currentLessonId]);

  const handleComplete = useCallback(async () => {
    if (!currentLessonId) return;
    try {
      await lessonsApi.updateProgress(currentLessonId, {
        progressPercent: 100,
        lastWatchedTimestamp: 0,
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
  }, [currentLessonId, currentLessonIndex, allLessons]);

  const handleVideoTimeUpdate = useCallback((time: number) => {
    setCurrentVideoTime(time);
  }, []);

  const handleSeekToTimestamp = useCallback((time: number) => {
    videoRef.current?.seekTo(time);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 h-full overflow-x-hidden">
      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 lg:gap-4 overflow-x-hidden">
        {/* Mobile Top Bar */}
        <div className="flex items-center gap-2 lg:gap-3">
          <Button asChild variant="secondary" size="icon" className="h-10 w-10 lg:h-11 lg:w-11 flex-shrink-0">
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
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Other Students */}
            <div className="flex items-center gap-2 mr-2">
              <div className="flex">
                {totalOtherStudents > 0 ? (
                  otherStudents.slice(0, 3).map((student, idx) => (
                    <div
                      key={student.id}
                      className="w-7 h-7 rounded-full border border-border/90 overflow-hidden"
                      style={{ marginLeft: idx > 0 ? "-10px" : 0, zIndex: 3 - idx }}
                    >
                      {student.image ? (
                        <img
                          src={student.image}
                          alt={student.name || "Student"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full"
                          style={{
                            background: idx === 0 
                              ? "linear-gradient(135deg, rgba(47,111,237,0.35), rgba(56,189,248,0.25))"
                              : idx === 1 
                                ? "linear-gradient(135deg, rgba(56,189,248,0.35), rgba(140,255,203,0.25))"
                                : "linear-gradient(135deg, rgba(140,255,203,0.35), rgba(47,111,237,0.22))"
                          }}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  // Placeholder avatars when no other students
                  [0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="w-7 h-7 rounded-full border border-border/90 overflow-hidden"
                      style={{ marginLeft: idx > 0 ? "-10px" : 0, zIndex: 3 - idx }}
                    >
                      <div 
                        className="w-full h-full"
                        style={{
                          background: idx === 0 
                            ? "linear-gradient(135deg, rgba(47,111,237,0.35), rgba(56,189,248,0.25))"
                            : idx === 1 
                              ? "linear-gradient(135deg, rgba(56,189,248,0.35), rgba(140,255,203,0.25))"
                              : "linear-gradient(135deg, rgba(140,255,203,0.35), rgba(47,111,237,0.22))"
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
              <span className="text-[11px] font-semibold text-text-3">
                {totalOtherStudents === 0 
                  ? "Other students"
                  : totalOtherStudents === 1 
                    ? "1 other student" 
                    : `${totalOtherStudents} other students`}
              </span>
            </div>

            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-1.5"
              onClick={() => setShowRatingDialog(true)}
            >
              <Star className="w-4 h-4" />
              Leave a rating
            </Button>
            <Button 
              variant="secondary" 
              size="icon-sm"
              onClick={handleFavorite}
            >
              <Heart className={cn("w-4 h-4", isFavorited && "fill-red-500 text-red-500")} />
            </Button>
            <Button 
              variant="secondary" 
              size="icon-sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "Link copied!", variant: "success" });
              }}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="secondary" 
              size="icon-sm"
              onClick={handleBookmark}
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-primary text-primary")} />
            </Button>
          </div>
        </div>

        {/* Video Player */}
        <VideoPlayer
          ref={videoRef}
          src={currentLesson?.videoUrl}
          initialTime={currentLesson?.progress?.lastWatchedTimestamp || 0}
          onProgress={handleProgress}
          onComplete={handleComplete}
          onTimeUpdate={handleVideoTimeUpdate}
        />

        {/* Mobile Lesson Info & Controls */}
        <div className="lg:hidden space-y-3">
          {/* Lesson Info Card */}
          <div className="mobile-card">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 text-primary ml-0.5" fill="currentColor" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-3 font-medium mb-0.5">
                  Lesson {currentLessonIndex + 1} of {totalLessons}
                </p>
                <h3 className="text-body-sm font-bold text-text-1 truncate">
                  {currentLesson?.title || "Select a lesson"}
                </h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-h3 font-bold text-primary">{progressPercent}%</span>
                <span className="text-[10px] text-text-3">complete</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3">
              <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-600 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Mobile Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Lesson Navigation */}
            <Button 
              variant="secondary" 
              size="sm"
              className="flex-1 h-11"
              onClick={() => {
                if (currentLessonIndex > 0) {
                  const prevLesson = allLessons[currentLessonIndex - 1];
                  if (!prevLesson.isLocked) {
                    handleLessonSelect(prevLesson.id);
                  }
                }
              }}
              disabled={currentLessonIndex === 0}
            >
              <SkipBack className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            {/* Lessons list button */}
            <Button 
              variant="secondary" 
              size="icon"
              className="h-11 w-11 flex-shrink-0"
              onClick={() => setShowLessonList(true)}
            >
              <List className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="default" 
              size="sm"
              className="flex-1 h-11"
              onClick={() => {
                if (currentLessonIndex < allLessons.length - 1) {
                  const nextLesson = allLessons[currentLessonIndex + 1];
                  if (!nextLesson.isLocked) {
                    handleLessonSelect(nextLesson.id);
                  }
                }
              }}
              disabled={currentLessonIndex === allLessons.length - 1}
            >
              Next
              <SkipForward className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {/* Mobile Action Bar */}
          <div className="flex items-center justify-around py-2 px-4 rounded-2xl bg-muted/50 border border-border/50">
            <button 
              onClick={handleFavorite}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Heart className={cn(
                "w-5 h-5 transition-colors",
                isFavorited ? "fill-red-500 text-red-500" : "text-text-2"
              )} />
              <span className="text-[10px] font-medium text-text-3">Favorite</span>
            </button>
            
            <button 
              onClick={handleBookmark}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Bookmark className={cn(
                "w-5 h-5 transition-colors",
                isBookmarked ? "fill-primary text-primary" : "text-text-2"
              )} />
              <span className="text-[10px] font-medium text-text-3">Bookmark</span>
            </button>
            
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "Link copied!", variant: "success" });
              }}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Share2 className="w-5 h-5 text-text-2" />
              <span className="text-[10px] font-medium text-text-3">Share</span>
            </button>
            
            <button 
              onClick={() => setShowRatingDialog(true)}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Star className="w-5 h-5 text-text-2" />
              <span className="text-[10px] font-medium text-text-3">Rate</span>
            </button>
          </div>
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
                    {course.level?.replace("_", " ") || "All Levels"}
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
            {currentLessonId && (
              <QASection 
                lessonId={currentLessonId} 
                courseCreatorId={course.creator.id}
              />
            )}
          </TabsContent>

          <TabsContent value="notes">
            {currentLessonId && (
              <NotesSection
                lessonId={currentLessonId}
                currentTime={currentVideoTime}
                onSeek={handleSeekToTimestamp}
              />
            )}
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
      <aside className="hidden lg:flex w-[360px] flex-shrink-0 rounded-2xl bg-white/85 dark:bg-card/85 border border-border/90 p-3.5 flex-col gap-3.5">
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

        {/* Your Time on the Course */}
        <Card className="p-3">
          <h4 className="text-caption font-bold text-text-1 mb-2 italic">
            Your time on the course
          </h4>
          <div className="relative">
            <svg viewBox="0 0 320 80" className="w-full h-[72px]" fill="none">
              {/* Smooth curve line */}
              <path 
                d="M8 62 C 48 62, 60 25, 90 25 C 120 25, 140 52, 170 52 C 200 52, 220 18, 250 18 C 280 18, 292 40, 312 40"
                stroke="rgba(47, 111, 237, 0.85)" 
                strokeWidth="4" 
                strokeLinecap="round"
                fill="none"
              />
              {/* Activity dots */}
              <circle cx="90" cy="25" r="5" fill="rgba(47, 111, 237, 0.95)" />
              <circle cx="250" cy="18" r="5" fill="rgba(47, 111, 237, 0.95)" />
            </svg>
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-text-3 font-bold">
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
          </div>
        </Card>
      </aside>

      {/* Mobile Lesson List Bottom Sheet */}
      <BottomSheet
        isOpen={showLessonList}
        onClose={() => setShowLessonList(false)}
        title="Course Content"
        subtitle={`${completedLessons}/${totalLessons} completed`}
        maxHeight="85vh"
      >
        {/* Progress Section */}
        <div className="px-4 py-4 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-medium text-text-2">Your progress</span>
            <span className="text-body-sm font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/50 dark:bg-card/50 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-600 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-text-3">
            <span>{completedLessons} completed</span>
            <span>{totalLessons - completedLessons} remaining</span>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="px-4 py-3 border-b border-border/30 flex gap-2 overflow-x-auto scrollbar-hide">
          {course.modules.map((module, idx) => {
            const moduleCompleted = module.lessons.filter(l => l.progress?.completedAt).length;
            const moduleTotal = module.lessons.length;
            const isComplete = moduleCompleted === moduleTotal;
            return (
              <button
                key={module.id}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all",
                  isComplete 
                    ? "bg-success/10 text-success border border-success/20" 
                    : "bg-muted text-text-2 border border-border/50"
                )}
              >
                M{idx + 1}: {moduleCompleted}/{moduleTotal}
              </button>
            );
          })}
        </div>

        {/* Lesson List */}
        <div className="p-4 space-y-5">
          {course.modules.map((module, moduleIdx) => (
            <div key={module.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
                  {moduleIdx + 1}
                </span>
                <h4 className="text-body-sm font-semibold text-text-1 flex-1">
                  {module.title}
                </h4>
              </div>
              <div className="space-y-2 pl-2">
                {module.lessons.map((lesson, lessonIdx) => {
                  const isCompleted = lesson.progress?.completedAt;
                  const isCurrent = lesson.id === currentLessonId;
                  const isLocked = lesson.isLocked;
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        if (!isLocked) {
                          handleLessonSelect(lesson.id);
                          setShowLessonList(false);
                        }
                      }}
                      disabled={isLocked}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]",
                        isCurrent 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : isLocked 
                            ? "bg-muted/50 opacity-60 cursor-not-allowed"
                            : "bg-card border border-border/50 hover:border-primary/30"
                      )}
                    >
                      {/* Status Icon */}
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        isCurrent 
                          ? "bg-white/20" 
                          : isCompleted 
                            ? "bg-success/10" 
                            : isLocked 
                              ? "bg-text-3/10" 
                              : "bg-primary/10"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className={cn("w-4 h-4", isCurrent ? "text-white" : "text-success")} />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4 text-text-3" />
                        ) : isCurrent ? (
                          <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                        ) : (
                          <Circle className="w-4 h-4 text-primary" />
                        )}
                      </span>
                      
                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <p className={cn(
                          "text-body-sm font-semibold truncate",
                          isCurrent ? "text-white" : "text-text-1"
                        )}>
                          {lessonIdx + 1}. {lesson.title}
                        </p>
                        <p className={cn(
                          "text-[11px]",
                          isCurrent ? "text-white/70" : "text-text-3"
                        )}>
                          {Math.floor(lesson.durationSeconds / 60)} min
                          {lesson.progress && lesson.progress.progressPercent > 0 && lesson.progress.progressPercent < 100 && (
                            <span> • {Math.round(lesson.progress.progressPercent)}% watched</span>
                          )}
                        </p>
                      </div>
                      
                      {/* Progress indicator for partially watched */}
                      {!isCompleted && lesson.progress && lesson.progress.progressPercent > 0 && !isCurrent && (
                        <div className="w-8 h-8 relative">
                          <svg className="w-8 h-8 -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className="text-primary/20"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${(lesson.progress.progressPercent / 100) * 75.4} 75.4`}
                              className="text-primary"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* Rating Dialog */}
      <RatingDialog
        courseId={course.id}
        courseName={course.title}
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
      />
    </div>
  );
}
