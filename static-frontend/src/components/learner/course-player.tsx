import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { lessons as lessonsApi, favourites as favouritesApi, video as videoApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
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
  Loader2,
  AlertCircle,
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
        hlsUrl?: string | null;
        videoStatus?: string | null;
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
  isPreview?: boolean;
}

// --- Activity Chart Component ---
type LessonLike = {
  progress: {
    progressPercent: number;
    completedAt: Date | null;
    lastWatchedTimestamp: number;
  } | null;
  durationSeconds: number;
};

function ActivityChart({ lessons }: { lessons: LessonLike[] }) {
  // Get last 7 days labels and compute activity per day
  const { dayLabels, values, maxVal } = useMemo(() => {
    const now = new Date();
    const days: { label: string; dateStr: string }[] = [];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({
        label: dayNames[d.getDay()],
        dateStr: d.toISOString().slice(0, 10), // YYYY-MM-DD
      });
    }

    // Accumulate activity per day from lesson progress
    const activityMap: Record<string, number> = {};
    days.forEach((d) => (activityMap[d.dateStr] = 0));

    lessons.forEach((lesson) => {
      if (!lesson.progress) return;
      const prog = lesson.progress;

      // Use completedAt if available
      if (prog.completedAt) {
        const dateStr = new Date(prog.completedAt).toISOString().slice(0, 10);
        if (activityMap[dateStr] !== undefined) {
          // Count completed lesson's full estimated duration as watched time
          activityMap[dateStr] += lesson.durationSeconds;
        }
      }

      // Use lastWatchedTimestamp (seconds into video) as indicator of recent watch
      // We treat the progress update date as "today" if no completedAt
      if (prog.lastWatchedTimestamp > 0 && !prog.completedAt) {
        const todayStr = now.toISOString().slice(0, 10);
        if (activityMap[todayStr] !== undefined) {
          // Estimate time spent as progressPercent * duration
          activityMap[todayStr] += Math.round(
            (prog.progressPercent / 100) * lesson.durationSeconds
          );
        }
      }
    });

    const vals = days.map((d) => activityMap[d.dateStr] || 0);
    const mx = Math.max(...vals, 1); // Avoid division by zero

    return { dayLabels: days.map((d) => d.label), values: vals, maxVal: mx };
  }, [lessons]);

  // SVG dimensions
  const W = 320;
  const H = 80;
  const padX = 12;
  const padTop = 8;
  const padBot = 4;
  const chartW = W - padX * 2;
  const chartH = H - padTop - padBot;

  // Convert values to points
  const points = values.map((v: number, i: number) => ({
    x: padX + (i / (values.length - 1)) * chartW,
    y: padTop + chartH - (v / maxVal) * chartH,
  }));

  // Build smooth bezier path
  let pathD = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    pathD += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Area fill path (under the curve)
  const areaD =
    pathD +
    ` L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  const hasActivity = values.some((v: number) => v > 0);

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" fill="none">
          {/* Gradient fill */}
          <defs>
            <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(47, 111, 237, 0.25)" />
              <stop offset="100%" stopColor="rgba(47, 111, 237, 0.02)" />
            </linearGradient>
          </defs>
          {hasActivity && (
            <>
              <path d={areaD} fill="url(#actGrad)" />
              <path
                d={pathD}
                stroke="rgba(47, 111, 237, 0.85)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              {/* Dots on points with activity */}
              {points.map(
                (pt: { x: number; y: number }, i: number) =>
                  values[i] > 0 && (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="rgba(47, 111, 237, 0.95)"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  )
              )}
            </>
          )}
          {!hasActivity && (
            <text
              x={W / 2}
              y={H / 2}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
            >
              No activity yet
            </text>
          )}
        </svg>
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-text-3 font-bold">
        {dayLabels.map((label: string, i: number) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function CoursePlayer({
  course,
  currentLessonId: initialLessonId,
  initialTime,
  enrollmentId,
  otherStudents,
  totalOtherStudents,
  isPreview = false,
}: CoursePlayerProps) {
  const { token } = useAuth();
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
  // Track whether this is the first lesson load (use initialTime from API)
  const isFirstLoadRef = useRef(true);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout>();

  // Video signed URL state
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [videoSigningParams, setVideoSigningParams] = useState<{ Policy: string; Signature: string; KeyPairId: string; expires: number } | undefined>(undefined);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [videoEncoding, setVideoEncoding] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoAreaRef = useRef<HTMLDivElement>(null);

  // Fetch signed URL when lesson changes
  useEffect(() => {
    if (!currentLessonId || !token) return;
    const lesson = allLessons.find(l => l.id === currentLessonId);
    
    // Reset video state
    setVideoSrc(undefined);
    setVideoSigningParams(undefined);
    setVideoError(null);
    setVideoEncoding(false);

    // Check if lesson has an encoded HLS video
    const hasHls = lesson?.hlsUrl && lesson?.videoStatus === 'ready';
    const hasVideo = lesson?.videoUrl;
    
    if (!hasHls && !hasVideo) {
      // No video at all
      return;
    }

    if (lesson?.videoStatus === 'encoding') {
      setVideoEncoding(true);
      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await videoApi.getStatus(currentLessonId, token);
          if (status.videoStatus === 'ready') {
            clearInterval(pollInterval);
            setVideoEncoding(false);
            // Now fetch signed URL
            try {
              const data = await videoApi.getSignedUrl(currentLessonId, token);
              setVideoSrc(data.signedManifestUrl);
              setVideoSigningParams(data.signingParams);
            } catch {
              setVideoError('Failed to load video');
            }
          } else if (status.videoStatus === 'error') {
            clearInterval(pollInterval);
            setVideoEncoding(false);
            setVideoError(status.errorMessage || 'Encoding failed');
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 5000);
      return () => clearInterval(pollInterval);
    }

    if (lesson?.videoStatus === 'error') {
      setVideoError('Video encoding failed');
      return;
    }

    // Fetch signed URL for ready video
    setLoadingSignedUrl(true);
    videoApi.getSignedUrl(currentLessonId, token)
      .then(data => {
        setVideoSrc(data.signedManifestUrl);
        setVideoSigningParams(data.signingParams);
      })
      .catch(() => {
        // Fallback to raw videoUrl if signed URL fails
        if (hasVideo) {
          setVideoSrc(lesson!.videoUrl!);
        } else {
          setVideoError('Failed to load video');
        }
      })
      .finally(() => setLoadingSignedUrl(false));
  }, [currentLessonId, token, allLessons]);

  // Load favourite/bookmark status from API
  useEffect(() => {
    favouritesApi.status(course.id).then(status => {
      setIsFavorited(status.isFavourite);
      setIsBookmarked(status.isBookmarked);
    }).catch(() => {});

    // Cleanup auto-advance timer on unmount
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [course.id]);

  const handleFavorite = async () => {
    const prev = isFavorited;
    setIsFavorited(!prev);
    try {
      const result = await favouritesApi.toggleFavourite(course.id);
      setIsFavorited(result.isFavourite);
      toast({ title: result.isFavourite ? "Added to favorites" : "Removed from favorites", variant: "success" });
    } catch {
      setIsFavorited(prev);
      toast({ title: "Failed to update", variant: "error" });
    }
  };

  const handleBookmark = async () => {
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      const result = await favouritesApi.toggleBookmark(course.id);
      setIsBookmarked(result.isBookmarked);
      toast({ title: result.isBookmarked ? "Bookmarked" : "Bookmark removed", variant: "success" });
    } catch {
      setIsBookmarked(prev);
      toast({ title: "Failed to update", variant: "error" });
    }
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
      isFirstLoadRef.current = false; // subsequent selections use lesson progress
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      setCurrentLessonId(lessonId);
    } else if (lesson?.isLocked) {
      toast({ title: "This lesson is locked", description: "Complete previous lessons first.", variant: "warning" });
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
        lastWatchedTimestamp: Math.floor(currentVideoTime),
      });

      toast({
        title: "Lesson completed!",
        description: "Great job! Keep up the good work.",
        variant: "success",
      });

      // Auto-advance to next lesson (cancel any previous timer)
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if (currentLessonIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentLessonIndex + 1];
        if (!nextLesson.isLocked) {
          autoAdvanceTimerRef.current = setTimeout(() => {
            setCurrentLessonId(nextLesson.id);
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Failed to mark as complete:", error);
    }
  }, [currentLessonId, currentLessonIndex, allLessons, currentVideoTime]);

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
            <Link to="/my-courses">
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
        <div ref={videoAreaRef}>
        {loadingSignedUrl && !videoSrc ? (
          <div className="aspect-video rounded-2xl bg-surface-2 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : videoError && !videoSrc ? (
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 border border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-body-sm font-semibold text-red-700 dark:text-red-400">Video processing failed</p>
            <p className="text-caption text-red-600/70 dark:text-red-400/60 max-w-xs text-center">{videoError}</p>
          </div>
        ) : videoEncoding && !videoSrc ? (
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-muted to-surface-3 border border-border/90 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-body-sm font-semibold text-text-2">Video is being processed...</p>
            <p className="text-caption text-text-3">This usually takes a few minutes. It will appear automatically when ready.</p>
          </div>
        ) : (
          <VideoPlayer
            ref={videoRef}
            src={videoSrc}
            signingParams={videoSigningParams}
            initialTime={
              isFirstLoadRef.current && initialTime > 0
                ? initialTime
                : (currentLesson?.progress?.lastWatchedTimestamp || 0)
            }
            onProgress={handleProgress}
            onComplete={handleComplete}
            onTimeUpdate={handleVideoTimeUpdate}
          />
        )}
        </div>

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
          <ActivityChart lessons={allLessons} />
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
