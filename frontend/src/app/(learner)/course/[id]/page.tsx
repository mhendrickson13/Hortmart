"use client";

import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReviewsSection } from "@/components/learner/reviews-section";
import { courses as coursesApi, type CourseWithDetails as ApiCourseWithDetails } from "@/lib/api-client";
import {
  Play,
  Clock,
  Users,
  Globe,
  BarChart3,
  Lock,
  Star,
  CheckCircle2,
  Heart,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { formatDuration, formatPrice, getInitials, cn } from "@/lib/utils";

// Use the API type directly
type CourseWithDetails = ApiCourseWithDetails;

export default function CourseOverviewPage() {
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const [course, setCourse] = useState<CourseWithDetails | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAllModules, setShowAllModules] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    // Wait for session to finish loading before fetching
    if (sessionStatus === "loading") return;

    async function fetchData() {
      try {
        const token = session?.accessToken;
        const response = await coursesApi.get(params.id as string, token);
        const courseData = response.course;
        if (!courseData || courseData.status !== "PUBLISHED") {
          setLoading(false);
          return;
        }
        setCourse(courseData as CourseWithDetails);

        // Check enrollment only if authenticated
        if (sessionStatus === "authenticated" && token) {
          try {
            const enrollmentResponse = await coursesApi.checkEnrollment(params.id as string, token);
            setIsEnrolled(enrollmentResponse.enrolled);
          } catch {
            setIsEnrolled(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch course:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, session, sessionStatus]);

  const handleEnroll = async () => {
    if (!session?.user || !session?.accessToken) {
      window.location.href = `/login?callbackUrl=/course/${params.id}`;
      return;
    }
    setEnrolling(true);
    try {
      await coursesApi.enroll(params.id as string, session.accessToken);
      setIsEnrolled(true);
    } catch (error) {
      console.error("Failed to enroll:", error);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    notFound();
  }

  const allLessons = (course.modules || []).flatMap((m) => m.lessons || []);
  const totalDuration = allLessons.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
  const totalLessons = allLessons.length;
  const totalModules = (course.modules || []).length;

  // Parse whatYouWillLearn
  let learningOutcomes: string[] = [];
  if (course.whatYouWillLearn) {
    try {
      learningOutcomes = JSON.parse(course.whatYouWillLearn);
    } catch {
      // If parsing fails, try to split by newlines
      learningOutcomes = course.whatYouWillLearn.split("\n").filter(Boolean);
    }
  }

  // Calculate average rating (backend returns avgRating)
  const avgRating = course.avgRating || course.averageRating || 0;
  const reviewCount = course._count?.reviews || 0;
  const enrollmentCount = course._count?.enrollments || 0;

  // Modules to display (first 3 or all)
  const visibleModules = showAllModules
    ? course.modules || []
    : (course.modules || []).slice(0, 3);
  const hasMoreModules = totalModules > 3;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Mobile Enroll Card - Fixed at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-sm border-t border-border shadow-soft-3 lg:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-h3 font-bold text-text-1">
              {course.price === 0 ? "Free" : formatPrice(course.price)}
            </div>
          </div>
          {isEnrolled ? (
            <Button asChild className="flex-1 h-11">
              <Link href={`/player/${course.id}`}>Continue</Link>
            </Button>
          ) : (
            <Button
              onClick={handleEnroll}
              disabled={enrolling}
              className="flex-1 h-11"
            >
              {enrolling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : course.price === 0 ? (
                "Enroll Free"
              ) : (
                "Buy Now"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 pb-24 lg:pb-0">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-5 lg:space-y-6">
          {/* Course Header */}
          <div className="space-y-3">
            {/* Category Badge */}
            {course.category && (
              <Pill variant="default" size="sm" className="bg-primary-100 text-primary-600">
                {course.category}
              </Pill>
            )}

            {/* Title & Subtitle */}
            <h1 className="text-h2 lg:text-display font-bold text-text-1 leading-tight">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="text-body lg:text-h3 text-text-2">{course.subtitle}</p>
            )}

            {/* Instructor & Rating */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={course.creator?.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(course.creator?.name || "I")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-body-sm text-text-2">
                  by{" "}
                  <a href="#instructor" className="text-primary-600 font-semibold hover:underline">
                    {course.creator?.name || "Instructor"}
                  </a>
                </span>
              </div>

              {reviewCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "w-4 h-4",
                          avgRating >= star
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-neutral-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-body-sm font-semibold text-text-1">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-body-sm text-text-3">({reviewCount} reviews)</span>
                </div>
              )}

              {enrollmentCount > 0 && (
                <span className="text-body-sm text-text-3">
                  {enrollmentCount.toLocaleString()} students
                </span>
              )}
            </div>

            {/* Social Proof - Other Students */}
            {enrollmentCount > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].slice(0, Math.min(5, enrollmentCount)).map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 border-2 border-white flex items-center justify-center"
                    >
                      <span className="text-xs font-semibold text-primary-600">
                        {String.fromCharCode(64 + i)}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-caption text-text-2">
                  +{Math.max(0, enrollmentCount - 5).toLocaleString()} other students
                </span>
              </div>
            )}

            {/* Action Icons */}
            <div className="flex items-center gap-2 pt-2">
              <button className="p-2.5 rounded-xl border border-border bg-white hover:bg-surface-3 transition-colors">
                <Heart className="w-5 h-5 text-text-2" />
              </button>
              <button className="p-2.5 rounded-xl border border-border bg-white hover:bg-surface-3 transition-colors">
                <Bookmark className="w-5 h-5 text-text-2" />
              </button>
              <button className="p-2.5 rounded-xl border border-border bg-white hover:bg-surface-3 transition-colors">
                <Share2 className="w-5 h-5 text-text-2" />
              </button>
            </div>
          </div>

          {/* Cover Image / Video Preview */}
          <Card className="aspect-video overflow-hidden relative shadow-soft-2">
            {course.coverImage || course.thumbnail ? (
              <Image
                src={course.coverImage || course.thumbnail || ""}
                alt={course.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full gradient-primary" />
            )}
            <div className="absolute inset-0 bg-black/20" />
            {isEnrolled ? (
              <Link
                href={`/player/${course.id}`}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-soft-3 hover:scale-105 transition-transform">
                  <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                </span>
              </Link>
            ) : (
              <button
                onClick={() => document.getElementById("curriculum")?.scrollIntoView({ behavior: "smooth" })}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm border border-white flex items-center justify-center shadow-soft-3 hover:scale-105 transition-transform">
                  <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                </span>
              </button>
            )}
          </Card>

          {/* Course Stats Chips */}
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-body-sm font-medium text-text-1">
                {(course.level || "ALL_LEVELS").replace("_", " ")}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-body-sm font-medium text-text-1">
                {formatDuration(totalDuration)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-body-sm font-medium text-text-1">
                {enrollmentCount} students
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-border shadow-soft-1">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-body-sm font-medium text-text-1">
                {course.language || "English"}
              </span>
            </div>
          </div>

          {/* What You'll Learn */}
          {learningOutcomes.length > 0 && (
            <Card className="p-5 lg:p-6 shadow-soft-1">
              <h2 className="text-h3 font-bold text-text-1 mb-4">What you&apos;ll learn</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {learningOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-body-sm text-text-2">{outcome}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* About This Course */}
          <Card className="p-5 lg:p-6 shadow-soft-1">
            <h2 className="text-h3 font-bold text-text-1 mb-3">About this course</h2>
            <div className="text-body text-text-2 whitespace-pre-line leading-relaxed">
              {course.description || "No description available."}
            </div>
          </Card>

          {/* Instructor */}
          <Card id="instructor" className="p-5 lg:p-6 scroll-mt-4 shadow-soft-1">
            <h2 className="text-h3 font-bold text-text-1 mb-4">Instructor</h2>
            {/* Instructor section */}
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16 lg:w-20 lg:h-20 shadow-soft-1">
                <AvatarImage src={course.creator?.image || undefined} />
                <AvatarFallback className="text-lg">
                  {getInitials(course.creator?.name || "I")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-body lg:text-h3 font-bold text-text-1">
                  {course.creator?.name || "Instructor"}
                </h3>
                <p className="text-body-sm text-primary-600 mb-2">Course Instructor</p>
                <p className="text-body-sm text-text-2 leading-relaxed">
                  {course.creator?.bio || "Experienced instructor."}
                </p>
              </div>
            </div>
          </Card>

          {/* Mobile Curriculum - Shows on mobile only */}
          <div className="lg:hidden">
            <Card id="curriculum-mobile" className="p-4 scroll-mt-4 shadow-soft-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-body font-bold text-text-1">Course Content</h3>
                <span className="text-caption text-text-3">
                  {totalModules} modules · {totalLessons} lessons
                </span>
              </div>

              <div className={cn(
                "space-y-3",
                showAllModules && "max-h-[50vh] overflow-y-auto pr-1"
              )}>
                {visibleModules.map((module, moduleIdx) => (
                  <div key={module.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-600">
                          {moduleIdx + 1}
                        </span>
                      </div>
                      <span className="text-caption font-semibold text-text-1">
                        {module.title}
                      </span>
                    </div>
                    <div className="space-y-1 ml-7">
                      {(module.lessons || []).map((lesson) => (
                        <div
                          key={lesson.id}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-lg border transition-colors",
                            lesson.isLocked
                              ? "border-border/50 bg-neutral-50/50"
                              : "border-border bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                              lesson.isLocked
                                ? "border-text-3/40"
                                : lesson.isFreePreview
                                ? "border-primary bg-primary-100"
                                : "border-text-3/50"
                            )}
                          >
                            {lesson.isLocked ? (
                              <Lock className="w-2 h-2 text-text-3" />
                            ) : lesson.isFreePreview ? (
                              <Play className="w-2 h-2 text-primary" fill="currentColor" />
                            ) : null}
                          </div>
                          <p
                            className={cn(
                              "text-caption flex-1 truncate",
                              lesson.isLocked ? "text-text-3" : "text-text-1"
                            )}
                          >
                            {lesson.title}
                          </p>
                          <span className="text-[10px] text-text-3 flex-shrink-0">
                            {formatDuration(lesson.durationSeconds || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {hasMoreModules && (
                <button
                  onClick={() => setShowAllModules(!showAllModules)}
                  className="w-full mt-3 pt-3 border-t border-border flex items-center justify-center gap-2 text-caption font-semibold text-primary"
                >
                  {showAllModules ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      View all {totalModules} modules
                    </>
                  )}
                </button>
              )}
            </Card>
          </div>

          {/* Reviews */}
          <ReviewsSection courseId={course.id} />
        </div>

        {/* Sidebar - Desktop Only */}
        <div className="hidden lg:block w-[380px] flex-shrink-0 space-y-4">
          {/* Sticky Container */}
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* Enroll Card */}
            <Card className="p-5 shadow-soft-2">
              <div className="flex items-center justify-between mb-4">
                <div className="text-h2 lg:text-h1 font-bold text-text-1">
                  {course.price === 0 ? "Free" : formatPrice(course.price)}
                </div>
                {isEnrolled && (
                  <Pill variant="completed" size="sm">
                    Enrolled
                  </Pill>
                )}
              </div>

              {isEnrolled ? (
                <Button asChild className="w-full h-12 text-body font-semibold">
                  <Link href={`/player/${course.id}`}>Continue Learning</Link>
                </Button>
              ) : (
                <Button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full h-12 text-body font-semibold"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : course.price === 0 ? (
                    "Enroll for Free"
                  ) : (
                    "Buy Now"
                  )}
                </Button>
              )}

              {/* Course includes */}
              <div className="mt-5 pt-5 border-t border-border space-y-3">
                <p className="text-caption font-semibold text-text-1 uppercase tracking-wide">
                  This course includes
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-body-sm text-text-2">
                    <Play className="w-4 h-4 text-primary" />
                    <span>{formatDuration(totalDuration)} of on-demand video</span>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm text-text-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span>{totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm text-text-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span>Lifetime access</span>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm text-text-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Certificate of completion</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Curriculum */}
            <Card id="curriculum" className="p-5 scroll-mt-4 shadow-soft-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-body font-bold text-text-1">Course Content</h3>
                <span className="text-caption text-text-3">
                  {totalModules} modules · {totalLessons} lessons
                </span>
              </div>

              <div className={cn(
                "space-y-4",
                showAllModules && "max-h-[60vh] overflow-y-auto pr-2"
              )}>
                {visibleModules.map((module, moduleIdx) => (
                  <div key={module.id}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-600">
                          {moduleIdx + 1}
                        </span>
                      </div>
                      <span className="text-body-sm font-semibold text-text-1">
                        {module.title}
                      </span>
                    </div>
                    <div className="space-y-1.5 ml-8">
                      {(module.lessons || []).map((lesson) => (
                        <div
                          key={lesson.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                            lesson.isLocked
                              ? "border-border/50 bg-neutral-50/50"
                              : "border-border bg-white hover:bg-surface-3"
                          )}
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                              lesson.isLocked
                                ? "border-text-3/40"
                                : lesson.isFreePreview
                                ? "border-primary bg-primary-100"
                                : "border-text-3/50"
                            )}
                          >
                            {lesson.isLocked ? (
                              <Lock className="w-2.5 h-2.5 text-text-3" />
                            ) : lesson.isFreePreview ? (
                              <Play className="w-2.5 h-2.5 text-primary" fill="currentColor" />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-caption font-medium truncate",
                                lesson.isLocked ? "text-text-3" : "text-text-1"
                              )}
                            >
                              {lesson.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-text-3">
                              {formatDuration(lesson.durationSeconds || 0)}
                            </span>
                            {lesson.isFreePreview && (
                              <Pill size="sm" className="text-[10px] px-1.5 py-0.5">
                                Preview
                              </Pill>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* View All / View Less */}
              {hasMoreModules && (
                <button
                  onClick={() => setShowAllModules(!showAllModules)}
                  className="w-full mt-4 pt-4 border-t border-border flex items-center justify-center gap-2 text-body-sm font-semibold text-primary hover:text-primary-600 transition-colors"
                >
                  {showAllModules ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      View all {totalModules} modules
                    </>
                  )}
                </button>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
