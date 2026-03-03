import { useState, useCallback, useRef, useEffect, useMemo, useId } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { favourites as favouritesApi, video as videoApi, courses, lessons as lessonsApi } from "@/lib/api-client";
import type { VideoSignedUrlResponse } from "@/lib/api-client";
import { useVideoProgress } from "@/hooks/use-video-progress";
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
import { useTranslation } from "react-i18next";

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
        qaEnabled?: boolean;
        notesEnabled?: boolean;
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
function ActivityChart({ courseId, gradientId }: { courseId: string; gradientId?: string }) {
  const { token } = useAuth();
  const [dailyData, setDailyData] = useState<Record<string, number>>({});
  const { t, i18n } = useTranslation();

  // Fetch real watch activity from backend
  useEffect(() => {
    let cancelled = false;
    const fetchActivity = async () => {
      try {
        const res = await courses.getWatchActivity(courseId, token || undefined);
        if (!cancelled && res.activity) {
          const map: Record<string, number> = {};
          res.activity.forEach((r: any) => {
            const dateStr = (r.activityDate || '').slice(0, 10);
            map[dateStr] = Number(r.watchedSeconds) || 0;
          });
          setDailyData(map);
        }
      } catch (e) { console.warn('[ActivityChart] fetch error:', e); }
    };
    fetchActivity();
    // Refresh every 2 minutes — activity data barely changes second-by-second
    const interval = setInterval(fetchActivity, 120_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [courseId, token]);

  const { dayLabels, values, maxVal } = useMemo(() => {
    const now = new Date();
    const days: { label: string; dateStr: string }[] = [];
    // Helper: format date as YYYY-MM-DD in CST timezone (matches backend storage)
    const toCST = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      // Use Intl to get day-of-week in CST to match backend
      const dow = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', timeZone: 'America/Chicago' }).format(d).toUpperCase();
      days.push({
        label: dow,
        dateStr: toCST(d),
      });
    }

    const vals = days.map((d) => dailyData[d.dateStr] || 0);
    const mx = Math.max(...vals, 1);

    return { dayLabels: days.map((d) => d.label), values: vals, maxVal: mx };
  }, [dailyData]);

  // SVG dimensions — padX=0 so points span full width, matching justify-between labels
  const W = 320;
  const H = 120;
  const padX = 0;
  const padTop = 10;
  const padBot = 6;
  const chartW = W;
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
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[110px]" fill="none">
          {/* Gradient fill */}
          <defs>
            <linearGradient id={gradientId || "actGrad"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(47, 111, 237, 0.25)" />
              <stop offset="100%" stopColor="rgba(47, 111, 237, 0.02)" />
            </linearGradient>
          </defs>
          {hasActivity && (
            <>
              <path d={areaD} fill={`url(#${gradientId || "actGrad"})`} />
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
              {t("coursePlayer.noActivityYet")}
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
  const { t, i18n } = useTranslation();
  const videoRef = useRef<VideoPlayerRef>(null);
  const chartGradientId = useId();
  const [, setSearchParams] = useSearchParams();
  const allLessons = useMemo(() => course.modules.flatMap((m) => m.lessons), [course.modules]);
  
  const [currentLessonId, setCurrentLessonId] = useState(
    initialLessonId || allLessons[0]?.id
  );
  const [showLessonList, setShowLessonList] = useState(false);
  const currentLessonElRef = useRef<HTMLButtonElement | null>(null);
  const videoAreaRef = useRef<HTMLDivElement | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  // Track whether this is the first lesson load (use initialTime from API)
  const isFirstLoadRef = useRef(true);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout>();

  // ── Progress tracking (hook) ──
  const {
    getProgress,
    handleProgress,
    handleComplete,
    handleTimeUpdate: hookTimeUpdate,
    handleSeeking,
    handleSeeked,
    saveBeforeSwitch,
    currentTimeRef,
  } = useVideoProgress({
    allLessons,
    currentLessonId,
    isPreview,
    videoRef,
  });

  // Wrap hook's handleTimeUpdate to also update UI state (for live % display + notes)
  const handleVideoTimeUpdate = useCallback((time: number) => {
    setCurrentVideoTime(time);
    hookTimeUpdate(time);
  }, [hookTimeUpdate]);

  // Signed HLS playback URL (fetched per lesson)
  const [signedVideoData, setSignedVideoData] = useState<VideoSignedUrlResponse | null>(null);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [videoEncoding, setVideoEncoding] = useState(false);

  // ── Stable initial seek time per lesson ──
  // Computed once when currentLessonId changes; does NOT update during playback
  // so that progressive saves don't cause the video to re-seek.
  const [lessonSeekTime, setLessonSeekTime] = useState<number>(() => {
    console.log("[CoursePlayer] init lessonSeekTime:", initialTime, "lesson:", initialLessonId);
    return initialTime > 0 ? initialTime : 0;
  });

  // Sync lessonSeekTime when initialTime prop changes (e.g. query refetch with fresh saved position)
  const prevInitialTimeRef = useRef(initialTime);
  useEffect(() => {
    if (initialTime !== prevInitialTimeRef.current) {
      console.log("[CoursePlayer] initialTime prop changed:", prevInitialTimeRef.current, "→", initialTime);
      prevInitialTimeRef.current = initialTime;
      setLessonSeekTime(initialTime > 0 ? initialTime : 0);
    }
  }, [initialTime]);

  // Scroll to current lesson when bottom sheet opens
  useEffect(() => {
    if (showLessonList) {
      setTimeout(() => {
        currentLessonElRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 350);
    }
  }, [showLessonList]);

  // State for video encoding error message
  const [videoError, setVideoError] = useState<string | null>(null);

  // Fetch signed URL when lesson changes (for HLS playback via CloudFront)
  useEffect(() => {
    if (!currentLessonId) return;
    let cancelled = false;
    setSignedVideoData(null);
    setLoadingSignedUrl(true);
    setVideoEncoding(false);
    setVideoError(null);
    
    videoApi.getSignedUrl(currentLessonId).then(data => {
      if (!cancelled) {
        setSignedVideoData(data);
        setLoadingSignedUrl(false);
      }
    }).catch(async (err) => {
      if (!cancelled) {
        // Check if the video is still encoding or errored
        try {
          const status = await videoApi.getStatus(currentLessonId);
          if (!cancelled) {
            if (status.videoStatus === 'encoding') {
              setVideoEncoding(true);
            } else if (status.videoStatus === 'error') {
              setVideoError(status.errorMessage || 'Video encoding failed');
            }
          }
        } catch { /* ignore */ }
        setSignedVideoData(null);
        setLoadingSignedUrl(false);
      }
    });
    return () => { cancelled = true; };
  }, [currentLessonId]);

  // Auto-poll when video is encoding — check every 8s until ready or errored
  useEffect(() => {
    if (!videoEncoding || !currentLessonId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const status = await videoApi.getStatus(currentLessonId);
        if (cancelled) return;
        if (status.videoStatus === 'ready') {
          setVideoEncoding(false);
          // Re-fetch signed URL now that encoding is complete
          try {
            const data = await videoApi.getSignedUrl(currentLessonId);
            if (!cancelled) {
              setSignedVideoData(data);
            }
          } catch { /* will be retried on next lesson switch */ }
        } else if (status.videoStatus === 'error') {
          setVideoEncoding(false);
          setVideoError(status.errorMessage || 'Video encoding failed');
        }
      } catch { /* ignore, retry next interval */ }
    }, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [videoEncoding, currentLessonId]);

  // Load favourite/bookmark status + cleanup auto-advance timer
  useEffect(() => {
    if (!isPreview) {
      favouritesApi.status(course.id).then(status => {
        setIsFavorited(status.isFavourite);
        setIsBookmarked(status.isBookmarked);
      }).catch(() => {});
    }

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [course.id, isPreview]);

  const handleFavorite = async () => {
    const prev = isFavorited;
    setIsFavorited(!prev);
    try {
      const result = await favouritesApi.toggleFavourite(course.id);
      setIsFavorited(result.isFavourite);
      toast({ title: result.isFavourite ? t("coursePlayer.addedToFavorites") : t("coursePlayer.removedFromFavorites"), variant: "success" });
    } catch {
      setIsFavorited(prev);
      toast({ title: t("coursePlayer.failedToUpdate"), variant: "error" });
    }
  };

  const handleBookmark = async () => {
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      const result = await favouritesApi.toggleBookmark(course.id);
      setIsBookmarked(result.isBookmarked);
      toast({ title: result.isBookmarked ? t("coursePlayer.bookmarked") : t("coursePlayer.bookmarkRemoved"), variant: "success" });
    } catch {
      setIsBookmarked(prev);
      toast({ title: t("coursePlayer.failedToUpdate"), variant: "error" });
    }
  };

  const currentLesson = allLessons.find((l) => l.id === currentLessonId);
  const currentLessonIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => {
    const p = getProgress(l);
    return !!p.completedAt || p.progressPercent >= 100;
  }).length;
  const totalDuration = allLessons.reduce((sum, l) => sum + l.durationSeconds, 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Current lesson's live watch progress (real-time from video time)
  // Prefer actual video duration from the player, fall back to metadata
  const actualDuration = videoRef.current?.getDuration() || currentLesson?.durationSeconds || 0;
  const currentLessonLivePercent = actualDuration > 0
    ? Math.min(Math.round((currentVideoTime / actualDuration) * 100), 100)
    : (currentLesson ? getProgress(currentLesson).progressPercent : 0);
  const isCurrentLessonCompleted = currentLesson ? !!getProgress(currentLesson).completedAt : false;

  // Derive the actual video src: prefer signed HLS, fall back to raw videoUrl
  const videoSrc = signedVideoData?.signedManifestUrl || currentLesson?.videoUrl || null;
  const videoSigningParams = signedVideoData?.signingParams || null;

  const handleLessonSelect = useCallback((lessonId: string) => {
    const lesson = allLessons.find((l) => l.id === lessonId);
    if (lesson && !lesson.isLocked) {
      // Save progress of current lesson before switching
      saveBeforeSwitch();
      isFirstLoadRef.current = false;
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      // Compute seek time from the target lesson's progress
      const targetProgress = getProgress(lesson);
      setLessonSeekTime(targetProgress?.lastWatchedTimestamp || 0);
      setCurrentLessonId(lessonId);
      setCurrentVideoTime(0);
      setVideoEnded(false);
      setSearchParams({ lesson: lessonId }, { replace: true });
      // On mobile, scroll up to video area after lesson select
      setTimeout(() => {
        videoAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (lesson?.isLocked) {
      toast({ title: t("coursePlayer.lessonLocked"), description: t("coursePlayer.completePreviousFirst"), variant: "warning" });
    }
  }, [allLessons, saveBeforeSwitch, getProgress, setSearchParams]);

  const handleVideoEnded = useCallback(() => {
    setVideoEnded(true);
  }, []);

  const handleVideoEvent = useCallback((event: string, data?: Record<string, any>) => {
    if (!currentLessonId) return;
    lessonsApi.sendVideoEvent({
      event: event as any,
      lessonId: currentLessonId,
      courseId: course.id,
      ...data,
    }).catch(() => {});
  }, [currentLessonId, course.id]);

  const nextLesson = currentLessonIndex < allLessons.length - 1
    ? allLessons[currentLessonIndex + 1]
    : null;
  const nextLessonAvailable = nextLesson && !nextLesson.isLocked;

  const handleSeekToTimestamp = useCallback((time: number) => {
    videoRef.current?.seekTo(time);
  }, []);


  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-3.5 lg:h-full overflow-x-hidden">
      {/* Preview Mode Banner */}
      {isPreview && (
        <div className="w-full bg-amber-500 text-white text-center py-2 px-4 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 lg:col-span-2" style={{ order: -1 }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          {t("coursePlayer.previewMode")}
        </div>
      )}
      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 lg:gap-3.5 overflow-x-hidden lg:overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="flex items-center gap-2.5 lg:gap-3 flex-shrink-0">
          <Button asChild variant="secondary" size="icon" className="h-10 w-10 flex-shrink-0 rounded-[14px]">
            <Link to={isPreview ? `/manage-courses/${course.id}/edit` : "/my-courses"}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-body lg:text-[22px] lg:leading-tight font-extrabold text-text-1 truncate tracking-tight">{course.title}</h1>
            <p className="text-caption text-text-2 hidden sm:block mt-0.5">
              {t("coursePlayer.instructor")} &nbsp;<span className="font-semibold text-primary-600">{course.creator.name}</span>
            </p>
          </div>
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Preview: Edit Course link */}
            {isPreview && (
              <Link to={`/manage-courses/${course.id}/edit`} className="text-caption font-semibold text-primary hover:underline">{t("coursePlayer.editCourse")}</Link>
            )}
            {/* Other Students */}
            {!isPreview && totalOtherStudents > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <div className="flex">
                  {otherStudents.slice(0, 3).map((student, idx) => (
                    <div
                      key={student.id}
                      className="w-7 h-7 rounded-full border-2 border-white dark:border-card overflow-hidden"
                      style={{ marginLeft: idx > 0 ? "-8px" : 0, zIndex: 4 - idx }}
                      title={student.name || "Student"}
                    >
                      {student.image ? (
                        <img
                          src={student.image}
                          alt={student.name || "Student"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{
                            background: idx === 0 
                              ? "linear-gradient(135deg, #2f6fed, #38bdf8)"
                              : idx === 1 
                                ? "linear-gradient(135deg, #38bdf8, #8cffcb)"
                                : "linear-gradient(135deg, #8cffcb, #2f6fed)"
                          }}
                        >
                          {(student.name || "S").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {totalOtherStudents > 3 && (
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white dark:border-card bg-muted flex items-center justify-center text-[10px] font-bold text-text-2"
                      style={{ marginLeft: "-8px", zIndex: 1 }}
                    >
                      +{totalOtherStudents - 3}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-text-3">
                  {t("coursePlayer.otherStudent", { count: totalOtherStudents })}
                </span>
              </div>
            )}

            {!isPreview && <>
            <Button 
              variant="secondary" 
              size="sm" 
              className="gap-1.5"
              onClick={() => setShowRatingDialog(true)}
            >
              <Star className="w-4 h-4" />
              {t("coursePlayer.leaveRating")}
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
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast({ title: t("coursePlayer.linkCopied"), variant: "success" });
                } catch {
                  try {
                    await navigator.share?.({ url: window.location.href });
                  } catch {
                    toast({ title: t("coursePlayer.couldNotCopyLink"), variant: "error" });
                  }
                }
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
            </>}
          </div>
        </div>

        {/* Video Player */}
        <div ref={videoAreaRef} className="w-full flex-shrink-0 lg:flex-[3] lg:min-h-0" style={{ minHeight: 0 }}>
        {loadingSignedUrl && !videoSrc ? (
          <div className="aspect-video lg:aspect-auto lg:h-full rounded-[22px] bg-surface-2 flex items-center justify-center border border-border/60" style={{ boxShadow: '0 14px 40px rgba(21,25,35,0.08)' }}>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : videoError && !videoSrc ? (
          <div className="aspect-video lg:aspect-auto lg:h-full rounded-[22px] bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/10 border border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center gap-3" style={{ boxShadow: '0 14px 40px rgba(21,25,35,0.08)' }}>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-body-sm font-semibold text-red-700 dark:text-red-400">{t("coursePlayer.videoFailed")}</p>
            <p className="text-caption text-red-600/70 dark:text-red-400/60 max-w-xs text-center">{videoError}</p>
          </div>
        ) : videoEncoding && !videoSrc ? (
          <div className="aspect-video lg:aspect-auto lg:h-full rounded-[22px] bg-gradient-to-br from-muted to-surface-3 border border-border/90 flex flex-col items-center justify-center gap-3" style={{ boxShadow: '0 14px 40px rgba(21,25,35,0.08)' }}>
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-body-sm font-semibold text-text-2">{t("coursePlayer.videoProcessing")}</p>
            <p className="text-caption text-text-3">{t("coursePlayer.videoProcessingHint")}</p>
          </div>
        ) : (
          <div className="lg:h-full relative" style={{ boxShadow: '0 14px 40px rgba(21,25,35,0.08)', borderRadius: '22px' }}>
          <VideoPlayer
            ref={videoRef}
            src={videoSrc}
            signingParams={videoSigningParams}
            className="lg:!aspect-auto lg:h-full lg:!rounded-[22px]"
            initialTime={lessonSeekTime}
            onProgress={handleProgress}
            onComplete={handleComplete}
            onTimeUpdate={handleVideoTimeUpdate}
            onSeeking={handleSeeking}
            onSeeked={handleSeeked}
            onEnded={handleVideoEnded}
            onVideoEvent={handleVideoEvent}
          />
          {/* Next Lesson Overlay — shown when video reaches the end */}
          {videoEnded && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm" style={{ borderRadius: '22px' }}>
              {nextLessonAvailable ? (
                <>
                  <CheckCircle className="w-12 h-12 text-success mb-3" />
                  <p className="text-white font-bold text-body mb-1">{t("coursePlayer.lessonComplete")}</p>
                  <p className="text-white/70 text-body-sm mb-5">{t("coursePlayer.upNext")}</p>
                  <p className="text-white font-semibold text-body-sm mb-6 max-w-xs text-center truncate px-4">{nextLesson!.title}</p>
                  <button
                    onClick={() => handleLessonSelect(nextLesson!.id)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-body-sm hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    {t("coursePlayer.playNextLesson")}
                  </button>
                  <button
                    onClick={() => setVideoEnded(false)}
                    className="mt-3 text-white/60 text-caption hover:text-white/90 transition-colors"
                  >
                    {t("coursePlayer.stayOnThisLesson")}
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle className="w-14 h-14 text-success mb-3" />
                  <p className="text-white font-bold text-h3 mb-1">{currentLessonIndex === allLessons.length - 1 ? t("coursePlayer.courseComplete") : t("coursePlayer.lessonComplete")}</p>
                  <p className="text-white/60 text-body-sm mb-5">{currentLessonIndex === allLessons.length - 1 ? t("coursePlayer.courseCompleteMsg") : t("coursePlayer.nextLessonLocked")}</p>
                  <button
                    onClick={() => setVideoEnded(false)}
                    className="px-6 py-3 rounded-xl bg-white/20 text-white font-bold text-body-sm hover:bg-white/30 transition-colors"
                  >
                    {t("coursePlayer.dismiss")}
                  </button>
                </>
              )}
            </div>
          )}
          </div>
        )}
        </div>

        {/* Mobile Lesson Info & Controls */}
        <div className="lg:hidden space-y-3">
          {/* Mobile Next Lesson Card — shown when video ends */}
          {videoEnded && (
            <div className="mobile-card border-2 border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
              {nextLessonAvailable ? (
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-semibold text-success mb-0.5">{t("coursePlayer.lessonComplete")}</p>
                    <p className="text-body-sm font-bold text-text-1 truncate">{nextLesson!.title}</p>
                  </div>
                  <button
                    onClick={() => handleLessonSelect(nextLesson!.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-body-sm hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0"
                  >
                    <Play className="w-4 h-4" fill="currentColor" />
                    Next
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-bold text-text-1">
                      {currentLessonIndex === allLessons.length - 1 ? t("coursePlayer.courseCompleteEmoji") : t("coursePlayer.lessonComplete")}
                    </p>
                    <p className="text-caption text-text-3">
                      {currentLessonIndex === allLessons.length - 1 ? t("coursePlayer.greatJobFinished") : t("coursePlayer.nextLessonLocked")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Lesson Info Card */}
          <div className="mobile-card">
            <div className="flex items-start gap-3">
              <span className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                isCurrentLessonCompleted ? "bg-success/10" : "bg-primary/10"
              )}>
                {isCurrentLessonCompleted 
                  ? <CheckCircle className="w-5 h-5 text-success" />
                  : <Play className="w-4 h-4 text-primary ml-0.5" fill="currentColor" />
                }
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-3 font-medium mb-0.5">
                  {t("coursePlayer.lessonXofY", { current: currentLessonIndex + 1, total: totalLessons })}
                </p>
                <h3 className="text-body-sm font-bold text-text-1 truncate">
                  {currentLesson?.title || t("coursePlayer.selectALesson")}
                </h3>
              </div>
              <div className="flex flex-col items-end">
                {isCurrentLessonCompleted ? (
                  <>
                    <span className="text-body-sm font-bold text-success">{t("coursePlayer.done")}</span>
                    <span className="text-[10px] text-success/70">{t("coursePlayer.completed")}</span>
                  </>
                ) : (
                  <>
                    <span className="text-h3 font-bold text-primary">{currentLessonLivePercent}%</span>
                    <span className="text-[10px] text-text-3">{t("coursePlayer.watched")}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Progress bar — current lesson live progress */}
            <div className="mt-3">
              <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isCurrentLessonCompleted 
                      ? "bg-gradient-to-r from-success to-success/80" 
                      : "bg-gradient-to-r from-primary to-primary-600"
                  )}
                  style={{ width: `${isCurrentLessonCompleted ? 100 : currentLessonLivePercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-text-3">{isCurrentLessonCompleted ? t("coursePlayer.completedLabel") : t("coursePlayer.thisLesson")}</span>
                <span className="text-[10px] text-text-3 font-medium">{t("coursePlayer.lessonsComplete", { completed: completedLessons, total: totalLessons })}</span>
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
              disabled={currentLessonIndex === 0 || allLessons[currentLessonIndex - 1]?.isLocked}
            >
              <SkipBack className="w-4 h-4 mr-1" />
              {t("coursePlayer.previous")}
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
              {t("coursePlayer.next")}
              <SkipForward className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {/* Mobile Action Bar */}
          {!isPreview && <div className="flex items-center justify-around py-2 px-4 rounded-2xl bg-muted/50 border border-border/50">
            <button 
              onClick={handleFavorite}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Heart className={cn(
                "w-5 h-5 transition-colors",
                isFavorited ? "fill-red-500 text-red-500" : "text-text-2"
              )} />
              <span className="text-[10px] font-medium text-text-3">{t("coursePlayer.favorite")}</span>
            </button>
            
            <button 
              onClick={handleBookmark}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Bookmark className={cn(
                "w-5 h-5 transition-colors",
                isBookmarked ? "fill-primary text-primary" : "text-text-2"
              )} />
              <span className="text-[10px] font-medium text-text-3">{t("coursePlayer.bookmark")}</span>
            </button>
            
            <button 
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast({ title: t("coursePlayer.linkCopied"), variant: "success" });
                } catch {
                  try {
                    await navigator.share?.({ url: window.location.href });
                  } catch {
                    toast({ title: t("coursePlayer.couldNotCopyLink"), variant: "error" });
                  }
                }
              }}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Share2 className="w-5 h-5 text-text-2" />
              <span className="text-[10px] font-medium text-text-3">{t("coursePlayer.share")}</span>
            </button>
            
            <button 
              onClick={() => setShowRatingDialog(true)}
              className="flex flex-col items-center gap-1 py-2 px-4 active:scale-95 transition-all"
            >
              <Star className="w-5 h-5 text-text-2" />
              <span className="text-[10px] font-medium text-text-3">{t("coursePlayer.rate")}</span>
            </button>
          </div>}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="flex-1 lg:flex-[2] lg:min-h-0 flex flex-col" style={{ minHeight: 0 }}>
          <TabsList className="w-full lg:w-max justify-start overflow-x-auto flex-shrink-0">
            <TabsTrigger value="overview" className="text-[13px] font-semibold lg:flex-none">{t("coursePlayer.overview")}</TabsTrigger>
            {(currentLesson as any)?.qaEnabled !== false && (
              <TabsTrigger value="qa" className="text-[13px] font-semibold lg:flex-none">{t("coursePlayer.qa")}</TabsTrigger>
            )}
            {(currentLesson as any)?.notesEnabled !== false && (
              <TabsTrigger value="notes" className="text-[13px] font-semibold lg:flex-none">{t("coursePlayer.notes")}</TabsTrigger>
            )}
            <TabsTrigger value="resources" className="text-[13px] font-semibold lg:flex-none">{t("coursePlayer.resources")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            {/* Course Stats — lightweight chips matching design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3 mb-3">
              <div className="flex items-center gap-2.5 rounded-[18px] bg-white/92 dark:bg-card/90 border border-border/60 px-3 py-2.5">
                <BarChart3 className="w-[18px] h-[18px] text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-text-3 font-semibold uppercase tracking-wide leading-none">{t("coursePlayer.skillLevel")}</div>
                  <div className="text-[13px] font-bold text-text-1 truncate mt-0.5">
                    {course.level?.replace("_", " ") || t("coursePlayer.allLevels")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-[18px] bg-white/92 dark:bg-card/90 border border-border/60 px-3 py-2.5">
                <Clock className="w-[18px] h-[18px] text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-text-3 font-semibold uppercase tracking-wide leading-none">{t("coursePlayer.courseLength")}</div>
                  <div className="text-[13px] font-bold text-text-1 mt-0.5">
                    {Math.round(totalDuration / 60)} {t("coursePlayer.min")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-[18px] bg-white/92 dark:bg-card/90 border border-border/60 px-3 py-2.5">
                <Users className="w-[18px] h-[18px] text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-text-3 font-semibold uppercase tracking-wide leading-none">{t("coursePlayer.progress")}</div>
                  <div className="text-[13px] font-bold text-text-1 mt-0.5">
                    {completedLessons}/{totalLessons}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-[18px] bg-white/92 dark:bg-card/90 border border-border/60 px-3 py-2.5">
                <Globe className="w-[18px] h-[18px] text-text-2 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-text-3 font-semibold uppercase tracking-wide leading-none">{t("coursePlayer.language")}</div>
                  <div className="text-[13px] font-bold text-text-1 mt-0.5">
                    {course.language}
                  </div>
                </div>
              </div>
            </div>

            {/* Lesson Description */}
            {currentLesson?.description && (
              <div className="px-0.5">
                <h3 className="text-[15px] font-bold text-text-1 mb-1">
                  {currentLesson.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-text-2">
                  {currentLesson.description}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="qa" className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            {currentLessonId && (
              <QASection 
                lessonId={currentLessonId} 
                courseCreatorId={course.creator.id}
              />
            )}
          </TabsContent>

          <TabsContent value="notes" className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            {currentLessonId && (
              <NotesSection
                lessonId={currentLessonId}
                currentTime={currentVideoTime}
                onSeek={handleSeekToTimestamp}
              />
            )}
          </TabsContent>

          <TabsContent value="resources" className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
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
                        {t("coursePlayer.download")}
                      </a>
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center">
                <p className="text-body-sm text-text-2">
                  {t("coursePlayer.noResources")}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Sidebar - Lesson List */}
      <aside className="hidden lg:flex w-[600px] flex-shrink-0 rounded-[22px] bg-white/85 dark:bg-card/85 border border-border/70 p-3.5 flex-col gap-3.5">
        <div className="flex items-center justify-between flex-shrink-0">
          <h3 className="text-[14px] font-extrabold text-text-1">{t("coursePlayer.courseContent")}</h3>
          <span className="text-[12px] font-semibold text-text-3">{t("coursePlayer.lessonsCount", { count: totalLessons })}</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 scrollbar-thin">
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
                    progress={getProgress(lesson)}
                    isCurrentLesson={lesson.id === currentLessonId}
                    onClick={() => handleLessonSelect(lesson.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Your Time on the Course — pushed to bottom like design */}
        <div className="mt-auto flex-shrink-0 rounded-[18px] bg-white/92 dark:bg-card/90 border border-border/60 p-3 pt-2.5">
          <h4 className="text-[12px] font-extrabold text-text-1 mb-2">
            {t("coursePlayer.yourTimeOnCourse")}
          </h4>
          <ActivityChart courseId={course.id} gradientId={chartGradientId} />
        </div>
      </aside>

      {/* Mobile Lesson List Bottom Sheet */}
      <BottomSheet
        isOpen={showLessonList}
        onClose={() => setShowLessonList(false)}
        title={t("coursePlayer.courseContent")}
        subtitle={t("coursePlayer.completedCount", { completed: `${completedLessons}/${totalLessons}` })}
        maxHeight="85vh"
      >
        {/* Progress Section */}
        <div className="px-4 py-4 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-medium text-text-2">{t("coursePlayer.yourProgress")}</span>
            <span className="text-body-sm font-bold text-primary">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/50 dark:bg-card/50 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary-600 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-text-3">
            <span>{t("coursePlayer.completedCount", { completed: completedLessons })}</span>
            <span>{t("coursePlayer.remainingCount", { remaining: totalLessons - completedLessons })}</span>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="px-4 py-3 border-b border-border/30 flex gap-2 overflow-x-auto scrollbar-hide">
          {course.modules.map((module, idx) => {
            const moduleCompleted = module.lessons.filter(l => getProgress(l).completedAt).length;
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
                  const mergedProgress = getProgress(lesson);
                  const isCompleted = mergedProgress?.completedAt;
                  const isCurrent = lesson.id === currentLessonId;
                  const isLocked = lesson.isLocked;
                  
                  return (
                    <button
                      key={lesson.id}
                      ref={isCurrent ? currentLessonElRef : undefined}
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
                          {Math.floor(lesson.durationSeconds / 60)} {t("coursePlayer.min")}
                          {isCompleted && (
                            <span className={isCurrent ? "text-white/90" : "text-success"}> • ✓ {t("coursePlayer.completedMark")}</span>
                          )}
                          {!isCompleted && mergedProgress && mergedProgress.progressPercent > 0 && (
                            <span className={isCurrent ? "text-white/90" : "text-primary"}> • {t("coursePlayer.watchedPercent", { percent: Math.round(mergedProgress.progressPercent) })}</span>
                          )}
                        </p>
                        {/* Progress bar for partially watched lessons */}
                        {!isCompleted && mergedProgress && mergedProgress.progressPercent > 0 && (
                          <div className={cn(
                            "mt-1.5 w-full h-1.5 rounded-full overflow-hidden",
                            isCurrent ? "bg-white/20" : "bg-primary/15"
                          )}>
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isCurrent ? "bg-white/80" : "bg-primary"
                              )}
                              style={{ width: `${Math.round(mergedProgress.progressPercent)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Progress indicator for partially watched */}
                      {!isCompleted && mergedProgress && mergedProgress.progressPercent > 0 && (
                        <div className="w-8 h-8 relative flex-shrink-0">
                          <svg className="w-8 h-8 -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              className={isCurrent ? "text-white/20" : "text-primary/20"}
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeDasharray={`${(mergedProgress.progressPercent / 100) * 75.4} 75.4`}
                              className={isCurrent ? "text-white" : "text-primary"}
                            />
                          </svg>
                          <span className={cn(
                            "absolute inset-0 flex items-center justify-center text-[8px] font-bold",
                            isCurrent ? "text-white" : "text-primary"
                          )}>
                            {Math.round(mergedProgress.progressPercent)}
                          </span>
                        </div>
                      )}
                      {/* Completed checkmark */}
                      {isCompleted && !isCurrent && (
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
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
