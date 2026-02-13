import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { courses as coursesApi, favourites as favouritesApi, type CourseWithDetails } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReviewsSection } from "@/components/learner/reviews-section";
import { RatingDialog } from "@/components/learner/rating-dialog";
import { Play, Clock, Users, Globe, BarChart3, Lock, Star, CheckCircle2, Loader2, ChevronDown, ChevronUp, Heart, Share2, Bookmark, BookOpen } from "lucide-react";
import { formatDuration, formatPrice, getInitials, cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";

export default function CourseOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllModules, setShowAllModules] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    async function fetchData() {
      try {
        const response = await coursesApi.get(id!, token || undefined);
        const courseData = response.course;
        if (!courseData || courseData.status !== "PUBLISHED") { setLoading(false); return; }
        setCourse(courseData);
        if (token) {
          try {
            const enrollment = await coursesApi.checkEnrollment(id!, token);
            setIsEnrolled(enrollment.enrolled);
          } catch { setIsEnrolled(false); }
          try {
            const status = await favouritesApi.status(id!, token);
            setIsFavourite(status.isFavourite);
            setIsBookmarked(status.isBookmarked);
          } catch { /* not critical */ }
        }
      } catch (error) { console.error("Failed to fetch course:", error); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [id, token, authLoading]);

  const handleToggleFavourite = async () => {
    if (!user || !token) { navigate("/login", { state: { from: { pathname: `/course/${id}` } } }); return; }
    const prev = isFavourite;
    setIsFavourite(!prev);
    try {
      const result = await favouritesApi.toggleFavourite(id!);
      setIsFavourite(result.isFavourite);
      toast({ title: result.isFavourite ? "Added to favorites" : "Removed from favorites", variant: "success" });
    } catch {
      setIsFavourite(prev);
      toast({ title: "Failed to update", variant: "error" });
    }
  };

  const handleToggleBookmark = async () => {
    if (!user || !token) { navigate("/login", { state: { from: { pathname: `/course/${id}` } } }); return; }
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      const result = await favouritesApi.toggleBookmark(id!);
      setIsBookmarked(result.isBookmarked);
      toast({ title: result.isBookmarked ? "Bookmarked" : "Bookmark removed", variant: "success" });
    } catch {
      setIsBookmarked(prev);
      toast({ title: "Failed to update", variant: "error" });
    }
  };

  const handleEnroll = async () => {
    if (!user || !token) { navigate("/login", { state: { from: { pathname: `/course/${id}` } } }); return; }
    setEnrolling(true);
    try { await coursesApi.enroll(id!, token); setIsEnrolled(true); toast({ title: "Enrolled successfully!", variant: "success" }); }
    catch (error: any) { toast({ title: "Enrollment failed", description: error?.message || "Please try again", variant: "error" }); }
    finally { setEnrolling(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!course) return <div className="text-center py-8"><p className="text-text-2">Course not found</p><Link to="/courses" className="text-primary font-bold">Browse courses</Link></div>;

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
        {/* Cover Image - full width within parent padding */}
        <div className="aspect-video rounded-2xl overflow-hidden relative">
          {course.coverImage ? (
            <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          {isEnrolled ? (
            <Link to={`/player/${course.id}`} className="absolute inset-0 flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"><Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" /></span>
            </Link>
          ) : (
            <button onClick={() => document.getElementById("m-curriculum")?.scrollIntoView({ behavior: "smooth" })} className="absolute inset-0 flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"><Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" /></span>
            </button>
          )}
          {course.category && (
            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-primary-600">{course.category}</span>
          )}
        </div>

        {/* Title & Subtitle */}
        <div>
          <h1 className="text-body font-bold text-text-1 leading-snug">{course.title}</h1>
          {course.subtitle && <p className="text-caption text-text-2 mt-0.5">{course.subtitle}</p>}
        </div>

        {/* Instructor + Rating + Students (single compact row) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback className="text-[9px]">{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
            <span className="text-caption font-semibold text-primary-600">{course.creator?.name || "Instructor"}</span>
          </div>
          {reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-caption font-bold text-text-1">{Number(avgRating).toFixed(1)}</span>
              <span className="text-caption text-text-3">({reviewCount})</span>
            </div>
          )}
          {enrollmentCount > 0 && (
            <span className="text-caption text-text-3 flex items-center gap-1"><Users className="w-3 h-3" />{enrollmentCount}</span>
          )}
        </div>

        {/* Quick Stats - 2x2 grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-border/60">
            <BarChart3 className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Level</div>
              <div className="text-caption font-semibold text-text-1 truncate">{(course.level || "ALL_LEVELS").replace("_", " ")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-border/60">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Duration</div>
              <div className="text-caption font-semibold text-text-1">{formatDuration(totalDuration)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-border/60">
            <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Lessons</div>
              <div className="text-caption font-semibold text-text-1">{totalLessons} lessons</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-border/60">
            <Globe className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Language</div>
              <div className="text-caption font-semibold text-text-1 truncate">{course.language || "English"}</div>
            </div>
          </div>
        </div>

        {/* Action bar - like course player */}
        <div className="flex items-center justify-around py-2 px-3 rounded-2xl bg-muted/50 border border-border/50">
          <button onClick={handleToggleFavourite} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-all">
            <Heart className={cn("w-5 h-5", isFavourite ? "fill-red-500 text-red-500" : "text-text-2")} />
            <span className="text-[10px] font-medium text-text-3">Favorite</span>
          </button>
          <button onClick={handleToggleBookmark} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-all">
            <Bookmark className={cn("w-5 h-5", isBookmarked ? "fill-blue-500 text-blue-500" : "text-text-2")} />
            <span className="text-[10px] font-medium text-text-3">Bookmark</span>
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!", variant: "success" }); }} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-all">
            <Share2 className="w-5 h-5 text-text-2" />
            <span className="text-[10px] font-medium text-text-3">Share</span>
          </button>
          {isEnrolled && (
            <button onClick={() => setShowRating(true)} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-all">
              <Star className="w-5 h-5 text-text-2" />
              <span className="text-[10px] font-medium text-text-3">Rate</span>
            </button>
          )}
        </div>

        {/* What You'll Learn */}
        {learningOutcomes.length > 0 && (
          <Card className="p-4">
            <h2 className="text-body-sm font-bold text-text-1 mb-3">What you'll learn</h2>
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
          <h2 className="text-body-sm font-bold text-text-1 mb-2">About this course</h2>
          <p className="text-caption text-text-2 whitespace-pre-line leading-relaxed">{course.description || "No description available."}</p>
        </Card>

        {/* Instructor */}
        <Card id="instructor" className="p-4 scroll-mt-4">
          <h2 className="text-body-sm font-bold text-text-1 mb-3">Instructor</h2>
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback>{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-body-sm font-bold text-text-1">{course.creator?.name || "Instructor"}</h3>
              <p className="text-caption text-primary-600 mb-1">Course Instructor</p>
              <p className="text-caption text-text-2 leading-relaxed">{course.creator?.bio || "Experienced instructor."}</p>
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
        />

        {/* Reviews */}
        <ReviewsSection courseId={course.id} />

        {/* Fixed bottom enroll bar */}
        <div className="fixed bottom-16 left-0 right-0 z-50 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-border shadow-lg">
          <div className="flex items-center gap-3">
            <div className="text-body font-bold text-text-1">{course.price === 0 ? "Free" : formatPrice(course.price)}</div>
            <div className="flex-1">
              {isEnrolled ? (
                <Button asChild className="w-full h-10"><Link to={`/player/${course.id}`}>Continue Learning</Link></Button>
              ) : (
                <Button onClick={handleEnroll} disabled={enrolling} className="w-full h-10">
                  {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : course.price === 0 ? "Enroll Free" : "Buy Now"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT ========== */}
      <div className="hidden lg:block max-w-6xl mx-auto">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="space-y-3">
              {course.category && <Pill variant="default" size="sm" className="bg-primary-100 text-primary-600">{course.category}</Pill>}
              <h1 className="text-display font-bold text-text-1 leading-tight">{course.title}</h1>
              {course.subtitle && <p className="text-h3 text-text-2">{course.subtitle}</p>}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback className="text-xs">{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
                  <span className="text-body-sm text-text-2">by <a href="#instructor" className="text-primary-600 font-semibold hover:underline">{course.creator?.name || "Instructor"}</a></span>
                </div>
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((star) => <Star key={star} className={cn("w-4 h-4", avgRating >= star ? "fill-yellow-400 text-yellow-400" : "text-neutral-300")} />)}
                    </div>
                    <span className="text-body-sm font-semibold text-text-1">{Number(avgRating).toFixed(1)}</span>
                    <span className="text-body-sm text-text-3">({reviewCount} reviews)</span>
                  </div>
                )}
                {enrollmentCount > 0 && <span className="text-body-sm text-text-3">{enrollmentCount.toLocaleString()} students</span>}
              </div>

              {enrollmentCount > 1 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex -space-x-2">
                    {[1,2,3,4,5].slice(0, Math.min(5, enrollmentCount)).map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 border-2 border-white flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-600">{String.fromCharCode(64 + i)}</span>
                      </div>
                    ))}
                  </div>
                  {enrollmentCount > 5 && <span className="text-caption text-text-2">+{(enrollmentCount - 5).toLocaleString()} other students</span>}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={handleToggleFavourite} className={cn("p-2.5 rounded-xl border transition-all duration-200 active:scale-90", isFavourite ? "border-red-300 bg-red-50 hover:bg-red-100" : "border-border bg-white hover:bg-surface-3")}>
                  <Heart className={cn("w-5 h-5", isFavourite ? "text-red-500" : "text-text-2")} fill={isFavourite ? "currentColor" : "none"} />
                </button>
                <button type="button" onClick={handleToggleBookmark} className={cn("p-2.5 rounded-xl border transition-all duration-200 active:scale-90", isBookmarked ? "border-blue-300 bg-blue-50 hover:bg-blue-100" : "border-border bg-white hover:bg-surface-3")}>
                  <Bookmark className={cn("w-5 h-5", isBookmarked ? "text-blue-500" : "text-text-2")} fill={isBookmarked ? "currentColor" : "none"} />
                </button>
                <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!", variant: "success" }); }} className="p-2.5 rounded-xl border border-border bg-white hover:bg-surface-3 transition-all duration-200 active:scale-90">
                  <Share2 className="w-5 h-5 text-text-2" />
                </button>
              </div>
            </div>

            <Card className="aspect-video overflow-hidden relative shadow-soft-2">
              {course.coverImage ? <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" /> : <div className="w-full h-full gradient-primary" />}
              <div className="absolute inset-0 bg-black/20" />
              {isEnrolled ? (
                <Link to={`/player/${course.id}`} className="absolute inset-0 flex items-center justify-center">
                  <span className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-soft-3 hover:scale-105 transition-transform"><Play className="w-8 h-8 text-primary ml-1" fill="currentColor" /></span>
                </Link>
              ) : (
                <button onClick={() => document.getElementById("curriculum")?.scrollIntoView({ behavior: "smooth" })} className="absolute inset-0 flex items-center justify-center">
                  <span className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-soft-3 hover:scale-105 transition-transform"><Play className="w-8 h-8 text-primary ml-1" fill="currentColor" /></span>
                </button>
              )}
            </Card>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1"><BarChart3 className="w-4 h-4 text-primary" /><span className="text-body-sm font-medium text-text-1">{(course.level || "ALL_LEVELS").replace("_", " ")}</span></div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1"><Clock className="w-4 h-4 text-primary" /><span className="text-body-sm font-medium text-text-1">{formatDuration(totalDuration)}</span></div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1"><Users className="w-4 h-4 text-primary" /><span className="text-body-sm font-medium text-text-1">{enrollmentCount} students</span></div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1"><Globe className="w-4 h-4 text-primary" /><span className="text-body-sm font-medium text-text-1">{course.language || "English"}</span></div>
            </div>

            {learningOutcomes.length > 0 && (
              <Card className="p-6 shadow-soft-1">
                <h2 className="text-h3 font-bold text-text-1 mb-4">What you'll learn</h2>
                <div className="grid grid-cols-2 gap-3">{learningOutcomes.map((outcome, idx) => <div key={idx} className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" /><span className="text-body-sm text-text-2">{outcome}</span></div>)}</div>
              </Card>
            )}

            <Card className="p-6 shadow-soft-1">
              <h2 className="text-h3 font-bold text-text-1 mb-3">About this course</h2>
              <div className="text-body text-text-2 whitespace-pre-line leading-relaxed">{course.description || "No description available."}</div>
            </Card>

            <Card id="instructor" className="p-6 scroll-mt-4 shadow-soft-1">
              <h2 className="text-h3 font-bold text-text-1 mb-4">Instructor</h2>
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 shadow-soft-1"><AvatarImage src={course.creator?.image || undefined} /><AvatarFallback className="text-lg">{getInitials(course.creator?.name || "I")}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-h3 font-bold text-text-1">{course.creator?.name || "Instructor"}</h3>
                  <p className="text-body-sm text-primary-600 mb-2">Course Instructor</p>
                  <p className="text-body-sm text-text-2 leading-relaxed">{course.creator?.bio || "Experienced instructor."}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {isEnrolled && (
                <Button variant="secondary" className="w-full" onClick={() => setShowRating(true)}>
                  <Star className="w-4 h-4 mr-2" />Leave a Review
                </Button>
              )}
              <ReviewsSection courseId={course.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-[380px] flex-shrink-0">
            <div className="sticky top-4 space-y-4">
              <Card className="p-5 shadow-soft-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-h1 font-bold text-text-1">{course.price === 0 ? "Free" : formatPrice(course.price)}</div>
                  {isEnrolled && <Pill variant="completed" size="sm">Enrolled</Pill>}
                </div>
                {isEnrolled ? (
                  <Button asChild className="w-full h-12 text-body font-semibold"><Link to={`/player/${course.id}`}>Continue Learning</Link></Button>
                ) : (
                  <Button onClick={handleEnroll} disabled={enrolling} className="w-full h-12 text-body font-semibold">
                    {enrolling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling...</> : course.price === 0 ? "Enroll for Free" : "Buy Now"}
                  </Button>
                )}
                <div className="mt-5 pt-5 border-t border-border space-y-3">
                  <p className="text-caption font-semibold text-text-1 uppercase tracking-wide">This course includes</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><Play className="w-4 h-4 text-primary" /><span>{formatDuration(totalDuration)} of on-demand video</span></div>
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><BarChart3 className="w-4 h-4 text-primary" /><span>{totalLessons} lessons</span></div>
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><Globe className="w-4 h-4 text-primary" /><span>Lifetime access</span></div>
                    <div className="flex items-center gap-3 text-body-sm text-text-2"><CheckCircle2 className="w-4 h-4 text-primary" /><span>Certificate of completion</span></div>
                  </div>
                </div>
              </Card>
              <DesktopCurriculumPanel course={course} visibleModules={visibleModules} totalModules={totalModules} totalLessons={totalLessons} hasMoreModules={hasMoreModules} showAllModules={showAllModules} onToggle={() => setShowAllModules(!showAllModules)} />
            </div>
          </div>
        </div>
      </div>

      <RatingDialog courseId={course?.id || ""} courseName={course?.title || ""} open={showRating} onOpenChange={setShowRating} />
    </>
  );
}

/* ---- Mobile Curriculum (compact) ---- */
function MobileCurriculumPanel({ id, course, visibleModules, totalModules, totalLessons, hasMoreModules, showAllModules, onToggle }: any) {
  return (
    <Card id={id} className="p-4 scroll-mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body-sm font-bold text-text-1">Course Content</h3>
        <span className="text-[11px] text-text-3">{totalModules} modules · {totalLessons} lessons</span>
      </div>
      <div className={cn("space-y-3", showAllModules && "max-h-[50vh] overflow-y-auto")}>
        {visibleModules.map((mod: any, idx: number) => (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{idx + 1}</span>
              <span className="text-caption font-semibold text-text-1 truncate">{mod.title}</span>
            </div>
            <div className="space-y-1 ml-7">
              {(mod.lessons || []).map((lesson: any) => (
                <div key={lesson.id} className={cn("flex items-center gap-2 py-2 px-2.5 rounded-lg border", lesson.isLocked ? "border-border/40 bg-neutral-50/50" : "border-border bg-white")}>
                  <div className={cn("w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0", lesson.isLocked ? "border-text-3/30" : "border-primary/50")}>
                    {lesson.isLocked ? <Lock className="w-2 h-2 text-text-3" /> : <Play className="w-2 h-2 text-primary" fill="currentColor" />}
                  </div>
                  <span className={cn("text-[11px] font-medium truncate flex-1", lesson.isLocked ? "text-text-3" : "text-text-1")}>{lesson.title}</span>
                  <span className="text-[10px] text-text-3 flex-shrink-0">{formatDuration(lesson.durationSeconds || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {hasMoreModules && (
        <button onClick={onToggle} className="w-full mt-3 pt-3 border-t border-border flex items-center justify-center gap-1 text-caption font-semibold text-primary">
          {showAllModules ? <><ChevronUp className="w-3.5 h-3.5" />Show less</> : <><ChevronDown className="w-3.5 h-3.5" />View all {totalModules} modules</>}
        </button>
      )}
    </Card>
  );
}

/* ---- Desktop Curriculum ---- */
function DesktopCurriculumPanel({ course, visibleModules, totalModules, totalLessons, hasMoreModules, showAllModules, onToggle }: any) {
  return (
    <Card id="curriculum" className="p-5 scroll-mt-4 shadow-soft-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body font-bold text-text-1">Course Content</h3>
        <span className="text-caption text-text-3">{totalModules} modules &middot; {totalLessons} lessons</span>
      </div>
      <div className={cn("space-y-4", showAllModules && "max-h-[60vh] overflow-y-auto pr-2")}>
        {visibleModules.map((mod: any, idx: number) => (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center"><span className="text-xs font-bold text-primary-600">{idx + 1}</span></div>
              <span className="text-body-sm font-semibold text-text-1">{mod.title}</span>
            </div>
            <div className="space-y-1.5 ml-8">
              {(mod.lessons || []).map((lesson: any) => (
                <div key={lesson.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors", lesson.isLocked ? "border-border/50 bg-neutral-50/50" : "border-border bg-white hover:bg-surface-3")}>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", lesson.isLocked ? "border-text-3/40" : lesson.isFreePreview ? "border-primary bg-primary-100" : "border-text-3/50")}>
                    {lesson.isLocked ? <Lock className="w-2.5 h-2.5 text-text-3" /> : lesson.isFreePreview ? <Play className="w-2.5 h-2.5 text-primary" fill="currentColor" /> : null}
                  </div>
                  <p className={cn("text-caption font-medium truncate flex-1", lesson.isLocked ? "text-text-3" : "text-text-1")}>{lesson.title}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-text-3">{formatDuration(lesson.durationSeconds || 0)}</span>
                    {lesson.isFreePreview && <Pill size="sm" className="text-[10px] px-1.5 py-0.5">Preview</Pill>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {hasMoreModules && (
        <button onClick={onToggle} className="w-full mt-4 pt-4 border-t border-border flex items-center justify-center gap-2 text-body-sm font-semibold text-primary hover:text-primary-600 transition-colors">
          {showAllModules ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />View all {totalModules} modules</>}
        </button>
      )}
    </Card>
  );
}
