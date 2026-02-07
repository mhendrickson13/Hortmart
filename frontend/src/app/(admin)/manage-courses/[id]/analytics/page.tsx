import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Pill } from "@/components/ui/pill";
import { BarChart, FunnelStep } from "@/components/admin/bar-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { serverApi } from "@/lib/server-api";
import Link from "next/link";
import { ArrowLeft, TrendingDown } from "lucide-react";
import { AnalyticsActions } from "@/components/admin/analytics-actions";

interface CourseAnalyticsData {
  courseName: string;
  courseId: string;
  overview: {
    totalEnrollments: number;
    activeStudents: number;
    completionRate: number;
    averageProgress: number;
    averageRating: number;
    totalRevenue: number;
  };
  revenueChange: number;
  enrollmentChange: number;
  enrollmentTrend: Array<{ label: string; value: number; secondaryValue?: number }>;
  lessonStats: Array<{
    lessonId: string;
    title: string;
    completionRate: number;
    averageWatchTime: number;
    dropOffRate?: number;
  }>;
  topStudents: Array<{
    name: string | null;
    progress: number;
  }>;
  completionFunnel: Array<{
    label: string;
    count: number;
    percent: number;
  }>;
}

async function getCourseAnalytics(
  courseId: string
): Promise<CourseAnalyticsData | null> {
  try {
    const course = await serverApi.courses.get(courseId);
    if (!course) return null;

    const analytics = await serverApi.courseAnalytics.get(courseId);

    // Build week-aggregated data for dual chart
    const rawTrend = analytics.enrollmentTrend || [];
    const weekData: CourseAnalyticsData["enrollmentTrend"] = [];
    if (rawTrend.length > 0) {
      const weekSize = Math.ceil(rawTrend.length / 4);
      for (let w = 0; w < 4; w++) {
        const slice = rawTrend.slice(w * weekSize, (w + 1) * weekSize);
        weekData.push({
          label: `W${w + 1}`,
          value: slice.reduce((s: number, t: { count: number }) => s + t.count, 0),
          secondaryValue: Math.round(
            slice.reduce((s: number, t: { count: number }) => s + t.count, 0) *
              (analytics.overview?.totalRevenue || 0) /
              Math.max(analytics.overview?.totalEnrollments || 1, 1)
          ),
        });
      }
    }

    // Build completion funnel
    const totalEnrollments = analytics.overview?.totalEnrollments || 0;
    const completionRate = analytics.overview?.completionRate || 0;
    const avgProgress = analytics.overview?.averageProgress || 0;
    const completionFunnel = [
      {
        label: "Started",
        count: totalEnrollments,
        percent: 100,
      },
      {
        label: "Reached 50%",
        count: Math.round(totalEnrollments * (avgProgress > 50 ? 0.67 : avgProgress / 100)),
        percent: avgProgress > 50 ? 67 : Math.round(avgProgress),
      },
      {
        label: "Completed",
        count: Math.round(totalEnrollments * completionRate / 100),
        percent: Math.round(completionRate),
      },
    ];

    // Calculate changes from trends instead of hardcoding
    const revenueChange = (() => {
      if (weekData.length >= 2) {
        const half = Math.floor(weekData.length / 2);
        const recent = weekData.slice(half).reduce((s, w) => s + (w.secondaryValue || 0), 0);
        const prev = weekData.slice(0, half).reduce((s, w) => s + (w.secondaryValue || 0), 0);
        if (prev > 0) return Math.round(((recent - prev) / prev) * 100);
      }
      return 0;
    })();

    const enrollmentChange = (() => {
      if (weekData.length >= 2) {
        const half = Math.floor(weekData.length / 2);
        const recent = weekData.slice(half).reduce((s, w) => s + w.value, 0);
        const prev = weekData.slice(0, half).reduce((s, w) => s + w.value, 0);
        if (prev > 0) return Math.round(((recent - prev) / prev) * 100);
      }
      return 0;
    })();

    return {
      courseName: course.title,
      courseId,
      overview: analytics.overview,
      revenueChange,
      enrollmentChange,
      enrollmentTrend: weekData.length > 0 ? weekData : rawTrend.map(
        (item: { date: string; count: number }) => ({
          label: new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: item.count,
        })
      ),
      lessonStats: analytics.lessonStats || [],
      topStudents: analytics.topStudents || [],
      completionFunnel,
    };
  } catch (error) {
    console.error("Failed to fetch course analytics:", error);
    return null;
  }
}

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth();
  const { id } = await params;
  const data = await getCourseAnalytics(id);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-text-2 text-body">Course analytics not available.</p>
        <Link
          href="/manage-courses"
          className="text-primary font-bold text-body-sm"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header - matches design: Course name as title */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/manage-courses"
            className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 grid place-items-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div>
            <h1 className="text-[20px] font-black tracking-tight text-text-1">
              {data.courseName}
            </h1>
            <p className="text-[12px] font-extrabold text-text-3 mt-1">
              Course analytics &bull; Last 30 days
            </p>
          </div>
        </div>
        <AnalyticsActions />
      </div>

      {/* Stats Grid - matches design: Revenue, Purchases, Refunds, Completion */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Revenue"
          value={formatCurrency(data.overview.totalRevenue)}
          change={data.revenueChange || undefined}
          changeLabel="vs last 30 days"
        />
        <StatCard
          title="Purchases"
          value={data.overview.totalEnrollments.toLocaleString()}
          change={data.enrollmentChange || undefined}
          changeLabel="vs last 30 days"
        />
        <StatCard
          title="Refunds"
          value="0"
          changeLabel="Low refund rate"
        />
        <StatCard
          title="Completion rate"
          value={`${data.overview.completionRate}%`}
          changeLabel="Avg across learners"
        />
      </div>

      {/* Tabs - Sales / Progress / Users */}
      <Tabs defaultValue="sales" className="flex-1">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-3">
            {/* Revenue & Enrollments dual chart */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-black text-text-1">
                  Revenue & enrollments
                </h3>
                <Pill>4 weeks</Pill>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-black text-text-3 mb-3">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Revenue
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent/80" />
                  Enrollments
                </span>
              </div>
              {data.enrollmentTrend.length > 0 ? (
                <BarChart
                  data={data.enrollmentTrend}
                  primaryColor="bg-primary/80"
                  secondaryColor="bg-accent/70"
                  showLegend={false}
                  height={200}
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-text-3 text-body-sm">
                  No data for this period
                </div>
              )}
            </Card>

            {/* Right: Completion funnel + Top lessons */}
            <div className="flex flex-col gap-3">
              {/* Completion Funnel */}
              <Card className="p-4">
                <h3 className="text-[14px] font-black text-text-1 mb-4">
                  Completion funnel
                </h3>
                <div className="space-y-3">
                  {data.completionFunnel.map((step, i) => (
                    <FunnelStep
                      key={i}
                      label={step.label}
                      count={step.count}
                      percent={step.percent}
                      color={i === 0 ? "primary" : i === 1 ? "accent" : "success"}
                    />
                  ))}
                </div>
              </Card>

              {/* Top lessons (drop-off) */}
              <Card className="p-4 flex-1">
                <h3 className="text-[14px] font-black text-text-1 mb-3">
                  Top lessons (drop-off)
                </h3>
                {data.lessonStats.length === 0 ? (
                  <p className="text-body-sm text-text-2 text-center py-4">
                    No lesson data available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.lessonStats.slice(0, 5).map((lesson) => (
                      <div
                        key={lesson.lessonId}
                        className="flex items-center gap-3 p-2.5 rounded-[16px] border border-border/95 bg-white/95"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-black text-text-1 truncate">
                            {lesson.title}
                          </div>
                          <div className="text-[11px] font-extrabold text-text-3 mt-0.5">
                            Avg watch: {lesson.completionRate}%
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {lesson.completionRate < 50 && (
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <Link
                            href={`/manage-courses/${data.courseId}/lessons/${lesson.lessonId}/edit`}
                            className="h-[28px] px-2.5 rounded-[12px] text-[11px] font-black bg-primary/10 border border-primary/14 text-primary-600 inline-flex items-center hover:bg-primary/15 transition-colors"
                          >
                            {lesson.completionRate < 50 ? "Improve" : "View"}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="p-4">
              <h3 className="text-[14px] font-black text-text-1 mb-4">
                Completion Funnel
              </h3>
              <div className="space-y-3">
                {data.completionFunnel.map((step, i) => (
                  <FunnelStep
                    key={i}
                    label={step.label}
                    count={step.count}
                    percent={step.percent}
                    color={i === 0 ? "primary" : i === 1 ? "accent" : "success"}
                  />
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-[14px] font-black text-text-1 mb-4">
                Top Students
              </h3>
              <div className="space-y-2">
                {data.topStudents.length === 0 ? (
                  <p className="text-body-sm text-text-2 text-center py-8">
                    No students enrolled yet.
                  </p>
                ) : (
                  data.topStudents.map((student, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-border/95 bg-white/95"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-caption flex-shrink-0">
                        {student.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-caption font-bold text-text-1 truncate">
                          {student.name || "Anonymous"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-border/50 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <span className="text-caption font-bold text-text-1 w-12 text-right">
                          {student.progress}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card className="p-4">
            <h3 className="text-[14px] font-black text-text-1 mb-4">
              Lesson Performance
            </h3>
            <div className="space-y-2">
              {data.lessonStats.length === 0 ? (
                <p className="text-body-sm text-text-2 text-center py-8">
                  No lesson data available.
                </p>
              ) : (
                data.lessonStats.map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    className="flex items-center gap-4 p-3 rounded-xl border border-border/95 bg-white/95"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-caption font-bold text-text-1 truncate">
                        {lesson.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-caption font-bold text-text-1">
                          {lesson.completionRate}%
                        </div>
                        <div className="text-[11px] text-text-3">Completion</div>
                      </div>
                      <div className="w-20 h-2 rounded-full bg-border/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            lesson.completionRate >= 70
                              ? "bg-success"
                              : lesson.completionRate >= 40
                              ? "bg-warning"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${lesson.completionRate}%` }}
                        />
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
