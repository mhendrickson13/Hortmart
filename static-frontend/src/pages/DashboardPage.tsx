import { useQuery } from "@tanstack/react-query";
import { analytics as analyticsApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useAppPreferences } from "@/lib/theme-context";
import { DashboardHeader } from "@/components/admin/dashboard-header";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useAppPreferences();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => analyticsApi.getDashboard(),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
        <p className="text-text-2 text-body font-bold">Failed to load dashboard</p>
        <p className="text-text-3 text-body-sm">{(error as any)?.message || "Something went wrong"}</p>
        <button onClick={() => refetch()} className="h-10 px-4 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px]">Try again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </>
    );
  }

  const stats = data?.analytics;
  const overview = stats?.overview;
  const topCourses = stats?.topCourses || [];
  const progressBuckets = stats?.progressBuckets || {};
  const revenueTrend = stats?.trends?.revenue || [];
  const enrollmentTrend = stats?.trends?.enrollments || [];

  // Build week-grouped chart data
  const weekData: { label: string; revenue: number; enrollments: number }[] = [];
  if (revenueTrend.length > 0) {
    const weekSize = Math.ceil(revenueTrend.length / 4);
    for (let w = 0; w < 4; w++) {
      const rSlice = revenueTrend.slice(w * weekSize, (w + 1) * weekSize);
      const eSlice = enrollmentTrend.slice(w * weekSize, (w + 1) * weekSize);
      weekData.push({
        label: `W${w + 1}`,
        revenue: rSlice.reduce((s: number, r: any) => s + (r.amount || 0), 0),
        enrollments: eSlice.reduce((s: number, e: any) => s + (e.count || 0), 0),
      });
    }
  }

  // Change percentages
  let revenueChange = 0;
  if (revenueTrend.length >= 2) {
    const half = Math.floor(revenueTrend.length / 2);
    const recent = revenueTrend.slice(half).reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const prev = revenueTrend.slice(0, half).reduce((s: number, r: any) => s + (r.amount || 0), 0);
    if (prev > 0) revenueChange = Math.round(((recent - prev) / prev) * 100);
  }
  let enrollmentChange = 0;
  if (enrollmentTrend.length >= 2) {
    const half = Math.floor(enrollmentTrend.length / 2);
    const recent = enrollmentTrend.slice(half).reduce((s: number, e: any) => s + (e.count || 0), 0);
    const prev = enrollmentTrend.slice(0, half).reduce((s: number, e: any) => s + (e.count || 0), 0);
    if (prev > 0) enrollmentChange = Math.round(((recent - prev) / prev) * 100);
  }

  const currentDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      {/* Header */}
      <DashboardHeader userName={user?.name?.split(" ")[0] || "Creator"} currentDate={currentDate} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard title={t("dashboard.revenue")} value={formatCurrency(overview?.totalRevenue ?? 0)} change={revenueChange} changeLabel={t("dashboard.vsLast30Days")} />
        <StatCard title={t("dashboard.enrollments")} value={formatNumber(overview?.totalEnrollments ?? 0)} change={enrollmentChange} changeLabel={`${overview?.totalCourses ?? 0} courses`} />
        <StatCard title={t("dashboard.activeLearners")} value={formatNumber(overview?.activeUsers ?? 0)} changeLabel={`${overview?.totalUsers ?? 0} total users`} />
        <StatCard title={t("dashboard.completionRate")} value={`${overview?.completionRate ?? 0}%`} changeLabel={t("dashboard.avgAcrossCourses")} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3 flex-1 min-h-0">
        {/* Sales Chart Panel */}
        <Card className="p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black text-text-1">{t("dashboard.salesChart")}</h3>
            <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">All courses</span>
          </div>
          <div className="flex-1 rounded-[18px] border border-border/95 bg-gradient-to-b from-white/95 to-white/88 p-3">
            <div className="flex items-center gap-2.5 text-[12px] font-black text-text-3 mb-2">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_10px_18px_rgba(47,111,237,0.18)]" />Revenue</span>
              <span className="w-3.5" />
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-accent/95" />Enrollments</span>
            </div>
            {weekData.length > 0 ? (
              <div className="flex items-end gap-3 h-[160px]">
                {weekData.map((w, i) => {
                  const maxRev = Math.max(...weekData.map((d) => d.revenue), 1);
                  const maxEnr = Math.max(...weekData.map((d) => d.enrollments), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-1 flex-1 w-full justify-center">
                        <div className="w-5 bg-primary/80 rounded-t-md transition-all" style={{ height: `${(w.revenue / maxRev) * 130}px` }} />
                        <div className="w-5 bg-accent/70 rounded-t-md transition-all" style={{ height: `${(w.enrollments / maxEnr) * 130}px` }} />
                      </div>
                      <span className="text-[11px] font-black text-text-3">{w.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-text-3 text-[13px] font-bold">No sales data for this period</div>
            )}
          </div>
        </Card>

        {/* Right Column */}
        <div className="flex flex-col gap-3">
          {/* Top Courses */}
          <Card className="p-3.5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-black text-text-1">{t("dashboard.topCourses")}</h3>
              <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">{t("dashboard.byRevenue")}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {topCourses.length > 0 ? topCourses.slice(0, 5).map((course: any) => (
                <Link key={course.id} to={`/manage-courses/${course.id}/analytics`} className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-[38px] h-[38px] rounded-[14px] border border-border/95 bg-gradient-to-br from-primary/28 to-accent/18 flex-shrink-0 flex items-center justify-center text-[11px] font-black text-primary/60">
                      {course.rating ? Number(course.rating).toFixed(1) : "--"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-black text-text-1 truncate max-w-[260px]">{course.title}</div>
                      <div className="text-[12px] font-extrabold text-text-3 mt-1">{course.enrollments?.toLocaleString()} learners</div>
                    </div>
                  </div>
                  <span className="text-[13px] font-black text-text-1">{formatCurrency(course.revenue)}</span>
                </Link>
              )) : (
                <div className="text-center py-6">
                  <p className="text-body-sm text-text-2">No courses yet. <Link to="/manage-courses/new" className="text-primary font-semibold">Create your first course</Link></p>
                </div>
              )}
            </div>
          </Card>

          {/* Progress Distribution */}
          <Card className="p-3.5 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-black text-text-1">{t("dashboard.learnerProgress")}</h3>
              <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">30d</span>
            </div>
            <div className="rounded-[18px] border border-border/95 bg-gradient-to-b from-white/95 to-white/88 p-3">
              <ProgressBars data={progressBuckets} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ProgressBars({ data }: { data: Record<string, number> }) {
  const buckets = [
    { key: "0-25", label: "0-25%", color: "bg-red-400" },
    { key: "25-50", label: "25-50%", color: "bg-warning" },
    { key: "50-75", label: "50-75%", color: "bg-accent" },
    { key: "75-100", label: "75-100%", color: "bg-primary" },
    { key: "completed", label: "Done", color: "bg-success" },
  ];
  const max = Math.max(...buckets.map((b) => data[b.key] || 0), 1);
  return (
    <div className="flex items-end gap-2 h-[110px]">
      {buckets.map((b) => {
        const val = data[b.key] || 0;
        return (
          <div key={b.key} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[11px] font-black text-text-3">{val}</span>
            <div className={`w-full ${b.color} rounded-t-md transition-all`} style={{ height: `${Math.max((val / max) * 80, 4)}px` }} />
            <span className="text-[10px] font-bold text-text-3">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
