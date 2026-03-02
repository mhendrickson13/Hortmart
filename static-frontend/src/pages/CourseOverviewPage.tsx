import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { courses as coursesApi, favourites as favouritesApi, video as videoApi, type CourseWithDetails } from "@/lib/api-client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReviewsSection } from "@/components/learner/reviews-section";
import { VideoPlayer } from "@/components/learner/video-player";
import { Play, Clock, Users, Globe, BarChart3, Lock, Star, CheckCircle2, Loader2, ChevronDown, ChevronUp, Heart, Share2, Bookmark, BookOpen, X } from "lucide-react";
import { formatDuration, formatPrice, getInitials, cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

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

export default function CourseOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllModules, setShowAllModules] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Preview video inline state
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [previewVideoSrc, setPreviewVideoSrc] = useState<string | null>(null);
  const [previewSigningParams, setPreviewSigningParams] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLessonTitle, setPreviewLessonTitle] = useState<string>("");
  const coverRef = useRef<HTMLDivElement>(null);

  // Force anonymous/public rendering even if a user is logged in.
  // Example: /course/:id?public=1
  const isPublicView = (() => {
    const v = (searchParams.get("public") || "").toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  })();
  const viewerUser = isPublicView ? null : user;
  const viewerToken = isPublicView ? null : (token || undefined);

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const response = await coursesApi.get(id!, viewerToken);
        const courseData = response.course;
        if (!courseData || courseData.status !== "PUBLISHED") { setLoading(false); return; }
        setCourse(courseData);
        if (viewerToken && viewerUser?.role === "LEARNER") {
          try {
            const enrollment = await coursesApi.checkEnrollment(id!, viewerToken);
            setIsEnrolled(enrollment.enrolled);
          } catch { setIsEnrolled(false); }
        } else {
          setIsEnrolled(false);
        }

        if (viewerToken) {
          try {
            const status = await favouritesApi.status(id!, viewerToken as string);
            setIsFavourite(status.isFavourite);
            setIsBookmarked(status.isBookmarked);
          } catch { /* not critical */ }
        }
      } catch (error) { console.error("Failed to fetch course:", error); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [id, viewerToken, viewerUser?.role, authLoading]);

  // Dynamic OG meta tags for JS-enabled crawlers (Google) and browser tab
  useEffect(() => {
    if (!course) return;
    const origTitle = document.title;
    document.title = `${course.title} — CXFlow Academy`;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("og:title", course.title);
    setMeta("og:description", course.subtitle || course.description?.replace(/<[^>]*>/g, "").slice(0, 200) || "");
    setMeta("og:url", window.location.href);
    setMeta("og:type", "website");
    setMeta("og:site_name", "CXFlow Academy");
    if (course.coverImage) setMeta("og:image", course.coverImage);

    return () => {
      document.title = origTitle;
    };
  }, [course]);

  const handleToggleFavourite = useCallback(async () => {
    if (isPublicView || !viewerUser || !viewerToken) {
      navigate("/login", { state: { from: { pathname: window.location.pathname + window.location.search } } });
      return;
    }
    const prev = isFavourite;
    setIsFavourite(!prev);
    try {
      const result = await favouritesApi.toggleFavourite(id!, viewerToken as string);
      setIsFavourite(result.isFavourite);
      toast({ title: result.isFavourite ? t("courses.favouriteAdded") : t("courses.favouriteRemoved"), variant: "success" });
    } catch {
      setIsFavourite(prev);
      toast({ title: t("common.error"), description: t("courses.updateFailed"), variant: "error" });
    }
  }, [isPublicView, viewerUser, viewerToken, id, navigate, isFavourite, t]);

  const handleToggleBookmark = useCallback(async () => {
    if (isPublicView || !viewerUser || !viewerToken) {
      navigate("/login", { state: { from: { pathname: window.location.pathname + window.location.search } } });
      return;
    }
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      const result = await favouritesApi.toggleBookmark(id!, viewerToken as string);
      setIsBookmarked(result.isBookmarked);
      toast({ title: result.isBookmarked ? t("courses.bookmarked") : t("courses.bookmarkRemoved"), variant: "success" });
    } catch {
      setIsBookmarked(prev);
      toast({ title: t("common.error"), description: t("courses.updateFailed"), variant: "error" });
    }
  }, [isPublicView, viewerUser, viewerToken, id, navigate, isBookmarked, t]);

  const handleEnroll = useCallback(async () => {
    if (isPublicView || !viewerUser || !viewerToken) {
      navigate("/login", { state: { from: { pathname: window.location.pathname + window.location.search } } });
      return;
    }

    if (viewerUser.role !== "LEARNER") {
      toast({ title: t("courses.enrollmentNotAvailable"), description: t("courses.enrollmentLearnerOnly"), variant: "warning" });
      return;
    }
    setEnrolling(true);
    try { await coursesApi.enroll(id!, viewerToken); setIsEnrolled(true); toast({ title: t("courses.enrolledSuccessfully"), variant: "success" }); }
    catch (error: any) { toast({ title: t("courses.enrollmentFailed"), description: error?.message || t("common.tryAgain"), variant: "error" }); }
    finally { setEnrolling(false); }
  }, [isPublicView, viewerUser, viewerToken, id, navigate, t]);

  const handlePreviewLesson = useCallback(async (lessonId: string, lessonTitle: string) => {
    if (!viewerToken) {
      navigate("/login", { state: { from: { pathname: window.location.pathname + window.location.search } } });
      return;
    }
    setPreviewLessonId(lessonId);
    setPreviewLessonTitle(lessonTitle);
    setPreviewLoading(true);
    setPreviewVideoSrc(null);
    setPreviewSigningParams(null);
    // Scroll to cover image area
    setTimeout(() => coverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    try {
      const data = await videoApi.getSignedUrl(lessonId, viewerToken as string);
      setPreviewVideoSrc(data.signedManifestUrl);
      setPreviewSigningParams(data.signingParams);
    } catch {
      toast({ title: t("coursePreview.noVideoAvailable"), description: t("coursePreview.noVideoForLesson"), variant: "warning" });
      setPreviewLessonId(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [viewerToken, id, navigate, t]);

  const closePreview = useCallback(() => {
    setPreviewLessonId(null);
    setPreviewVideoSrc(null);
    setPreviewSigningParams(null);
  }, []);

  // Early returns AFTER all hooks
  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!course) return <div className="text-center py-8"><p className="text-text-2">{t("coursePreview.courseNotFound")}</p><Link to="/courses" className="text-primary font-bold">{t("coursePreview.backToCourses")}</Link></div>;

  const allLessons = (course.modules || []).flatMap((m) => m.lessons || []);
  const totalDuration = allLessons.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
  const totalLessons = allLessons.length;
  const totalModules = (course.modules || []).length;
  const avgRating = course.avgRating || course.averageRating || 0;
  const reviewCount = course._count?.reviews || 0;
  const enrollmentCount = course._count?.enrollments || 0;
  const visibleModules = showAllModules ? course.modules || [] : (course.modules || []).slice(0, 3);
  const hasMoreModules = totalModules > 3;

  let learningOutcomes: string[] = [];
  if (course.whatYouWillLearn) {
    try { learningOutcomes = JSON.parse(course.whatYouWillLearn); }
    catch { learningOutcomes = course.whatYouWillLearn.split("\n").filter(Boolean); }
  }

  return (
    <>
      {/* ========== MOBILE LAYOUT ========== */}
      <div className="lg:hidden flex flex-col gap-3 pb-36 overflow-x-hidden">
        {/* Cover Image / Preview Video */}
        <div ref={coverRef} className="rounded-2xl overflow-hidden relative aspect-video max-h-[240px] sm:max-h-[280px]">
          {previewLessonId ? (
            <div className="relative w-full h-full">
              {previewLoading && !previewVideoSrc ? (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              ) : (
                <VideoPlayer
                  src={previewVideoSrc}
                  signingParams={previewSigningParams}
                  className="w-full h-full"
                  previewMode
                />
              )}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-[11px] font-semibold text-white truncate max-w-[70%]">{previewLessonTitle}</span>
                <button onClick={closePreview} className="w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {course.coverImage ? (
                <img src={course.coverImage || undefined} alt={course.title} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full gradient-primary" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              {isEnrolled && (
                <Link to={`/player/${course.id}`} className="absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"><Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" /></span>
                </Link>
              )}
              {course.category && (
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-primary-600">{course.category}</span>
              )}
            </div>
          )}
        </div>

        {/* Title & Subtitle */}
        <div>
          <h1 className="text-body font-bold text-text-1 leading-snug">{course.title}</h1>
          {course.subtitle && <p className="text-caption text-text-2 mt-0.5">{course.subtitle}</p>}
        </div>

        {/* Instructor + Rating + Students (single compact row) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Avatar className="w-5 h-5"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback className="text-[9px]">{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
              <span className="text-caption font-semibold text-primary-600">{course.creator?.name || t("courses.instructor")}</span>
            </div>
            {enrollmentCount > 0 && (
              <span className="text-caption text-text-3 flex items-center gap-1"><Users className="w-3 h-3" />{enrollmentCount}</span>
            )}
          </div>
          {reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-caption font-bold text-text-1">{Number(avgRating).toFixed(1)}</span>
              <span className="text-caption text-text-3">({reviewCount})</span>
            </div>
          )}
        </div>

        {/* Quick Stats - 2x2 grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <BarChart3 className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">{t("courses.level")}</div>
              <div className="text-caption font-semibold text-text-1 truncate">{(course.level || "ALL_LEVELS").replace("_", " ")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">{t("courses.duration")}</div>
              <div className="text-caption font-semibold text-text-1">{formatDuration(totalDuration)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">{t("courses.lessons")}</div>
              <div className="text-caption font-semibold text-text-1">{totalLessons} {t(totalLessons === 1 ? "courses.lesson" : "courses.lessons")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <Globe className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">{t("courses.language")}</div>
              <div className="text-caption font-semibold text-text-1 truncate">{course.language || t("coursePreview.defaultLanguage")}</div>
            </div>
          </div>
        </div>

        {/* Action bar - like course player */}
        <div className="flex items-center justify-around py-2 px-3 rounded-2xl bg-muted/50 border border-border/50">
          <button onClick={handleToggleFavourite} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-all">
            <Heart className={cn("w-5 h-5", isFavourite ? "fill-red-500 text-red-500" : "text-text-2")} />
            <span className="text-[10px] font-medium text-text-3">{t("courses.favourite")}</span>
          </button>
          <button onClick={handleToggleBookmark} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-all">
            <Bookmark className={cn("w-5 h-5", isBookmarked ? "fill-blue-500 text-blue-500" : "text-text-2")} />
            <span className="text-[10px] font-medium text-text-3">{t("courses.bookmark")}</span>
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: t("common.linkCopied"), variant: "success" }); }} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-all">
            <Share2 className="w-5 h-5 text-text-2" />
            <span className="text-[10px] font-medium text-text-3">{t("courses.share")}</span>
          </button>
        </div>

        {/* What You'll Learn */}
        {learningOutcomes.length > 0 && (
          <Card className="p-4">
            <h2 className="text-body-sm font-bold text-text-1 mb-3">{t("courses.whatYouWillLearn")}</h2>
            <div className="space-y-2">
              {learningOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-caption text-text-2">{outcome}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Description */}
        <Card className="p-4">
          <h2 className="text-body-sm font-bold text-text-1 mb-2">{t("courses.aboutCourse")}</h2>
          <p className="text-caption text-text-2 whitespace-pre-line leading-relaxed">{course.description || t("coursePreview.noDescription")}</p>
        </Card>

        {/* Instructor */}
        <Card id="instructor" className="p-4 scroll-mt-4">
          <h2 className="text-body-sm font-bold text-text-1 mb-3">{t("courses.instructor")}</h2>
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback>{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-body-sm font-bold text-text-1">{course.creator?.name || t("courses.instructor")}</h3>
              <p className="text-caption text-primary-600 mb-1">{t("coursePreview.courseInstructor")}</p>
              <p className="text-caption text-text-2 leading-relaxed">{course.creator?.bio || t("coursePreview.experiencedInstructor")}</p>
            </div>
          </div>
        </Card>

        {/* Curriculum */}
        <MobileCurriculumPanel
          id="m-curriculum"
          course={course}
          visibleModules={visibleModules}
          totalModules={totalModules}
          totalLessons={totalLessons}
          hasMoreModules={hasMoreModules}
          showAllModules={showAllModules}
          onToggle={() => setShowAllModules(!showAllModules)}
          isEnrolled={isEnrolled}
          onPreviewLesson={handlePreviewLesson}
          previewLessonId={previewLessonId}
        />

        {/* Reviews */}
        <ReviewsSection courseId={course.id} />

        {/* Fixed bottom enroll bar (learner/anonymous only) */}
        {(!viewerUser || viewerUser.role === "LEARNER") && (
          <div className="fixed bottom-16 left-0 right-0 z-50 px-4 py-3 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-body font-bold text-text-1">{course.price === 0 ? t("courses.free") : formatPrice(course.price)}</div>
              <div className="flex-1">
                {isEnrolled ? (
                  <Button asChild className="w-full h-10"><Link to={`/player/${course.id}`}>{t("courses.continueLearning")}</Link></Button>
                ) : (
                  <Button onClick={handleEnroll} disabled={enrolling} className="w-full h-10">
                    {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : course.price === 0 ? t("courses.enrollForFree") : t("courses.subscribeToCourse")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== DESKTOP LAYOUT ========== */}
      <div className="hidden lg:flex lg:flex-row lg:gap-3.5 lg:h-full overflow-hidden">
          {/* Main Content — scrollable */}
          <div className="flex-1 min-w-0 overflow-y-auto space-y-6 pr-1">
            <div className="space-y-3">
              {course.category && <Pill variant="default" size="sm" className="bg-primary-100 text-primary-600">{course.category}</Pill>}
              <h1 className="text-display font-bold text-text-1 leading-tight">{course.title}</h1>
              {course.subtitle && <p className="text-h3 text-text-2">{course.subtitle}</p>}

              {/* Instructor · Rating · Students · Actions — single row */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                {/* Instructor */}
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback className="text-[10px]">{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
                  <span className="text-body-sm text-text-2">{t("coursePreview.by")} <a href="#instructor" className="text-primary-600 font-semibold hover:underline">{course.creator?.name || t("courses.instructor")}</a></span>
                </div>

                {/* Divider */}
                {reviewCount > 0 && <span className="text-border">|</span>}

                {/* Rating */}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-body-sm font-semibold text-text-1">{Number(avgRating).toFixed(1)}</span>
                    <span className="text-body-sm text-text-3">({reviewCount})</span>
                  </div>
                )}

                {/* Divider */}
                {enrollmentCount > 0 && <span className="text-border">|</span>}

                {/* Enrolled Students */}
                {enrollmentCount > 0 && (
                  <div className="flex items-center gap-2">
                    {course.enrolledStudents && course.enrolledStudents.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {course.enrolledStudents.slice(0, Math.min(3, enrollmentCount)).map((student: any, idx: number) => (
                          <div key={student.id} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden flex-shrink-0" title={student.name || t("coursePreview.studentFallback")}>
                            {student.image ? (
                              <img src={student.image} alt={student.name || t("coursePreview.studentFallback")} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: idx % 3 === 0 ? 'linear-gradient(135deg, #2f6fed, #38bdf8)' : idx % 3 === 1 ? 'linear-gradient(135deg, #38bdf8, #8cffcb)' : 'linear-gradient(135deg, #8cffcb, #2f6fed)' }}>
                                {(student.name || 'S').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                        {enrollmentCount > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[8px] font-bold text-text-2 flex-shrink-0">
                            +{(enrollmentCount - 3).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    <span className="text-body-sm text-text-3">{enrollmentCount.toLocaleString()} {t(enrollmentCount === 1 ? "courses.student" : "courses.students")}</span>
                  </div>
                )}

                {/* Divider */}
                <span className="text-border">|</span>

                {/* Favourite · Bookmark · Share */}
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleToggleFavourite} className={cn("p-1.5 rounded-lg border transition-all duration-200 active:scale-90", isFavourite ? "border-red-300 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900" : "border-border bg-card hover:bg-surface-3")} title={t("courses.favourite")}>
                    <Heart className={cn("w-4 h-4", isFavourite ? "text-red-500" : "text-text-2")} fill={isFavourite ? "currentColor" : "none"} />
                  </button>
                  <button type="button" onClick={handleToggleBookmark} className={cn("p-1.5 rounded-lg border transition-all duration-200 active:scale-90", isBookmarked ? "border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900" : "border-border bg-card hover:bg-surface-3")} title={t("courses.bookmark")}>
                    <Bookmark className={cn("w-4 h-4", isBookmarked ? "text-blue-500" : "text-text-2")} fill={isBookmarked ? "currentColor" : "none"} />
                  </button>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: t("common.linkCopied"), variant: "success" }); }} className="p-1.5 rounded-lg border border-border bg-card hover:bg-surface-3 transition-all duration-200 active:scale-90" title={t("courses.share")}>
                    <Share2 className="w-4 h-4 text-text-2" />
                  </button>
                </div>
              </div>
            </div>

            <Card ref={coverRef} className="w-full max-h-[280px] overflow-hidden relative shadow-soft-2 rounded-2xl">
              {previewLessonId ? (
                <div className="relative w-full h-full">
                  {previewLoading && !previewVideoSrc ? (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin text-white" />
                    </div>
                  ) : (
                    <VideoPlayer
                      src={previewVideoSrc}
                      signingParams={previewSigningParams}
                      previewMode
                    />
                  )}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                    <span className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-caption font-semibold text-white truncate max-w-[70%]">{previewLessonTitle}</span>
                    <button onClick={closePreview} className="w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {course.coverImage ? <img src={course.coverImage} alt={course.title} className="w-full h-[280px] object-cover rounded-2xl" /> : <div className="w-full h-[280px] gradient-primary rounded-2xl" />}
                  <div className="absolute inset-0 bg-black/20" />
                  {isEnrolled && (
                    <Link to={`/player/${course.id}`} className="absolute inset-0 flex items-center justify-center">
                      <span className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-soft-3 hover:scale-105 transition-transform"><Play className="w-8 h-8 text-primary ml-1" fill="currentColor" /></span>
                    </Link>
                  )}
                </>
              )}
            </Card>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-soft-1"><BarChart3 className="w-4 h-4 text-primary" /><span className="text-body-sm font-medium text-text-1">{(course.level || "ALL_LEVELS").replace("_", " ")}</span></div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-soft-1"><Clock className="w-4 h-4 text-primary" /><span className="text-body-sm font-medium text-text-1">{formatDuration(totalDuration)}</span></div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-soft-1"><Globe className="w-4 h-4 text-primary" /><span className="text-body-sm font-medium text-text-1">{course.language || t("coursePreview.defaultLanguage")}</span></div>
            </div>

            {learningOutcomes.length > 0 && (
              <Card className="p-6 shadow-soft-1">
                <h2 className="text-h3 font-bold text-text-1 mb-4">{t("courses.whatYouWillLearn")}</h2>
                <div className="grid grid-cols-2 gap-3">{learningOutcomes.map((outcome, idx) => <div key={idx} className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" /><span className="text-body-sm text-text-2">{outcome}</span></div>)}</div>
              </Card>
            )}

            <Card className="p-6 shadow-soft-1">
              <h2 className="text-h3 font-bold text-text-1 mb-3">{t("courses.aboutCourse")}</h2>
              <div className="text-body text-text-2 whitespace-pre-line leading-relaxed">{course.description || t("coursePreview.noDescription")}</div>
            </Card>

            <Card id="instructor" className="p-6 scroll-mt-4 shadow-soft-1">
              <h2 className="text-h3 font-bold text-text-1 mb-4">{t("courses.instructor")}</h2>
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 shadow-soft-1"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback className="text-lg">{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-h3 font-bold text-text-1">{course.creator?.name || t("courses.instructor")}</h3>
                  <p className="text-body-sm text-primary-600 mb-2">{t("coursePreview.courseInstructor")}</p>
                  <p className="text-body-sm text-text-2 leading-relaxed">{course.creator?.bio || t("coursePreview.experiencedInstructor")}</p>
                </div>
              </div>
            </Card>

            <ReviewsSection courseId={course.id} />
          </div>

          {/* Sidebar — like course player */}
          <aside className="w-[480px] flex-shrink-0 flex flex-col gap-3.5">
              <Card className="p-5 shadow-soft-2 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-h1 font-bold text-text-1">{course.price === 0 ? t("courses.free") : formatPrice(course.price)}</div>
                  {isEnrolled && <Pill variant="completed" size="sm">{t("courses.enrolled")}</Pill>}
                </div>
                {(!viewerUser || viewerUser.role === "LEARNER") ? (
                  isEnrolled ? (
                    <Button asChild className="w-full h-12 text-body font-semibold"><Link to={`/player/${course.id}`}>{t("courses.continueLearning")}</Link></Button>
                  ) : (
                    <Button onClick={handleEnroll} disabled={enrolling} className="w-full h-12 text-body font-semibold">
                      {enrolling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("courses.enrolling")}</> : course.price === 0 ? t("courses.enrollForFree") : t("courses.subscribeToCourse")}
                    </Button>
                  )
                ) : (
                  <div className="text-body-sm text-text-2">
                    {t("courses.enrollmentLearnerOnly")}
                  </div>
                )}
                <div className="mt-5 pt-5 border-t border-border space-y-3">
                  <p className="text-caption font-semibold text-text-1 uppercase tracking-wide">{t("coursePreview.thisCourseIncludes")}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><Play className="w-4 h-4 text-primary" /><span>{t("coursePreview.onDemandVideo", { duration: formatDuration(totalDuration) })}</span></div>
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><BarChart3 className="w-4 h-4 text-primary" /><span>{t("coursePreview.lessonsCount", { count: totalLessons })}</span></div>
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><Globe className="w-4 h-4 text-primary" /><span>{t("coursePreview.lifetimeAccess")}</span></div>
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><CheckCircle2 className="w-4 h-4 text-primary" /><span>{t("coursePreview.certificateOfCompletion")}</span></div>
                  </div>
                </div>
              </Card>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <DesktopCurriculumPanel course={course} visibleModules={visibleModules} totalModules={totalModules} totalLessons={totalLessons} hasMoreModules={hasMoreModules} showAllModules={showAllModules} onToggle={() => setShowAllModules(!showAllModules)} isEnrolled={isEnrolled} onPreviewLesson={handlePreviewLesson} previewLessonId={previewLessonId} />
              </div>
          </aside>
      </div>

    </>
  );
}

/* ---- Mobile Curriculum (compact) ---- */
function MobileCurriculumPanel({ id, course, visibleModules, totalModules, totalLessons, hasMoreModules, showAllModules, onToggle, isEnrolled, onPreviewLesson, previewLessonId }: any) {
  const { t } = useTranslation();
  return (
    <Card id={id} className="p-4 scroll-mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body-sm font-bold text-text-1">{t("courses.courseContent")}</h3>
        <span className="text-[11px] text-text-3">{t("coursePreview.modulesAndLessons", { modules: totalModules, lessons: totalLessons })}</span>
      </div>
      <div className={cn("space-y-3", showAllModules && "max-h-[50vh] overflow-y-auto")}>
        {visibleModules.map((mod: any, idx: number) => (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{idx + 1}</span>
              <span className="text-caption font-semibold text-text-1 truncate">{mod.title}</span>
            </div>
            <div className="space-y-1 ml-7">
              {(mod.lessons || []).map((lesson: any) => {
                const progress = lesson.progressPercent || 0;
                const isCompleted = !!lesson.completedAt || progress >= 100;
                const showProgress = isEnrolled && !lesson.isLocked;
                const isClickable = (isEnrolled && !lesson.isLocked) || (!isEnrolled && lesson.isFreePreview);
                const isPreviewing = previewLessonId === lesson.id;
                const content = (
                  <div className={cn("flex items-start gap-2 py-2 px-2.5 rounded-lg border", lesson.isLocked ? "border-border/40 bg-muted/50" : isPreviewing ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card", isClickable && "cursor-pointer hover:bg-surface-3 transition-colors")}>
                    <div className={cn("w-4 h-4 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0", isCompleted ? "bg-success" : lesson.isLocked ? "border-[1.5px] border-text-3/30" : showProgress && progress > 0 ? "border-[1.5px] border-primary" : "border-[1.5px] border-primary/50")}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 text-white" /> : lesson.isLocked ? <Lock className="w-2 h-2 text-text-3" /> : <Play className="w-2 h-2 text-primary" fill="currentColor" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[11px] font-medium leading-tight", lesson.isLocked ? "text-text-3" : isCompleted ? "text-success line-through" : isPreviewing ? "text-primary font-semibold" : "text-text-1")}>{lesson.title}</span>
                      {showProgress && isCompleted && lesson.completedAt && <p className="text-[9px] text-success/70 mt-0.5">{fmtCST(lesson.completedAt)}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {showProgress && !isCompleted && progress > 0 && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{progress}%</span>}
                      {showProgress && isCompleted && !lesson.completedAt && <span className="text-[9px] font-bold text-success">{t("admin.barChart.done")}</span>}
                      <span className="text-[10px] text-text-3">{formatDuration(lesson.durationSeconds || 0)}</span>
                    </div>
                  </div>
                );
                if (isEnrolled && !lesson.isLocked) {
                  return <Link key={lesson.id} to={`/player/${course.id}?lesson=${lesson.id}`}>{content}</Link>;
                }
                if (!isEnrolled && lesson.isFreePreview) {
                  return <div key={lesson.id} onClick={() => onPreviewLesson(lesson.id, lesson.title)}>{content}</div>;
                }
                return <div key={lesson.id}>{content}</div>;
              })}
            </div>
          </div>
        ))}
      </div>
      {hasMoreModules && (
        <button onClick={onToggle} className="w-full mt-3 pt-3 border-t border-border flex items-center justify-center gap-1 text-caption font-semibold text-primary">
          {showAllModules
            ? <><ChevronUp className="w-3.5 h-3.5" />{t("coursePreview.showLess")}</>
            : <><ChevronDown className="w-3.5 h-3.5" />{t("coursePreview.viewAllModules", { count: totalModules })}</>}
        </button>
      )}
    </Card>
  );
}

/* ---- Desktop Curriculum ---- */
function DesktopCurriculumPanel({ course, visibleModules, totalModules, totalLessons, hasMoreModules, showAllModules, onToggle, isEnrolled, onPreviewLesson, previewLessonId }: any) {
  const { t } = useTranslation();
  return (
    <Card id="curriculum" className="p-5 scroll-mt-4 shadow-soft-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body font-bold text-text-1">{t("courses.courseContent")}</h3>
        <span className="text-caption text-text-3">{t("coursePreview.modulesAndLessons", { modules: totalModules, lessons: totalLessons })}</span>
      </div>
      <div className={cn("space-y-4", showAllModules && "pr-2")}>
        {visibleModules.map((mod: any, idx: number) => (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center"><span className="text-xs font-bold text-primary-600">{idx + 1}</span></div>
              <span className="text-body-sm font-semibold text-text-1">{mod.title}</span>
            </div>
            <div className="space-y-1.5 ml-8">
              {(mod.lessons || []).map((lesson: any) => {
                const progress = lesson.progressPercent || 0;
                const isCompleted = !!lesson.completedAt || progress >= 100;
                const showProgress = isEnrolled && !lesson.isLocked;
                const isClickable = (isEnrolled && !lesson.isLocked) || (!isEnrolled && lesson.isFreePreview);
                const isPreviewing = previewLessonId === lesson.id;
                const content = (
                  <div className={cn("flex items-start gap-3 p-3 rounded-xl border transition-colors", lesson.isLocked ? "border-border/50 bg-muted/50" : isPreviewing ? "border-primary bg-primary/5 ring-1 ring-primary/30" : lesson.isFreePreview || !lesson.isLocked ? "border-border bg-card hover:bg-surface-3" : "border-border bg-card", isClickable && "cursor-pointer")}>
                    <div className={cn("w-5 h-5 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0", isCompleted ? "bg-success" : lesson.isLocked ? "border-2 border-text-3/40" : showProgress && progress > 0 ? "border-2 border-primary" : lesson.isFreePreview ? "border-2 border-primary bg-primary-100" : "border-2 border-text-3/50")}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : lesson.isLocked ? <Lock className="w-2.5 h-2.5 text-text-3" /> : lesson.isFreePreview ? <Play className="w-2.5 h-2.5 text-primary" fill="currentColor" /> : showProgress && progress > 0 ? <span className="text-[8px] font-bold text-primary">{progress}</span> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-body-sm font-medium leading-normal", lesson.isLocked ? "text-text-3" : isCompleted ? "text-success" : isPreviewing ? "text-primary font-semibold" : "text-text-1")}>{lesson.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {showProgress && !isCompleted && progress > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                            <span className="text-[10px] font-semibold text-primary">{progress}%</span>
                          </div>
                        )}
                        {showProgress && isCompleted && !lesson.completedAt && <span className="text-[10px] font-bold text-success">{t("courses.completed")}</span>}
                        {showProgress && isCompleted && lesson.completedAt && <p className="text-[9px] text-success/70">{fmtCST(lesson.completedAt)}</p>}
                        <span className="text-[11px] text-text-3">{formatDuration(lesson.durationSeconds || 0)}</span>
                        {lesson.isFreePreview && <Pill size="sm" className="text-[10px] px-1.5 py-0.5">{t("courses.preview")}</Pill>}
                      </div>
                    </div>
                  </div>
                );
                if (isEnrolled && !lesson.isLocked) {
                  return <Link key={lesson.id} to={`/player/${course.id}?lesson=${lesson.id}`}>{content}</Link>;
                }
                if (!isEnrolled && lesson.isFreePreview) {
                  return <div key={lesson.id} onClick={() => onPreviewLesson(lesson.id, lesson.title)}>{content}</div>;
                }
                return <div key={lesson.id}>{content}</div>;
              })}
            </div>
          </div>
        ))}
      </div>
      {hasMoreModules && (
        <button onClick={onToggle} className="w-full mt-4 pt-4 border-t border-border flex items-center justify-center gap-2 text-body-sm font-semibold text-primary hover:text-primary-600 transition-colors">
          {showAllModules
            ? <><ChevronUp className="w-4 h-4" />{t("coursePreview.showLess")}</>
            : <><ChevronDown className="w-4 h-4" />{t("coursePreview.viewAllModules", { count: totalModules })}</>}
        </button>
      )}
    </Card>
  );
}
