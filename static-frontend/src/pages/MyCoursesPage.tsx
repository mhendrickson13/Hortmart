import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { users as usersApi, favourites as favouritesApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { CourseCard } from "@/components/learner/course-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, GraduationCap, Trophy, Rocket, Heart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";


type Tab = "enrolled" | "favourites" | "bookmarks";

export default function MyCoursesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("enrolled");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => usersApi.getProfileEnrollments(),
    enabled: !!user,
  });

  const { data: savesData } = useQuery({
    queryKey: ["my-favourites"],
    queryFn: () => favouritesApi.list(),
    enabled: !!user,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
        <p className="text-text-2 text-body font-bold">Failed to load your courses</p>
        <button onClick={() => refetch()} className="h-10 px-4 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px]">Try again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const enrollments = data?.enrollments || [];
  const courses = enrollments.map((enrollment: any) => {
    const course = enrollment.course || {};
    const modules = course.modules || [];
    const allLessons = modules.flatMap((m: any) => m.lessons || []);
    const totalLessons = allLessons.length;
    const lessonProgress = enrollment.lessonProgress || [];
    const completedLessons = lessonProgress.filter((p: any) => p.completedAt !== null).length;
    return {
      ...course,
      totalDuration: allLessons.reduce((sum: number, l: any) => sum + (l.durationSeconds || 0), 0),
      lessonsCount: totalLessons,
      progress: {
        completedLessons,
        totalLessons,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
    };
  });

  const inProgress = courses.filter((c: any) => c.progress.progressPercent > 0 && c.progress.progressPercent < 100);
  const completed = courses.filter((c: any) => c.progress.progressPercent === 100);
  const notStarted = courses.filter((c: any) => c.progress.progressPercent === 0);

  const favCourses = savesData?.favourites || [];
  const bmCourses = savesData?.bookmarks || [];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">My Courses</h1>
          <p className="text-body-sm text-text-2 mt-0.5">{courses.length} enrolled</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/courses">Browse Courses <ArrowRight className="w-4 h-4 ml-1" /></Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5 gap-0 -mx-1">
        {([
          { id: "enrolled" as Tab, label: "Enrolled", count: courses.length },
          { id: "favourites" as Tab, label: "Favourites", count: favCourses.length },
          { id: "bookmarks" as Tab, label: "Bookmarks", count: bmCourses.length },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 text-caption sm:text-body-sm font-semibold transition-all relative flex-1",
              activeTab === tab.id
                ? "text-primary"
                : "text-text-3 hover:text-text-2"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-bold",
                activeTab === tab.id ? "bg-primary text-white" : "bg-muted text-text-3"
              )}>{tab.count}</span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Favourites Tab */}
      {activeTab === "favourites" && (
        favCourses.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <Heart className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-h3 font-semibold text-text-1 mb-2">No favourites yet</h3>
              <p className="text-body-sm text-text-2 mb-4">Tap the heart icon on courses you love to save them here.</p>
              <Button asChild size="sm"><Link to="/courses">Explore Courses</Link></Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favCourses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )
      )}

      {/* Bookmarks Tab */}
      {activeTab === "bookmarks" && (
        bmCourses.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Bookmark className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-h3 font-semibold text-text-1 mb-2">No bookmarks yet</h3>
              <p className="text-body-sm text-text-2 mb-4">Bookmark courses to save them for later.</p>
              <Button asChild size="sm"><Link to="/courses">Explore Courses</Link></Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bmCourses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )
      )}

      {/* Enrolled Tab */}
      {activeTab === "enrolled" && (
        courses.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-h2 font-semibold text-text-1 mb-3">Start your learning journey</h3>
              <p className="text-body text-text-2 mb-6">Explore our catalog and enroll in courses that interest you.</p>
              <Button asChild size="lg">
                <Link to="/courses"><BookOpen className="w-4 h-4 mr-2" />Browse Courses</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {inProgress.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Rocket className="w-4 h-4 text-primary" /></div>
                  <div>
                    <h2 className="text-h3 font-semibold text-text-1">Continue Learning</h2>
                    <p className="text-body-sm text-text-2">Pick up where you left off</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {inProgress.map((course: any) => (
                    <CourseCard key={course.id} course={course} progress={course.progress} variant="featured" />
                  ))}
                </div>
              </section>
            )}
            {notStarted.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><BookOpen className="w-4 h-4 text-accent" /></div>
                  <div>
                    <h2 className="text-h3 font-semibold text-text-1">Ready to Start</h2>
                    <p className="text-body-sm text-text-2">Courses waiting for you</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notStarted.map((course: any) => (
                    <CourseCard key={course.id} course={course} progress={course.progress} variant="enrolled" />
                  ))}
                </div>
              </section>
            )}
            {completed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center"><Trophy className="w-4 h-4 text-success" /></div>
                  <div>
                    <h2 className="text-h3 font-semibold text-text-1">Completed</h2>
                    <p className="text-body-sm text-text-2">Great job finishing these courses!</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completed.map((course: any) => (
                    <CourseCard key={course.id} course={course} progress={course.progress} variant="enrolled" />
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      )}
    </>
  );
}
