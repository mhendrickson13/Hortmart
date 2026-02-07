import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Pill } from "@/components/ui/pill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, ProgressDistribution } from "@/components/admin/bar-chart";
import { serverApi } from "@/lib/server-api";
import { Download, Calendar } from "lucide-react";
import { AnalyticsActions } from "@/components/admin/analytics-actions";

interface AnalyticsData {
  totalRevenue: number;
  totalEnrollments: number;
  completionRate: number;
  conversionRate: number;
  refunds: number;
  revenueChange: number;
  enrollmentChange: number;
  coursePerformance: Array<{
    id: string;
    title: string;
    status: string;
    enrollments: number;
    revenue: number;
    avgProgress: number;
    lessonsCount: number;
  }>;
  chartData: Array<{
    label: string;
    value: number;
    secondaryValue?: number;
  }>;
  topLearners: Array<{
    email: string;
    name: string | null;
    lastActive: string | null;
    course: string;
    progress: number;
  }>;
  progressBuckets: Record<string, number>;
}

async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    const analytics = await serverApi.analytics.getOverview({ period: "30d" });
    const coursesResult = await serverApi.courses.getMyCourses();
    const courses = coursesResult.data || [];

    const coursePerformance = (analytics.topCourses || []).map((course) => ({
      id: course.id,
      title: course.title,
      status: course.status,
      enrollments: course._count?.enrollments || 0,
      revenue: course.price * (course._count?.enrollments || 0),
      avgProgress: 0,
      lessonsCount: course.lessonsCount || 0,
    }));

    // Build dual-line chart data (week aggregation)
    const revenuePoints = analytics.charts?.revenue || [];
    const enrollmentPoints = analytics.charts?.enrollments || [];
    const chartData: AnalyticsData["chartData"] = [];

    if (revenuePoints.length > 0) {
      const weekSize = Math.ceil(revenuePoints.length / 4);
      for (let w = 0; w < 4; w++) {
        const rSlice = revenuePoints.slice(w * weekSize, (w + 1) * weekSize);
        const eSlice = enrollmentPoints.slice(w * weekSize, (w + 1) * weekSize);
        chartData.push({
          label: `W${w + 1}`,
          value: rSlice.reduce((s, r) => s + r.value, 0),
          secondaryValue: eSlice.reduce((s, e) => s + e.value, 0),
        });
      }
    }

    // Compute change percentages
    let revenueChange = 0;
    if (revenuePoints.length >= 2) {
      const half = Math.floor(revenuePoints.length / 2);
      const recent = revenuePoints.slice(half).reduce((s, r) => s + r.value, 0);
      const prev = revenuePoints.slice(0, half).reduce((s, r) => s + r.value, 0);
      if (prev > 0) revenueChange = Math.round(((recent - prev) / prev) * 100);
    }

    let enrollmentChange = 0;
    if (enrollmentPoints.length >= 2) {
      const half = Math.floor(enrollmentPoints.length / 2);
      const recent = enrollmentPoints.slice(half).reduce((s, e) => s + e.value, 0);
      const prev = enrollmentPoints.slice(0, half).reduce((s, e) => s + e.value, 0);
      if (prev > 0) enrollmentChange = Math.round(((recent - prev) / prev) * 100);
    }

    // Avg order value as conversion proxy
    const conversionRate =
      analytics.overview?.totalEnrollments > 0
        ? Math.round(
            (analytics.overview.totalEnrollments / Math.max(analytics.overview.activeLearners || 1, 1)) * 100
          ) / 10
        : 0;

    // Map top learners from backend
    const rawLearners = analytics.topLearners || [];
    const topLearners = rawLearners.map((l: { email: string; name: string | null; lastActive: string | null; course: string; progress: number }) => ({
      email: l.email,
      name: l.name,
      lastActive: l.lastActive,
      course: l.course,
      progress: l.progress,
    }));

    // Map progress buckets from backend
    const rawBuckets = analytics.progressBuckets || {};
    const progressBuckets = {
      "0-25": rawBuckets["0-25"] ?? 0,
      "25-50": rawBuckets["25-50"] ?? 0,
      "50-75": rawBuckets["50-75"] ?? 0,
      "75-100": rawBuckets["75-100"] ?? 0,
      completed: rawBuckets["completed"] ?? 0,
    };

    return {
      totalRevenue: analytics.overview?.totalRevenue || 0,
      totalEnrollments: analytics.overview?.totalEnrollments || 0,
      completionRate: analytics.overview?.completionRate || 0,
      conversionRate,
      refunds: 0, // Backend doesn't track refunds yet
      revenueChange,
      enrollmentChange,
      coursePerformance,
      chartData,
      topLearners,
      progressBuckets,
    };
  } catch (error) {
    console.error("Failed to fetch analytics data:", error);
    return {
      totalRevenue: 0,
      totalEnrollments: 0,
      completionRate: 0,
      conversionRate: 0,
      refunds: 0,
      revenueChange: 0,
      enrollmentChange: 0,
      coursePerformance: [],
      chartData: [],
      topLearners: [],
      progressBuckets: {
        "0-25": 0,
        "25-50": 0,
        "50-75": 0,
        "75-100": 0,
        completed: 0,
      },
    };
  }
}

export default async function AnalyticsPage() {
  await auth();
  const data = await getAnalyticsData();

  return (
    <>
      {/* Header - matches design */}
      <div className="flex items-center justify-between gap-3 h-14 flex-shrink-0">
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-text-1">
            Analytics
          </h1>
          <p className="text-[12px] font-extrabold text-text-3 mt-1">
            Last 30 days &bull; All courses
          </p>
        </div>
        <AnalyticsActions />
      </div>

      {/* Stats Grid - matches design: Revenue, Purchases, Refunds, Conversion */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Revenue"
          value={formatCurrency(data.totalRevenue)}
          change={data.revenueChange}
          changeLabel="vs last 30 days"
        />
        <StatCard
          title="Purchases"
          value={data.totalEnrollments.toLocaleString()}
          change={data.enrollmentChange}
          changeLabel="vs last 30 days"
        />
        <StatCard
          title="Refunds"
          value={data.refunds.toLocaleString()}
          changeLabel="Low refund rate"
        />
        <StatCard
          title="Conversion"
          value={`${data.conversionRate}%`}
          changeLabel="Views → enrollments"
        />
      </div>

      {/* Tabs - Sales / Progress / Users matching design */}
      <Tabs defaultValue="sales" className="flex-1">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3">
            {/* Revenue & Enrollments dual chart */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-black text-text-1">
                  Revenue & enrollments
                </h3>
                <Pill>4 weeks</Pill>
              </div>
              {/* Legend */}
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
              {data.chartData.length > 0 ? (
                <BarChart
                  data={data.chartData}
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

            {/* Right panels */}
            <div className="flex flex-col gap-3">
              {/* Top learners */}
              <Card className="p-4">
                <h3 className="text-[14px] font-black text-text-1 mb-3">
                  Top learners
                </h3>
                {data.topLearners.length > 0 ? (
                  <div className="space-y-2">
                    {data.topLearners.map((learner, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2.5 rounded-[16px] border border-border/95 bg-white/95"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] flex-shrink-0">
                          {learner.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-black text-text-1 truncate">
                            {learner.email}
                          </div>
                          <div className="text-[11px] font-extrabold text-text-3 mt-0.5 truncate">
                            {learner.course}
                          </div>
                        </div>
                        <span className="text-[12px] font-black text-primary">
                          {learner.progress}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-text-3 text-[13px] font-bold">
                    No learner data available yet.
                  </div>
                )}
              </Card>

              {/* Progress distribution */}
              <Card className="p-4 flex-1">
                <h3 className="text-[14px] font-black text-text-1 mb-3">
                  Progress distribution
                </h3>
                <div className="rounded-[18px] border border-border/95 bg-gradient-to-b from-white/95 to-white/88 p-3">
                  <ProgressDistribution data={data.progressBuckets} height={120} />
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-[14px] font-black text-text-1 mb-4">
                Completion Rate Trend
              </h3>
              <div className="flex items-center justify-center h-[180px] text-text-3 text-body-sm">
                Completion data will appear as learners progress through courses.
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-[14px] font-black text-text-1 mb-4">
                Progress Distribution
              </h3>
              <div className="rounded-[18px] border border-border/95 bg-gradient-to-b from-white/95 to-white/88 p-3">
                <ProgressDistribution data={data.progressBuckets} height={160} />
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card className="p-4">
            <h3 className="text-[14px] font-black text-text-1 mb-4">
              Course Performance
            </h3>
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
                          variant={
                            course.status === "PUBLISHED"
                              ? "published"
                              : "draft"
                          }
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
      </Tabs>
    </>
  );
}
