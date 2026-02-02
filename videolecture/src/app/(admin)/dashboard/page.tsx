import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { StatCard } from "@/components/admin/stat-card";
import { CourseRow } from "@/components/admin/course-row";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Search, Plus, Bell, Calendar, ArrowRight, TrendingUp, Clock } from "lucide-react";
import { getInitials } from "@/lib/utils";

async function getDashboardData(creatorId: string) {
  // Get creator's courses
  const courses = await db.course.findMany({
    where: { creatorId },
    include: {
      _count: {
        select: {
          enrollments: true,
          reviews: true,
        },
      },
      enrollments: {
        include: {
          lessonProgress: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  type CourseWithData = typeof courses[0];
  type EnrollmentWithProgress = CourseWithData['enrollments'][0];
  type LessonProgressItem = EnrollmentWithProgress['lessonProgress'][0];

  // Calculate stats
  const totalEnrollments = courses.reduce(
    (sum: number, c: CourseWithData) => sum + c._count.enrollments,
    0
  );

  // Simulated revenue (in real app, this would come from payment records)
  const totalRevenue = courses.reduce(
    (sum: number, c: CourseWithData) => sum + c.price * c._count.enrollments,
    0
  );

  // Active learners (had progress in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeLearnerIds = new Set<string>();
  courses.forEach((course: CourseWithData) => {
    course.enrollments.forEach((enrollment: EnrollmentWithProgress) => {
      enrollment.lessonProgress.forEach((progress: LessonProgressItem) => {
        if (progress.lastWatchedAt && progress.lastWatchedAt > sevenDaysAgo) {
          activeLearnerIds.add(enrollment.userId);
        }
      });
    });
  });

  // Completion rate
  let totalCompleted = 0;
  let totalWithProgress = 0;
  courses.forEach((course: CourseWithData) => {
    course.enrollments.forEach((enrollment: EnrollmentWithProgress) => {
      if (enrollment.lessonProgress.length > 0) {
        totalWithProgress++;
        const allCompleted = enrollment.lessonProgress.every(
          (p: LessonProgressItem) => p.completedAt !== null
        );
        if (allCompleted && enrollment.lessonProgress.length > 0) {
          totalCompleted++;
        }
      }
    });
  });

  const completionRate =
    totalWithProgress > 0
      ? Math.round((totalCompleted / totalWithProgress) * 100)
      : 0;

  // Top courses by enrollment
  const topCourses = [...courses]
    .sort((a, b) => b._count.enrollments - a._count.enrollments)
    .slice(0, 3)
    .map((course) => ({
      ...course,
      revenue: course.price * course._count.enrollments,
      revenueChange: Math.floor(Math.random() * 20) + 5, // Simulated
    }));

  // Progress distribution
  const progressBuckets = {
    "0-25": 0,
    "25-50": 0,
    "50-75": 0,
    "75-100": 0,
    completed: 0,
  };

  courses.forEach((course: CourseWithData) => {
    course.enrollments.forEach((enrollment: EnrollmentWithProgress) => {
      const progress = enrollment.lessonProgress;
      if (progress.length === 0) {
        progressBuckets["0-25"]++;
        return;
      }

      const avgProgress =
        progress.reduce((sum: number, p: LessonProgressItem) => sum + p.progressPercent, 0) /
        progress.length;
      const allCompleted = progress.every((p: LessonProgressItem) => p.completedAt !== null);

      if (allCompleted) {
        progressBuckets["completed"]++;
      } else if (avgProgress < 25) {
        progressBuckets["0-25"]++;
      } else if (avgProgress < 50) {
        progressBuckets["25-50"]++;
      } else if (avgProgress < 75) {
        progressBuckets["50-75"]++;
      } else {
        progressBuckets["75-100"]++;
      }
    });
  });

  return {
    totalRevenue,
    totalEnrollments,
    activeLearners: activeLearnerIds.size,
    completionRate,
    topCourses,
    progressBuckets,
    totalCourses: courses.length,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData(session!.user.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] sm:text-caption text-text-3 mb-0.5 sm:mb-1">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {currentDate}
            </div>
            <h1 className="text-h2 sm:text-h1 font-bold text-text-1">
              Welcome back, {session?.user?.name?.split(" ")[0] || "Creator"}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
            <Button variant="secondary" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                3
              </span>
            </Button>
            <Button asChild size="sm" className="sm:hidden">
              <Link href="/manage-courses/new">
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/manage-courses/new">
                <Plus className="w-4 h-4 mr-1.5" />
                Create course
              </Link>
            </Button>
          </div>
        </div>
        {/* Mobile Search */}
        <div className="relative sm:hidden">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <Input placeholder="Search courses, users..." className="pl-10" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          title="Revenue (30d)"
          value={formatCurrency(data.totalRevenue)}
          change={18}
          changeLabel="vs last 30 days"
        />
        <StatCard
          title="Enrollments (30d)"
          value={data.totalEnrollments.toLocaleString()}
          change={9}
          changeLabel="vs last 30 days"
        />
        <StatCard
          title="Active learners (7d)"
          value={data.activeLearners.toLocaleString()}
          changeLabel="Healthy retention"
        />
        <StatCard
          title="Completion rate"
          value={`${data.completionRate}%`}
          changeLabel="Avg across courses"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3 flex-1 min-h-0">
        {/* Sales Chart */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body font-bold text-text-1">
              Sales (last 30 days)
            </h3>
            <Pill>All courses</Pill>
          </div>

          <div className="flex-1 rounded-xl border border-border/95 bg-white/95 p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
                <span className="text-caption text-text-3 font-semibold">
                  Revenue
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-caption text-text-3 font-semibold">
                  Enrollments
                </span>
              </div>
            </div>

            {/* Placeholder Chart */}
            <div className="h-48 flex items-end gap-2 pb-4">
              {[40, 55, 35, 70, 60, 85, 75, 90, 65, 80, 70, 95].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-1">
                  <div
                    className="bg-primary/80 rounded-t"
                    style={{ height: `${h}%` }}
                  />
                  <div
                    className="bg-accent/60 rounded-t"
                    style={{ height: `${h * 0.7}%` }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between text-[11px] text-text-3 font-semibold">
              <span>W1</span>
              <span>W2</span>
              <span>W3</span>
              <span>W4</span>
            </div>
          </div>
        </Card>

        {/* Right Column */}
        <div className="flex flex-col gap-3">
          {/* Top Courses */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body font-bold text-text-1">Top courses</h3>
              <Pill>By revenue</Pill>
            </div>

            <div className="space-y-2.5">
              {data.topCourses.length > 0 ? (
                data.topCourses.map((course) => (
                  <CourseRow key={course.id} course={course} />
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-body-sm text-text-2">
                    No courses yet.{" "}
                    <Link
                      href="/manage-courses/new"
                      className="text-primary font-semibold"
                    >
                      Create your first course
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Progress Distribution */}
          <Card className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body font-bold text-text-1">
                Learner progress snapshot
              </h3>
              <Pill>30d</Pill>
            </div>

            <div className="rounded-xl border border-border/95 bg-white/95 p-3 h-28">
              <div className="h-full flex items-end gap-2">
                {Object.entries(data.progressBuckets).map(([label, count]) => {
                  const maxCount = Math.max(
                    ...Object.values(data.progressBuckets)
                  );
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const colors: Record<string, string> = {
                    "0-25": "bg-text-1/8",
                    "25-50": "bg-text-1/8",
                    "50-75": "bg-text-1/8",
                    "75-100": "bg-primary/20",
                    completed: "bg-success/20",
                  };

                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-xl ${colors[label]}`}
                        style={{ height: `${Math.max(height, 10)}%` }}
                      />
                      <span className="text-[10px] text-text-3 font-semibold whitespace-nowrap">
                        {label === "completed" ? "Done" : label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/manage-courses/new"
                className="flex items-center justify-between p-3 rounded-xl border border-border/95 bg-white/95 hover:bg-primary/5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-caption font-semibold text-text-1">Create New Course</span>
                </div>
                <ArrowRight className="w-4 h-4 text-text-3 group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/analytics"
                className="flex items-center justify-between p-3 rounded-xl border border-border/95 bg-white/95 hover:bg-primary/5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-caption font-semibold text-text-1">View Analytics</span>
                </div>
                <ArrowRight className="w-4 h-4 text-text-3 group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/manage-courses"
                className="flex items-center justify-between p-3 rounded-xl border border-border/95 bg-white/95 hover:bg-primary/5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-caption font-semibold text-text-1">Manage Courses</span>
                </div>
                <ArrowRight className="w-4 h-4 text-text-3 group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
