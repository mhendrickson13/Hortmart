import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth, getStoredToken } from "@/lib/auth-context";
import { ProtectedRoute } from "@/layouts/ProtectedRoute";
import { video as videoApi } from "@/lib/api-client";
import { VideoPlayer, type VideoPlayerRef } from "@/components/learner/video-player";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Play, Clock, Users, Globe, BarChart3, Star, CheckCircle2,
  Loader2, ChevronDown, ChevronUp, BookOpen, ArrowLeft, Eye, Pencil,
  Heart, Bookmark, Share2, X,
} from "lucide-react";
import { formatDuration, formatPrice, getInitials, cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function AdminCoursePreviewPage() {
  return (
    <ProtectedRoute roles={["ADMIN", "CREATOR"]}>
      <AdminCoursePreviewContent />
    </ProtectedRoute>
  );
}

function AdminCoursePreviewContent() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAllModules, setShowAllModules] = useState(false);

  // Inline video player state
  const [playingLessonId, setPlayingLessonId] = useState<string | null>(null);
  const [playingLessonTitle, setPlayingLessonTitle] = useState("");
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [signingParams, setSigningParams] = useState<any>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  useEffect(() => {
    async function fetchPreview() {
      try {
        const authToken = token || getStoredToken();
        const resp = await fetch(`${API_URL}/courses/${id}/preview`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!resp.ok) { setLoading(false); return; }
        const data = await resp.json();
        setCourse(data.course || data);
      } catch (error) {
        console.error("Failed to fetch preview:", error);
      } finally {
        setLoading(false);
      }
    }
    if (id && token) fetchPreview();
  }, [id, token]);

  const playLesson = async (lessonId: string, lessonTitle: string) => {
    setPlayingLessonId(lessonId);
    setPlayingLessonTitle(lessonTitle);
    setLoadingVideo(true);
    setVideoSrc(null);
    setSigningParams(null);
    try {
      const data = await videoApi.getSignedUrl(lessonId, token || undefined);
      setVideoSrc(data.signedManifestUrl);
      setSigningParams(data.signingParams || null);
    } catch {
      // Fallback: find lesson raw videoUrl
      const allLessons = (course?.modules || []).flatMap((m: any) => m.lessons || []);
      const lesson = allLessons.find((l: any) => l.id === lessonId);
      if (lesson?.videoUrl) {
        setVideoSrc(lesson.videoUrl);
      }
    } finally {
      setLoadingVideo(false);
    }
  };

  const stopVideo = () => {
    setPlayingLessonId(null);
    setPlayingLessonTitle("");
    setVideoSrc(null);
    setSigningParams(null);
  };

  const playFirst = () => {
    const allLessons = (course?.modules || []).flatMap((m: any) => m.lessons || []);
    if (allLessons.length > 0) {
      playLesson(allLessons[0].id, allLessons[0].title);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!course) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
      <p className="text-text-2">Course not found</p>
      <Button variant="outline" onClick={() => navigate("/manage-courses")}>Back to Courses</Button>
    </div>
  );

  const allLessons = (course.modules || []).flatMap((m: any) => m.lessons || []);
  const totalDuration = allLessons.reduce((sum: number, l: any) => sum + (l.durationSeconds || 0), 0);
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
    <div className="min-h-screen bg-background">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500/95 backdrop-blur-sm text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-semibold">Preview Mode</span>
            <span className="text-xs opacity-80 hidden sm:inline">— This is how learners see your course</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:text-white text-xs h-7"
              onClick={() => navigate(`/manage-courses/${id}/edit`)}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit Course
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30 hover:text-white text-xs h-7"
              onClick={() => navigate(`/manage-courses/${id}/edit`)}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* ========== MOBILE LAYOUT ========== */}
      <div className="lg:hidden flex flex-col gap-3 p-4 pb-8 overflow-x-hidden">
        {/* Video Player / Cover Image */}
        {playingLessonId ? (
          <div className="space-y-2">
            <div className="aspect-video rounded-2xl overflow-hidden relative bg-black">
              {loadingVideo ? (
                <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
              ) : videoSrc ? (
                <VideoPlayer ref={videoPlayerRef} src={videoSrc} signingParams={signingParams} className="w-full h-full" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">No video available</div>
              )}
            </div>
            <div className="flex items-center justify-between px-1">
              <p className="text-caption font-semibold text-text-1 truncate flex-1">{playingLessonTitle}</p>
              <button onClick={stopVideo} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-text-2" /></button>
            </div>
          </div>
        ) : (
          <div className="aspect-video rounded-2xl overflow-hidden relative">
            {course.coverImage ? (
              <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full gradient-primary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <button onClick={playFirst} className="absolute inset-0 flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" />
              </span>
            </button>
            {course.category && (
              <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-primary-600">
                {course.category}
              </span>
            )}
          </div>
        )}

        {/* Title & Subtitle */}
        <div>
          <h1 className="text-body font-bold text-text-1 leading-snug">{course.title}</h1>
          {course.subtitle && <p className="text-caption text-text-2 mt-0.5">{course.subtitle}</p>}
        </div>

        {/* Instructor + Icons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Avatar className="w-5 h-5">
                <AvatarImage src={course.creator?.image || undefined} />
                <AvatarFallback className="text-[9px]">{getInitials(course.creator?.name || "I")}</AvatarFallback>
              </Avatar>
              <span className="text-caption font-semibold text-primary-600">{course.creator?.name || "Instructor"}</span>
            </div>
            {reviewCount > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-caption font-bold text-text-1">{Number(avgRating).toFixed(1)}</span>
                <span className="text-caption text-text-3">({reviewCount})</span>
              </div>
            )}
            {enrollmentCount > 0 && (
              <span className="text-caption text-text-3 flex items-center gap-0.5"><Users className="w-3.5 h-3.5" />{enrollmentCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="p-1.5 rounded-lg border border-border bg-card"><Heart className="w-3.5 h-3.5 text-text-3" /></span>
            <span className="p-1.5 rounded-lg border border-border bg-card"><Bookmark className="w-3.5 h-3.5 text-text-3" /></span>
            <span className="p-1.5 rounded-lg border border-border bg-card"><Share2 className="w-3.5 h-3.5 text-text-3" /></span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <BarChart3 className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Level</div>
              <div className="text-caption font-semibold text-text-1 truncate">{(course.level || "ALL_LEVELS").replace("_", " ")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <Clock className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Duration</div>
              <div className="text-caption font-semibold text-text-1">{formatDuration(totalDuration)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Lessons</div>
              <div className="text-caption font-semibold text-text-1">{totalLessons} lessons</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/60">
            <Globe className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-text-3 uppercase">Language</div>
              <div className="text-caption font-semibold text-text-1 truncate">{course.language || "English"}</div>
            </div>
          </div>
        </div>

        {/* What You'll Learn */}
        {learningOutcomes.length > 0 && (
          <Card className="p-4">
            <h2 className="text-body-sm font-bold text-text-1 mb-3">What you'll learn</h2>
            <div className="space-y-2">
              {learningOutcomes.map((outcome: string, idx: number) => (
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
        <Card className="p-4">
          <h2 className="text-body-sm font-bold text-text-1 mb-3">Instructor</h2>
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={course.creator?.image || undefined} />
              <AvatarFallback>{getInitials(course.creator?.name || "I")}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-body-sm font-bold text-text-1">{course.creator?.name || "Instructor"}</h3>
              <p className="text-caption text-primary-600 mb-1">Course Instructor</p>
              <p className="text-caption text-text-2 leading-relaxed">{course.creator?.bio || "Experienced instructor."}</p>
            </div>
          </div>
        </Card>

        {/* Curriculum */}
        <PreviewCurriculumMobile
          course={course}
          visibleModules={visibleModules}
          totalModules={totalModules}
          totalLessons={totalLessons}
          hasMoreModules={hasMoreModules}
          showAllModules={showAllModules}
          onToggle={() => setShowAllModules(!showAllModules)}
          onPlayLesson={playLesson}
          playingLessonId={playingLessonId}
        />
      </div>

      {/* ========== DESKTOP LAYOUT ========== */}
      <div className="hidden lg:block max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            <div className="space-y-3">
              {course.category && <Pill variant="default" size="sm" className="bg-primary-100 text-primary-600">{course.category}</Pill>}
              <h1 className="text-display font-bold text-text-1 leading-tight">{course.title}</h1>
              {course.subtitle && <p className="text-h3 text-text-2">{course.subtitle}</p>}

              {/* Instructor · Rating · Students · Icon actions */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={course.creator?.image || undefined} />
                    <AvatarFallback className="text-[10px]">{getInitials(course.creator?.name || "I")}</AvatarFallback>
                  </Avatar>
                  <span className="text-body-sm text-text-2">by <span className="text-primary-600 font-semibold">{course.creator?.name || "Instructor"}</span></span>
                </div>

                {reviewCount > 0 && <span className="text-border">|</span>}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-body-sm font-semibold text-text-1">{Number(avgRating).toFixed(1)}</span>
                    <span className="text-body-sm text-text-3">({reviewCount})</span>
                  </div>
                )}

                {enrollmentCount > 0 && <span className="text-border">|</span>}
                {enrollmentCount > 0 && (
                  <div className="flex items-center gap-2">
                    {course.enrolledStudents && course.enrolledStudents.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {course.enrolledStudents.slice(0, Math.min(3, enrollmentCount)).map((student: any, idx: number) => (
                          <div key={student.id} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden flex-shrink-0" title={student.name || 'Student'}>
                            {student.image ? (
                              <img src={student.image} alt={student.name || 'Student'} className="w-full h-full object-cover" />
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
                    <span className="text-body-sm text-text-3">{enrollmentCount.toLocaleString()} {enrollmentCount === 1 ? 'student' : 'students'}</span>
                  </div>
                )}

                <span className="text-border">|</span>

                {/* Icon-only actions */}
                <div className="flex items-center gap-1">
                  <span className="p-1.5 rounded-lg border border-border bg-card"><Heart className="w-4 h-4 text-text-3" /></span>
                  <span className="p-1.5 rounded-lg border border-border bg-card"><Bookmark className="w-4 h-4 text-text-3" /></span>
                  <span className="p-1.5 rounded-lg border border-border bg-card"><Share2 className="w-4 h-4 text-text-3" /></span>
                </div>
              </div>
            </div>

            {/* Video Player / Cover Image */}
            {playingLessonId ? (
              <div className="space-y-2">
                <Card className="aspect-video overflow-hidden relative shadow-soft-2 bg-black">
                  {loadingVideo ? (
                    <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-white" /></div>
                  ) : videoSrc ? (
                    <VideoPlayer ref={videoPlayerRef} src={videoSrc} signingParams={signingParams} className="w-full h-full" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/60">No video available for this lesson</div>
                  )}
                </Card>
                <div className="flex items-center justify-between">
                  <p className="text-body-sm font-semibold text-text-1 truncate flex-1">Now Playing: {playingLessonTitle}</p>
                  <button onClick={stopVideo} className="flex items-center gap-1 text-caption text-text-3 hover:text-text-1 transition-colors">
                    <X className="w-4 h-4" /> Close
                  </button>
                </div>
              </div>
            ) : (
              <Card className="aspect-video overflow-hidden relative shadow-soft-2">
                {course.coverImage ? (
                  <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-primary" />
                )}
                <div className="absolute inset-0 bg-black/20" />
                <button onClick={playFirst} className="absolute inset-0 flex items-center justify-center">
                  <span className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-soft-3 hover:scale-105 transition-transform">
                    <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                  </span>
                </button>
              </Card>
            )}

            {/* Stats Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-soft-1">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-body-sm font-medium text-text-1">{(course.level || "ALL_LEVELS").replace("_", " ")}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-soft-1">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-body-sm font-medium text-text-1">{formatDuration(totalDuration)}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-soft-1">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-body-sm font-medium text-text-1">{course.language || "English"}</span>
              </div>
            </div>

            {/* What You'll Learn */}
            {learningOutcomes.length > 0 && (
              <Card className="p-6 shadow-soft-1">
                <h2 className="text-h3 font-bold text-text-1 mb-4">What you'll learn</h2>
                <div className="grid grid-cols-2 gap-3">
                  {learningOutcomes.map((outcome: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-body-sm text-text-2">{outcome}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Description */}
            <Card className="p-6 shadow-soft-1">
              <h2 className="text-h3 font-bold text-text-1 mb-3">About this course</h2>
              <div className="text-body text-text-2 whitespace-pre-line leading-relaxed">{course.description || "No description available."}</div>
            </Card>

            {/* Instructor */}
            <Card className="p-6 shadow-soft-1">
              <h2 className="text-h3 font-bold text-text-1 mb-4">Instructor</h2>
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20 shadow-soft-1">
                  <AvatarImage src={course.creator?.image || undefined} />
                  <AvatarFallback className="text-lg">{getInitials(course.creator?.name || "I")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-h3 font-bold text-text-1">{course.creator?.name || "Instructor"}</h3>
                  <p className="text-body-sm text-primary-600 mb-2">Course Instructor</p>
                  <p className="text-body-sm text-text-2 leading-relaxed">{course.creator?.bio || "Experienced instructor."}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-[380px] flex-shrink-0">
            <div className="sticky top-16 space-y-4">
              {/* Price & Action */}
              <Card className="p-5 shadow-soft-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-h1 font-bold text-text-1">{course.price === 0 || !course.price ? "Free" : formatPrice(course.price)}</div>
                  <Pill variant="default" size="sm" className="bg-amber-100 text-amber-700 border-amber-200">Preview</Pill>
                </div>
                <Button onClick={playFirst} className="w-full h-12 text-body font-semibold">
                  <Play className="w-4 h-4 mr-2" />
                  Play Course
                </Button>
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

              {/* Course Content */}
              <PreviewCurriculumDesktop
                course={course}
                visibleModules={visibleModules}
                totalModules={totalModules}
                totalLessons={totalLessons}
                hasMoreModules={hasMoreModules}
                showAllModules={showAllModules}
                onToggle={() => setShowAllModules(!showAllModules)}
                onPlayLesson={playLesson}
                playingLessonId={playingLessonId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Mobile Curriculum ---- */
function PreviewCurriculumMobile({ course, visibleModules, totalModules, totalLessons, hasMoreModules, showAllModules, onToggle, onPlayLesson, playingLessonId }: any) {
  return (
    <Card className="p-4">
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
                <button key={lesson.id} onClick={() => onPlayLesson(lesson.id, lesson.title)} className="w-full text-left">
                  <div className={cn(
                    "flex items-center gap-2 py-2 px-2.5 rounded-lg border cursor-pointer transition-colors",
                    playingLessonId === lesson.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-surface-3"
                  )}>
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                      playingLessonId === lesson.id ? "bg-primary" : "border-[1.5px] border-primary/50"
                    )}>
                      <Play className={cn("w-2 h-2", playingLessonId === lesson.id ? "text-white" : "text-primary")} fill="currentColor" />
                    </div>
                    <span className="text-[11px] font-medium truncate flex-1 text-text-1">{lesson.title}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-text-3">{formatDuration(lesson.durationSeconds || 0)}</span>
                      <Pill size="sm" className="text-[9px] px-1.5 py-0.5">Preview</Pill>
                    </div>
                  </div>
                </button>
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
function PreviewCurriculumDesktop({ course, visibleModules, totalModules, totalLessons, hasMoreModules, showAllModules, onToggle, onPlayLesson, playingLessonId }: any) {
  return (
    <Card className="p-5 shadow-soft-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body font-bold text-text-1">Course Content</h3>
        <span className="text-caption text-text-3">{totalModules} modules &middot; {totalLessons} lessons</span>
      </div>
      <div className={cn("space-y-4", showAllModules && "max-h-[60vh] overflow-y-auto pr-2")}>
        {visibleModules.map((mod: any, idx: number) => (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-600">{idx + 1}</span>
              </div>
              <span className="text-body-sm font-semibold text-text-1">{mod.title}</span>
            </div>
            <div className="space-y-1.5 ml-8">
              {(mod.lessons || []).map((lesson: any) => (
                <button key={lesson.id} onClick={() => onPlayLesson(lesson.id, lesson.title)} className="w-full text-left">
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer",
                    playingLessonId === lesson.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:bg-surface-3"
                  )}>
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      playingLessonId === lesson.id ? "bg-primary" : "border-2 border-primary bg-primary-100"
                    )}>
                      <Play className={cn("w-2.5 h-2.5", playingLessonId === lesson.id ? "text-white" : "text-primary")} fill="currentColor" />
                    </div>
                    <p className="text-caption font-medium truncate flex-1 text-text-1">{lesson.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-text-3">{formatDuration(lesson.durationSeconds || 0)}</span>
                      <Pill size="sm" className="text-[10px] px-1.5 py-0.5">Preview</Pill>
                    </div>
                  </div>
                </button>
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
