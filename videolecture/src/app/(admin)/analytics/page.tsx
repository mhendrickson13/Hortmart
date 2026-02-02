import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Pill } from "@/components/ui/pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Users,
  TrendingUp,
  BookOpen,
  Clock,
  Target,
  BarChart3,
  Activity,
} from "lucide-react";

async function getAnalyticsData(creatorId: string) {
  // Get all courses with enrollments and progress
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
          user: {
            select: { name: true, email: true, createdAt: true },
          },
        },
      },
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  });

  // Calculate metrics
  const totalEnrollments = courses.reduce(
    (sum, c) => sum + c._count.enrollments,
    0
  );
  const totalRevenue = courses.reduce(
    (sum, c) => sum + c.price * c._count.enrollments,
    0
  );
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.status === "PUBLISHED").length;
  const totalLessons = courses.reduce(
    (sum, c) => sum + c.modules.reduce((s, m) => s + m.lessons.length, 0),
    0
  );

  // Calculate watch time (estimate based on completed lessons)
  let totalWatchSeconds = 0;
  courses.forEach((course) => {
    course.enrollments.forEach((enrollment) => {
      enrollment.lessonProgress.forEach((progress) => {
        const lesson = course.modules
          .flatMap((m) => m.lessons)
          .find((l) => l.id === progress.lessonId);
        if (lesson) {
          totalWatchSeconds += (lesson.durationSeconds * progress.progressPercent) / 100;
        }
      });
    });
  });
  const totalWatchHours = Math.round(totalWatchSeconds / 3600);

  // Completion rate
  let totalCompleted = 0;
  let totalWithProgress = 0;
  courses.forEach((course) => {
    course.enrollments.forEach((enrollment) => {
      if (enrollment.lessonProgress.length > 0) {
        totalWithProgress++;
        const allCompleted = enrollment.lessonProgress.every(
          (p) => p.completedAt !== null
        );
        if (allCompleted) totalCompleted++;
      }
    });
  });
  const completionRate = totalWithProgress > 0
    ? Math.round((totalCompleted / totalWithProgress) * 100)
    : 0;

  // Course performance
  const coursePerformance = courses.map((course) => {
    const lessons = course.modules.flatMap((m) => m.lessons);
    const enrollmentData = course.enrollments.map((e) => {
      const completedLessons = e.lessonProgress.filter(
        (p) => p.completedAt !== null
      ).length;
      return {
        completed: completedLessons,
        total: lessons.length,
        percent: lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0,
      };
    });

    const avgProgress =
      enrollmentData.length > 0
        ? Math.round(
            enrollmentData.reduce((sum, e) => sum + e.percent, 0) /
              enrollmentData.length
          )
        : 0;

    return {
      id: course.id,
      title: course.title,
      status: course.status,
      enrollments: course._count.enrollments,
      revenue: course.price * course._count.enrollments,
      avgProgress,
      lessonsCount: lessons.length,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Recent enrollments
  const recentEnrollments = courses
    .flatMap((c) =>
      c.enrollments.map((e) => ({
        courseTitle: c.title,
        userName: e.user.name,
        userEmail: e.user.email,
        enrolledAt: e.enrolledAt,
      }))
    )
    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
    .slice(0, 10);

  // Monthly data (simulated for demo)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      month: date.toLocaleString("default", { month: "short" }),
      revenue: Math.round(totalRevenue * (0.1 + Math.random() * 0.2)),
      enrollments: Math.round(totalEnrollments * (0.1 + Math.random() * 0.2)),
    };
  });

  return {
    totalRevenue,
    totalEnrollments,
    totalCourses,
    publishedCourses,
    totalLessons,
    totalWatchHours,
    completionRate,
    coursePerformance,
    recentEnrollments,
    monthlyData,
  };
}

export default async function AnalyticsPage() {
  const session = await auth();
  const data = await getAnalyticsData(session!.user.id);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Analytics</h1>
          <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
            Track your course performance and learner engagement
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Pill size="lg">Last 30 days</Pill>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          change={12}
          changeLabel="vs last period"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          title="Total Enrollments"
          value={data.totalEnrollments.toLocaleString()}
          change={8}
          changeLabel="vs last period"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Watch Hours"
          value={`${data.totalWatchHours}h`}
          changeLabel="Total content watched"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${data.completionRate}%`}
          changeLabel="Course completions"
          icon={<Target className="w-4 h-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Chart */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-body font-bold text-text-1">Revenue Trend</h3>
                <Pill>Monthly</Pill>
              </div>
              <div className="h-48 flex items-end gap-3 pb-6 border-b border-border/50">
                {data.monthlyData.map((item, i) => {
                  const maxRevenue = Math.max(...data.monthlyData.map((d) => d.revenue));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full relative">
                        <div
                          className="w-full bg-primary/80 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(height, 8)}%`, minHeight: "12px" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-caption text-text-3">
                {data.monthlyData.map((item, i) => (
                  <span key={i}>{item.month}</span>
                ))}
              </div>
            </Card>

            {/* Enrollments Chart */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-body font-bold text-text-1">Enrollments Trend</h3>
                <Pill>Monthly</Pill>
              </div>
              <div className="h-48 flex items-end gap-3 pb-6 border-b border-border/50">
                {data.monthlyData.map((item, i) => {
                  const maxEnrollments = Math.max(
                    ...data.monthlyData.map((d) => d.enrollments)
                  );
                  const height =
                    maxEnrollments > 0 ? (item.enrollments / maxEnrollments) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full relative">
                        <div
                          className="w-full bg-accent/70 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(height, 8)}%`, minHeight: "12px" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-caption text-text-3">
                {data.monthlyData.map((item, i) => (
                  <span key={i}>{item.month}</span>
                ))}
              </div>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-h3 font-bold text-text-1">{data.totalCourses}</div>
                <div className="text-caption text-text-3">Total Courses</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-h3 font-bold text-text-1">{data.publishedCourses}</div>
                <div className="text-caption text-text-3">Published</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-h3 font-bold text-text-1">{data.totalLessons}</div>
                <div className="text-caption text-text-3">Total Lessons</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-h3 font-bold text-text-1">
                  {data.totalRevenue > 0
                    ? `$${Math.round(data.totalRevenue / Math.max(data.totalEnrollments, 1))}`
                    : "$0"}
                </div>
                <div className="text-caption text-text-3">Avg. Order Value</div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-4">Course Performance</h3>
            <div className="space-y-3">
              {data.coursePerformance.length === 0 ? (
                <p className="text-body-sm text-text-2 text-center py-8">
                  No courses yet. Create your first course to see analytics.
                </p>
              ) : (
                data.coursePerformance.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-border/95 bg-white/95"
                  >
                    <div className="w-10 h-10 rounded-xl gradient-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-bold text-text-1 truncate">
                          {course.title}
                        </span>
                        <Pill
                          size="sm"
                          variant={course.status === "PUBLISHED" ? "published" : "draft"}
                        >
                          {course.status}
                        </Pill>
                      </div>
                      <div className="text-caption text-text-3 mt-0.5">
                        {course.lessonsCount} lessons
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-caption font-bold text-text-1">
                        {course.enrollments} enrolled
                      </div>
                      <div className="text-caption text-text-3">
                        {course.avgProgress}% avg. progress
                      </div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <div className="text-body-sm font-bold text-text-1">
                        {formatCurrency(course.revenue)}
                      </div>
                      <div className="text-caption text-success">Revenue</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-4">Recent Enrollments</h3>
            <div className="space-y-2">
              {data.recentEnrollments.length === 0 ? (
                <p className="text-body-sm text-text-2 text-center py-8">
                  No enrollments yet.
                </p>
              ) : (
                data.recentEnrollments.map((enrollment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/95 bg-white/95"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-caption">
                        {enrollment.userName?.charAt(0) || "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-caption font-bold text-text-1 truncate">
                          {enrollment.userName || "Unknown User"}
                        </div>
                        <div className="text-caption text-text-3 truncate">
                          {enrollment.userEmail}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-caption font-semibold text-text-1 truncate max-w-[200px]">
                        {enrollment.courseTitle}
                      </div>
                      <div className="text-caption text-text-3">
                        {formatDate(enrollment.enrolledAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
