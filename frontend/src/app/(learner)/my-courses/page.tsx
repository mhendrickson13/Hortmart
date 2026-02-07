import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverApi, Enrollment, Course, Module, Lesson, LessonProgress } from "@/lib/server-api";
import { CourseCard } from "@/components/learner/course-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ArrowRight, GraduationCap, Trophy, Rocket } from "lucide-react";

interface EnrolledCourse extends Course {
  totalDuration: number;
  lessonsCount: number;
  progress: {
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
  };
}

async function getEnrolledCourses(): Promise<EnrolledCourse[]> {
  try {
    const result = await serverApi.courses.getEnrolled();
    const enrollments = result.data || [];

    return enrollments.map((enrollment) => {
      const course = enrollment.course!;
      const modules = course.modules || [];
      const allLessons = modules.flatMap((m: Module) => m.lessons || []);
      const totalLessons = allLessons.length;
      const lessonProgress = enrollment.lessonProgress || [];
      const completedLessons = lessonProgress.filter(
        (p: LessonProgress) => p.completedAt !== null
      ).length;

      return {
        ...course,
        totalDuration: allLessons.reduce((sum: number, l: Lesson) => sum + (l.durationSeconds || 0), 0),
        lessonsCount: totalLessons,
        progress: {
          completedLessons,
          totalLessons,
          progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        },
      };
    });
  } catch (error) {
    console.error("Failed to fetch enrolled courses:", error);
    return [];
  }
}

export default async function MyCoursesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const courses = await getEnrolledCourses();

  const inProgress = courses.filter(
    (c) => c.progress.progressPercent > 0 && c.progress.progressPercent < 100
  );
  const completed = courses.filter((c) => c.progress.progressPercent === 100);
  const notStarted = courses.filter((c) => c.progress.progressPercent === 0);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">My Courses</h1>
          <p className="text-body-sm text-text-2 mt-0.5">
            {courses.length === 0
              ? "You haven't enrolled in any courses yet"
              : `${courses.length} course${courses.length !== 1 ? 's' : ''} enrolled`}
          </p>
        </div>

        <Button asChild variant="secondary" size="sm" className="self-start sm:self-auto">
          <Link href="/courses">
            Browse Courses
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-h2 font-semibold text-text-1 mb-3">
              Start your learning journey
            </h3>
            <p className="text-body text-text-2 mb-6">
              Explore our catalog and enroll in courses to begin building new skills.
            </p>
            <Button asChild size="lg">
              <Link href="/courses">
                <BookOpen className="w-4 h-4 mr-2" />
                Browse Courses
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Continue Learning - Featured Cards */}
          {inProgress.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-h3 font-semibold text-text-1">
                    Continue Learning
                  </h2>
                  <p className="text-caption text-text-3">Pick up where you left off</p>
                </div>
              </div>
              <div className="space-y-3">
                {inProgress.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={course.progress}
                    variant="featured"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Ready to Start - Grid Cards */}
          {notStarted.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-h3 font-semibold text-text-1">
                    Ready to Start
                  </h2>
                  <p className="text-caption text-text-3">{notStarted.length} course{notStarted.length !== 1 ? 's' : ''} waiting for you</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notStarted.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={course.progress}
                    variant="enrolled"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed - Grid Cards */}
          {completed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-success" />
                </div>
                <div>
                  <h2 className="text-h3 font-semibold text-text-1">
                    Completed
                  </h2>
                  <p className="text-caption text-text-3">{completed.length} course{completed.length !== 1 ? 's' : ''} finished</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    progress={course.progress}
                    variant="enrolled"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
