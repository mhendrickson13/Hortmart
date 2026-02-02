import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseCard } from "@/components/learner/course-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

async function getEnrolledCourses(userId: string) {
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          creator: {
            select: { name: true },
          },
          modules: {
            include: {
              lessons: {
                select: {
                  id: true,
                  durationSeconds: true,
                },
              },
            },
          },
        },
      },
      lessonProgress: true,
    },
    orderBy: { enrolledAt: "desc" },
  });

  return enrollments.map((enrollment) => {
    const allLessons = enrollment.course.modules.flatMap((m) => m.lessons);
    const totalLessons = allLessons.length;
    const completedLessons = enrollment.lessonProgress.filter(
      (p) => p.completedAt !== null
    ).length;

    return {
      ...enrollment.course,
      totalDuration: allLessons.reduce((sum, l) => sum + l.durationSeconds, 0),
      lessonsCount: totalLessons,
      progress: {
        completedLessons,
        totalLessons,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
    };
  });
}

export default async function MyCoursesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const courses = await getEnrolledCourses(session.user.id);

  const inProgress = courses.filter(
    (c) => c.progress.progressPercent > 0 && c.progress.progressPercent < 100
  );
  const completed = courses.filter((c) => c.progress.progressPercent === 100);
  const notStarted = courses.filter((c) => c.progress.progressPercent === 0);

  return (
    <>
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">My Courses</h1>
          <p className="text-body-sm text-text-2 mt-0.5">
            {courses.length === 0
              ? "You haven't enrolled in any courses yet"
              : `${courses.length} courses enrolled`}
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-h3 font-semibold text-text-1 mb-2">
              Start your learning journey
            </h3>
            <p className="text-body-sm text-text-2 mb-4">
              Browse our catalog and enroll in your first course.
            </p>
            <Button asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Continue Learning */}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-h3 font-semibold text-text-1 mb-3">
                Continue Learning
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgress.map((course) => (
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

          {/* Not Started */}
          {notStarted.length > 0 && (
            <section>
              <h2 className="text-h3 font-semibold text-text-1 mb-3">
                Ready to Start
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-h3 font-semibold text-text-1 mb-3">
                Completed
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
