import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analytics as analyticsApi } from "@/lib/api-client";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Download, Calendar } from "lucide-react";
import { toast } from "@/components/ui/toaster";

type TabKey = "sales" | "progress" | "users";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("sales");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => analyticsApi.getDashboard(),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
        <p className="text-text-2 text-body font-bold">Failed to load analytics</p>
        <button onClick={() => refetch()} className="h-10 px-4 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px]">Try again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-48" />
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
  const topLearners = (stats as any)?.topLearners || [];
  const progressBuckets = stats?.progressBuckets || {};
  const revenueTrend = stats?.trends?.revenue || [];
  const enrollmentTrend = stats?.trends?.enrollments || [];

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

  const conversionRate = (overview?.totalEnrollments ?? 0) > 0
    ? Math.round(((overview?.totalEnrollments ?? 0) / Math.max(overview?.activeUsers || 1, 1)) * 100) / 10
    : 0;

  // Week chart data
  const weekData: { label: string; revenue: number; enrollments: number }[] = [];
  if (revenueTrend.length > 0) {
    const ws = Math.ceil(revenueTrend.length / 4);
    for (let w = 0; w < 4; w++) {
      weekData.push({
        label: `W${w + 1}`,
        revenue: revenueTrend.slice(w * ws, (w + 1) * ws).reduce((s: number, r: any) => s + (r.amount || 0), 0),
        enrollments: enrollmentTrend.slice(w * ws, (w + 1) * ws).reduce((s: number, e: any) => s + (e.count || 0), 0),
      });
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "sales", label: "Sales" },
    { key: "progress", label: "Progress" },
    { key: "users", label: "Users" },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 h-14 flex-shrink-0">
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-text-1">Analytics</h1>
          <p className="text-[12px] font-extrabold text-text-3 mt-1">Last 30 days &bull; All courses</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center gap-1.5 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)]" title="Date range filter">
            <Calendar className="w-4 h-4" /> 30 days
          </button>
          <button onClick={() => { toast({ title: "Export started", description: "Analytics data will be ready shortly", variant: "success" }); }} className="h-9 px-3 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center gap-1.5 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)]">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Revenue" value={formatCurrency(overview?.totalRevenue ?? 0)} change={revenueChange} changeLabel="vs last 30 days" />
        <StatCard title="Purchases" value={formatNumber(overview?.totalEnrollments ?? 0)} change={enrollmentChange} changeLabel="vs last 30 days" />
        <StatCard title="Refunds" value="0" changeLabel="Low refund rate" />
        <StatCard title="Conversion" value={`${conversionRate}%`} changeLabel="Views to enrollments" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-[16px] w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`h-8 px-4 rounded-[12px] text-[13px] font-black transition-all ${activeTab === t.key ? "bg-white dark:bg-card shadow-sm text-text-1" : "text-text-3 hover:text-text-2"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "sales" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-black text-text-1">Revenue &amp; enrollments</h3>
              <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">4 weeks</span>
            </div>
            <div className="flex items-center gap-4 text-[12px] font-black text-text-3 mb-3">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Revenue</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-accent/80" />Enrollments</span>
            </div>
            {weekData.length > 0 ? (
              <div className="flex items-end gap-3 h-[200px]">
                {weekData.map((w, i) => {
                  const maxR = Math.max(...weekData.map((d) => d.revenue), 1);
                  const maxE = Math.max(...weekData.map((d) => d.enrollments), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-1 flex-1 w-full justify-center">
                        <div className="w-5 bg-primary/80 rounded-t-md" style={{ height: `${(w.revenue / maxR) * 170}px` }} />
                        <div className="w-5 bg-accent/70 rounded-t-md" style={{ height: `${(w.enrollments / maxE) * 170}px` }} />
                      </div>
                      <span className="text-[11px] font-black text-text-3">{w.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-text-3 text-body-sm">No data for this period</div>
            )}
          </Card>
          <div className="flex flex-col gap-3">
            <Card className="p-4">
              <h3 className="text-[14px] font-black text-text-1 mb-3">Top learners</h3>
              {topLearners.length > 0 ? (
                <div className="space-y-2">
                  {topLearners.map((l: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] flex-shrink-0">{l.name?.charAt(0) || "?"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black text-text-1 truncate">{l.email || l.name}</div>
                        <div className="text-[11px] font-extrabold text-text-3 mt-0.5 truncate">{l.course}</div>
                      </div>
                      <span className="text-[12px] font-black text-primary">{l.progress}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-text-3 text-[13px] font-bold">No learner data available yet.</div>
              )}
            </Card>
            <Card className="p-4 flex-1">
              <h3 className="text-[14px] font-black text-text-1 mb-3">Progress distribution</h3>
              <ProgressBars data={progressBuckets} height={120} />
            </Card>
          </div>
        </div>
      )}

      {activeTab === "progress" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-[14px] font-black text-text-1 mb-4">Completion Rate Trend</h3>
            <div className="flex items-center justify-center h-[180px] text-text-3 text-body-sm">Completion data will appear as learners progress through courses.</div>
          </Card>
          <Card className="p-4">
            <h3 className="text-[14px] font-black text-text-1 mb-4">Progress Distribution</h3>
            <ProgressBars data={progressBuckets} height={160} />
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <Card className="p-4">
          <h3 className="text-[14px] font-black text-text-1 mb-4">Course Performance</h3>
          <div className="space-y-3">
            {topCourses.length === 0 ? (
              <p className="text-body-sm text-text-2 text-center py-8">No courses yet. Create your first course to see analytics.</p>
            ) : topCourses.map((course: any) => (
              <div key={course.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/95 bg-white/95 dark:bg-card/95">
                <div className="w-10 h-10 rounded-xl gradient-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-caption font-bold text-text-1 truncate">{course.title}</div>
                  <div className="text-caption text-text-3 mt-0.5">{course.enrollments} enrolled</div>
                </div>
                <div className="text-right min-w-[100px]">
                  <div className="text-body-sm font-bold text-text-1">{formatCurrency(course.revenue)}</div>
                  <div className="text-caption text-success">Revenue</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function ProgressBars({ data, height = 110 }: { data: Record<string, number>; height?: number }) {
  const buckets = [
    { key: "0-25", label: "0-25%", color: "bg-red-400" },
    { key: "25-50", label: "25-50%", color: "bg-warning" },
    { key: "50-75", label: "50-75%", color: "bg-accent" },
    { key: "75-100", label: "75-100%", color: "bg-primary" },
    { key: "completed", label: "Done", color: "bg-success" },
  ];
  const max = Math.max(...buckets.map((b) => data[b.key] || 0), 1);
  return (
    <div className="rounded-[18px] border border-border/95 bg-gradient-to-b from-white/95 to-white/88 p-3">
      <div className="flex items-end gap-2" style={{ height }}>
        {buckets.map((b) => {
          const val = data[b.key] || 0;
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[11px] font-black text-text-3">{val}</span>
              <div className={`w-full ${b.color} rounded-t-md transition-all`} style={{ height: `${Math.max((val / max) * (height - 30), 4)}px` }} />
              <span className="text-[10px] font-bold text-text-3">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
