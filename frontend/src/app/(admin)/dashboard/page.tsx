import { auth } from "@/lib/auth";
import { formatCurrency, formatPrice } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardHeader } from "@/components/admin/dashboard-header";
import { BarChart, ProgressDistribution } from "@/components/admin/bar-chart";
import Link from "next/link";
import { serverApi, DashboardTopCourse } from "@/lib/server-api";

async function getDashboardData() {
  try {
    const stats = await serverApi.dashboard.getStats();

    // Compute change percentages from trends
    const revenueTrends = stats.revenueTrends || [];
    const enrollmentTrends = stats.enrollmentTrends || [];

    let revenueChange = 0;
    if (revenueTrends.length >= 2) {
      const half = Math.floor(revenueTrends.length / 2);
      const recent = revenueTrends.slice(half).reduce((s, t) => s + t.value, 0);
      const prev = revenueTrends.slice(0, half).reduce((s, t) => s + t.value, 0);
      if (prev > 0) revenueChange = Math.round(((recent - prev) / prev) * 100);
    }

    let enrollmentChange = 0;
    if (enrollmentTrends.length >= 2) {
      const half = Math.floor(enrollmentTrends.length / 2);
      const recent = enrollmentTrends.slice(half).reduce((s, t) => s + t.value, 0);
      const prev = enrollmentTrends.slice(0, half).reduce((s, t) => s + t.value, 0);
      if (prev > 0) enrollmentChange = Math.round(((recent - prev) / prev) * 100);
    }

    return {
      totalRevenue: stats.totalRevenue || 0,
      totalEnrollments: stats.totalEnrollments || 0,
      activeLearners: stats.activeLearners || 0,
      completionRate: stats.completionRate || 0,
      revenueChange,
      enrollmentChange,
      totalCourses: stats.totalCourses || 0,
      totalUsers: stats.totalUsers || 0,
      topCourses: stats.topCourses || [],
      progressBuckets: stats.progressBuckets || {
        "0-25": 0,
        "25-50": 0,
        "50-75": 0,
        "75-100": 0,
        completed: 0,
      },
      revenueTrends: revenueTrends,
      enrollmentTrends: enrollmentTrends,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return {
      totalRevenue: 0,
      totalEnrollments: 0,
      activeLearners: 0,
      completionRate: 0,
      revenueChange: 0,
      enrollmentChange: 0,
      totalCourses: 0,
      totalUsers: 0,
      topCourses: [] as DashboardTopCourse[],
      progressBuckets: {
        "0-25": 0,
        "25-50": 0,
        "50-75": 0,
        "75-100": 0,
        completed: 0,
      },
      revenueTrends: [],
      enrollmentTrends: [],
    };
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build week-grouped data for chart (W1, W2, W3, W4)
  const weekData = [];
  const trends = data.revenueTrends;
  if (trends.length > 0) {
    const weekSize = Math.ceil(trends.length / 4);
    for (let w = 0; w < 4; w++) {
      const slice = trends.slice(w * weekSize, (w + 1) * weekSize);
      const revenue = slice.reduce((s, t) => s + t.value, 0);
      const enrollSlice = (data.enrollmentTrends || []).slice(
        w * weekSize,
        (w + 1) * weekSize
      );
      const enrollments = enrollSlice.reduce((s, t) => s + t.value, 0);
      weekData.push({
        label: `W${w + 1}`,
        value: revenue,
        secondaryValue: enrollments,
      });
    }
  }

  return (
    <>
      {/* Header */}
      <DashboardHeader
        userName={session?.user?.name?.split(" ")[0] || "Creator"}
        currentDate={currentDate}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          title="Revenue (30d)"
          value={formatCurrency(data.totalRevenue)}
          change={data.revenueChange}
          changeLabel="vs prev period"
        />
        <StatCard
          title="Enrollments"
          value={data.totalEnrollments.toLocaleString()}
          change={data.enrollmentChange}
          changeLabel={`${data.totalCourses} courses`}
        />
        <StatCard
          title="Active learners (30d)"
          value={data.activeLearners.toLocaleString()}
          changeLabel={`${data.totalUsers} total users`}
        />
        <StatCard
          title="Completion rate"
          value={`${data.completionRate}%`}
          changeLabel="Avg across courses"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3 flex-1 min-h-0">
        {/* Sales Chart Panel */}
        <Card className="p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black text-text-1">
              Sales (last 30 days)
            </h3>
            <Pill>All courses</Pill>
          </div>

          <div className="flex-1 rounded-[18px] border border-border/95 bg-gradient-to-b from-white/95 to-white/88 p-3">
            {/* Legend */}
            <div className="flex items-center gap-2.5 text-[12px] font-black text-text-3 mb-2">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_10px_18px_rgba(47,111,237,0.18)]" />
                Revenue
              </span>
              <span className="w-3.5" />
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent/95" />
                Enrollments
              </span>
            </div>

            {weekData.length > 0 ? (
              <BarChart
                data={weekData}
                primaryColor="bg-primary/80"
                secondaryColor="bg-accent/70"
                showLegend={false}
                height={160}
              />
            ) : data.revenueTrends.length > 0 ? (
              <BarChart
                data={data.revenueTrends}
                primaryColor="bg-primary/80"
                showLegend={false}
                height={160}
              />
            ) : (
              <div className="flex items-center justify-center h-[160px] text-text-3 text-[13px] font-bold">
                No sales data for this period
              </div>
            )}
          </div>
        </Card>

        {/* Right Column */}
        <div className="flex flex-col gap-3">
          {/* Top Courses Panel */}
          <Card className="p-3.5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-black text-text-1">Top courses</h3>
              <Pill>By revenue</Pill>
            </div>

            <div className="flex flex-col gap-2.5">
              {data.topCourses.length > 0 ? (
                data.topCourses.slice(0, 5).map((course) => (
                  <Link
                    key={course.id}
                    href={`/manage-courses/${course.id}/analytics`}
                    className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-[38px] h-[38px] rounded-[14px] border border-border/95 bg-gradient-to-br from-primary/28 to-accent/18 flex-shrink-0 flex items-center justify-center text-[11px] font-black text-primary/60">
                        {course.rating ? course.rating.toFixed(1) : "—"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-black text-text-1 truncate max-w-[360px]">
                          {course.title}
                        </div>
                        <div className="text-[12px] font-extrabold text-text-3 mt-1">
                          {course.enrollments.toLocaleString()} learners
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      <span className="text-[13px] font-black text-text-1">
                        {formatPrice(course.revenue)}
                      </span>
                    </div>
                  </Link>
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
          <Card className="p-3.5 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-black text-text-1">
                Learner progress snapshot
              </h3>
              <Pill>30d</Pill>
            </div>

            <div className="rounded-[18px] border border-border/95 bg-gradient-to-b from-white/95 to-white/88 p-3">
              <ProgressDistribution data={data.progressBuckets} height={110} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
