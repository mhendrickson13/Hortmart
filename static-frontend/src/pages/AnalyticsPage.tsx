import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { analytics as analyticsApi } from "@/lib/api-client";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  Download, Calendar, DollarSign, ShoppingCart, RotateCcw, TrendingUp,
  Users, BarChart3, ChevronRight, BookOpen, ChevronDown,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";

type TabKey = "sales" | "progress" | "users";

type RangeKey = "7d" | "14d" | "30d" | "custom";

interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
}

function getDateRange(key: RangeKey): DateRange {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = fmt(now);

  switch (key) {
    case "7d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { from: fmt(from), to: today, label: "analytics.last7Days" };
    }
    case "14d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 14);
      return { from: fmt(from), to: today, label: "analytics.last14Days" };
    }
    case "30d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: fmt(from), to: today, label: "analytics.last30Days" };
    }
    default:
      return { from: today, to: today, label: "analytics.custom" };
  }
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "analytics.last7Days" },
  { key: "14d", label: "analytics.last14Days" },
  { key: "30d", label: "analytics.last30Days" },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("sales");
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { t, i18n } = useTranslation();

  const range = useMemo(() => {
    if (rangeKey === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo, label: `${customFrom} — ${customTo}` };
    }
    return getDateRange(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const displayRangeLabel = rangeKey === "custom" ? range.label : t(range.label);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics-overview", range.from, range.to],
    queryFn: () => analyticsApi.getDashboard({ from: range.from, to: range.to }),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-2">
          <BarChart3 className="w-7 h-7 text-danger" />
        </div>
        <p className="text-text-1 text-body font-bold">{t("analytics.failedToLoad")}</p>
        <button onClick={() => refetch()} className="h-10 px-6 rounded-2xl bg-primary text-white font-bold text-body-sm shadow-primary hover:shadow-primary-hover transition-all">{t("common.tryAgain")}</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const stats = data?.analytics;
  const overview = stats?.overview;
  const topCourses = stats?.topCourses || [];
  const topLearners = (stats as any)?.topLearners || [];
  const progressBuckets = stats?.progressBuckets || {};
  const revenueTrend = stats?.trends?.revenue || [];
  const enrollmentTrend = stats?.trends?.enrollments || [];
  const userDistribution = stats?.userDistribution || {};
  const categoryDistribution = stats?.categoryDistribution || [];

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

  // Build daily chart data
  const chartDays: { label: string; revenue: number; enrollments: number }[] = [];
  if (revenueTrend.length > 0 || enrollmentTrend.length > 0) {
    const allDates = new Set([
      ...revenueTrend.map((r: any) => r.date),
      ...enrollmentTrend.map((e: any) => e.date),
    ]);
    const sorted = [...allDates].sort().slice(-14);
    const revMap = new Map(revenueTrend.map((r: any) => [r.date, r.amount]));
    const enrMap = new Map(enrollmentTrend.map((e: any) => [e.date, e.count]));
    for (const d of sorted) {
      chartDays.push({
        label: new Date(d + "T00:00:00").toLocaleDateString(i18n.language, { month: "short", day: "numeric" }),
        revenue: revMap.get(d) || 0,
        enrollments: enrMap.get(d) || 0,
      });
    }
  }

  // Summary totals
  const totalRevenueThisPeriod = revenueTrend.reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const totalEnrollmentsThisPeriod = enrollmentTrend.reduce((s: number, e: any) => s + (e.count || 0), 0);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "sales", label: t("analytics.salesAndRevenue") },
    { key: "progress", label: t("analytics.learnerProgress") },
    { key: "users", label: t("analytics.coursesAndUsers") },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text-1">{t("analytics.title")}</h1>
          <p className="text-body-sm text-text-3 mt-1">{displayRangeLabel} — {t("analytics.allCoursesLabel")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowRangeMenu(!showRangeMenu)}
              className="h-9 px-3.5 rounded-xl border border-border bg-white dark:bg-card text-text-1 font-semibold text-body-sm inline-flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-text-3" />
              {displayRangeLabel}
              <ChevronDown className="w-3.5 h-3.5 text-text-3" />
            </button>
            {showRangeMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRangeMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white dark:bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  <div className="py-1">
                    {RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { setRangeKey(opt.key); setShowRangeMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-body-sm transition-colors ${rangeKey === opt.key ? "bg-primary/10 text-primary font-semibold" : "text-text-2 hover:bg-muted/50"}`}
                      >
                        {t(opt.label)}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-caption font-semibold text-text-3 mb-2">{t("analytics.customRange")}</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-text-3 mb-0.5 block">{t("analytics.from")}</label>
                        <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-surface-2 text-body-sm text-text-1" />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-3 mb-0.5 block">{t("analytics.to")}</label>
                        <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-surface-2 text-body-sm text-text-1" />
                      </div>
                    </div>
                    <button
                      onClick={() => { if (customFrom && customTo) { setRangeKey("custom"); setShowRangeMenu(false); } }}
                      disabled={!customFrom || !customTo}
                      className="mt-3 w-full h-9 rounded-lg bg-primary text-white text-body-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    >{t("analytics.apply")}</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={() => toast({ title: t("analytics.exportStarted"), description: t("analytics.exportDescription"), variant: "success" })}
            className="h-9 px-3.5 rounded-xl border border-border bg-white dark:bg-card text-text-1 font-semibold text-body-sm inline-flex items-center gap-2 hover:bg-muted/50 transition-colors">
            <Download className="w-4 h-4 text-text-3" /> {t("analytics.export")}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title={t("analytics.totalRevenue")} value={formatCurrency(overview?.totalRevenue ?? 0)} change={revenueChange} changeLabel={t("analytics.vsLastPeriod")} icon={DollarSign} color="blue" />
        <StatCard title={t("analytics.enrollments")} value={formatNumber(overview?.totalEnrollments ?? 0)} change={enrollmentChange} changeLabel={t("analytics.vsLastPeriod")} icon={ShoppingCart} color="green" />
        <StatCard title={t("analytics.completionRate")} value={`${overview?.completionRate ?? 0}%`} changeLabel={t("analytics.avgAcrossCourses")} icon={TrendingUp} color="amber" />
        <StatCard title={t("analytics.activeLearners")} value={formatNumber(overview?.activeUsers ?? 0)} changeLabel={t("analytics.totalUsersCount", { num: formatNumber(overview?.totalUsers ?? 0) })} icon={Users} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`h-9 px-4 rounded-lg text-body-sm font-semibold transition-all ${activeTab === tab.key ? "bg-white dark:bg-card shadow-sm text-text-1" : "text-text-3 hover:text-text-2"}`}
          >{tab.label}</button>
        ))}
      </div>

      {/* ── SALES TAB ── */}
      {activeTab === "sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-body font-bold text-text-1">{t("analytics.revenueAndEnrollments")}</h3>
                  <p className="text-caption text-text-3 mt-0.5">{t("analytics.last14Days")}</p>
                </div>
                <div className="flex items-center gap-4 text-caption text-text-3">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" />{t("analytics.revenue")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" />{t("analytics.enrollments")}</span>
                </div>
              </div>
              <ChartBars data={chartDays} />
            </Card>

            {/* Period Summary */}
            <Card className="p-5">
              <h3 className="text-body font-bold text-text-1 mb-4">{t("analytics.periodSummary")}</h3>
              <div className="space-y-5">
                <SummaryItem label={t("analytics.totalRevenue")} value={formatCurrency(totalRevenueThisPeriod)} change={revenueChange} />
                <SummaryItem label={t("analytics.totalEnrollments")} value={String(totalEnrollmentsThisPeriod)} change={enrollmentChange} />
                <SummaryItem label={t("analytics.avgRevenuePerEnrollment")} value={formatCurrency(totalEnrollmentsThisPeriod > 0 ? totalRevenueThisPeriod / totalEnrollmentsThisPeriod : 0)} />
                <SummaryItem label={t("analytics.activeLearners")} value={String(overview?.activeUsers ?? 0)} />
              </div>
            </Card>
          </div>

          {/* Top Courses by revenue (horizontal bars) */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body font-bold text-text-1">{t("analytics.topCoursesByRevenue")}</h3>
              <Link to="/manage-courses" className="text-caption text-primary font-semibold hover:underline inline-flex items-center gap-1">
                {t("analytics.allCoursesLabel")} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {topCourses.length > 0 ? (
              <div className="space-y-3">
                {topCourses.slice(0, 5).map((course: any) => {
                  const maxRev = Math.max(...topCourses.slice(0, 5).map((c: any) => c.revenue || 0), 1);
                  return (
                    <div key={course.id} className="flex items-center gap-4">
                      <div className="w-40 lg:w-56 text-body-sm text-text-2 truncate flex-shrink-0">{course.title}</div>
                      <div className="flex-1 h-8 bg-muted/40 rounded-lg overflow-hidden">
                        <div className="h-full bg-primary rounded-lg flex items-center px-3 transition-all" style={{ width: `${Math.max((course.revenue / maxRev) * 100, 5)}%` }}>
                          <span className="text-[11px] font-bold text-white whitespace-nowrap">{formatCurrency(course.revenue)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={BookOpen} message={t("analytics.noCourseData")} />
            )}
          </Card>
        </div>
      )}

      {/* ── PROGRESS TAB ── */}
      {activeTab === "progress" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Progress Distribution */}
            <Card className="p-5">
              <h3 className="text-body font-bold text-text-1 mb-4">{t("analytics.progressDistribution")}</h3>
              <ProgressDonut data={progressBuckets} />
              <div className="mt-4 space-y-2">
                {progressEntries(progressBuckets).map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />
                    <span className="text-caption text-text-2 flex-1">{label === "Completed" ? t("analytics.completed") : label}</span>
                    <span className="text-caption font-bold text-text-1">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Learners */}
            <Card className="p-5">
              <h3 className="text-body font-bold text-text-1 mb-4">{t("analytics.topLearners")}</h3>
              {topLearners.length > 0 ? (
                <div className="space-y-2">
                  {topLearners.map((l: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-caption font-bold text-primary flex-shrink-0">
                        {(l.name || l.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body-sm font-semibold text-text-1 truncate">{l.name || l.email}</div>
                        <div className="text-caption text-text-3 truncate">{l.course}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-border/50 overflow-hidden">
                          <div className={`h-full rounded-full ${l.progress >= 100 ? "bg-success" : l.progress >= 50 ? "bg-primary" : "bg-warning"}`}
                            style={{ width: `${Math.min(l.progress, 100)}%` }} />
                        </div>
                        <span className="text-caption font-bold text-text-1 w-10 text-right">{l.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Users} message={t("analytics.noLearnerData")} />
              )}
            </Card>
          </div>

          {/* Completion Funnel */}
          <Card className="p-5">
            <h3 className="text-body font-bold text-text-1 mb-5">{t("analytics.completionFunnel")}</h3>
            <div className="space-y-3">
              <FunnelStep label={t("analytics.enrolled")} value={overview?.totalEnrollments ?? 0} percent={100} color="bg-primary" />
              <FunnelStep label={t("analytics.started")} value={overview?.activeUsers ?? 0} percent={overview?.totalEnrollments ? Math.round(((overview?.activeUsers ?? 0) / overview.totalEnrollments) * 100) : 0} color="bg-accent" />
              <FunnelStep label={t("analytics.completed")} value={progressBuckets["completed"] || 0} percent={overview?.totalEnrollments ? Math.round(((progressBuckets["completed"] || 0) / overview.totalEnrollments) * 100) : 0} color="bg-success" />
            </div>
          </Card>
        </div>
      )}

      {/* ── COURSES & USERS TAB ── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Course Performance Table */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-body font-bold text-text-1">{t("analytics.coursePerformance")}</h3>
                <Link to="/manage-courses" className="text-caption text-primary font-semibold hover:underline inline-flex items-center gap-1">
                  {t("analytics.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {topCourses.length > 0 ? (
                <div className="space-y-2">
                  {topCourses.map((course: any) => (
                    <Link key={course.id} to={`/manage-courses/${course.id}/analytics`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary flex-shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body-sm font-semibold text-text-1 truncate group-hover:text-primary transition-colors">{course.title}</div>
                        <div className="text-caption text-text-3 mt-0.5">{t("analytics.enrolledCount", { count: course.enrollments })}{course.rating ? ` · ★ ${Number(course.rating).toFixed(1)}` : ""}</div>
                      </div>
                      <div className="text-body-sm font-bold text-text-1 flex-shrink-0">{formatCurrency(course.revenue)}</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={BookOpen} message={t("analytics.noCourses")} />
              )}
            </Card>

            {/* User & Category Distribution */}
            <div className="space-y-4">
              {/* User Roles */}
              <Card className="p-5">
                <h3 className="text-body font-bold text-text-1 mb-4">{t("analytics.userDistribution")}</h3>
                <div className="space-y-3">
                  {Object.entries(userDistribution).map(([role, count]) => {
                    const total = Object.values(userDistribution).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    const roleColors: Record<string, string> = { LEARNER: "bg-primary", CREATOR: "bg-success", ADMIN: "bg-warning" };
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-body-sm text-text-2 capitalize">{role.toLowerCase()}s</span>
                          <span className="text-body-sm font-bold text-text-1">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${roleColors[role] || "bg-accent"} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Categories */}
              {categoryDistribution.length > 0 && (
                <Card className="p-5">
                  <h3 className="text-body font-bold text-text-1 mb-4">{t("analytics.categories")}</h3>
                  <div className="space-y-3">
                    {categoryDistribution.map((cat: any) => {
                      const maxCat = Math.max(...categoryDistribution.map((c: any) => c.count), 1);
                      return (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="text-body-sm text-text-2 w-32 truncate flex-shrink-0">{cat.category}</span>
                          <div className="flex-1 h-6 bg-muted/40 rounded-lg overflow-hidden">
                            <div className="h-full bg-accent rounded-lg flex items-center px-2 transition-all" style={{ width: `${Math.max((cat.count / maxCat) * 100, 10)}%` }}>
                              <span className="text-[10px] font-bold text-white">{cat.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function ChartBars({ data }: { data: { label: string; revenue: number; enrollments: number }[] }) {
  const { t } = useTranslation();
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-text-3">
        <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
        <p className="text-body-sm">{t("analytics.noDataForPeriod")}</p>
      </div>
    );
  }
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const maxEnr = Math.max(...data.map((d) => d.enrollments), 1);

  return (
    <div className="flex items-end gap-1.5 h-[220px]">
      {data.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="flex items-end gap-0.5 flex-1 w-full justify-center">
            <div className="w-[45%] bg-primary rounded-t-lg transition-all group-hover:opacity-80" style={{ height: `${Math.max((day.revenue / maxRev) * 180, 4)}px` }} />
            <div className="w-[45%] bg-success rounded-t-lg transition-all group-hover:opacity-80" style={{ height: `${Math.max((day.enrollments / maxEnr) * 180, 4)}px` }} />
          </div>
          <span className="text-[9px] font-medium text-text-3 truncate max-w-full">{day.label}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryItem({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-body-sm text-text-3">{label}</span>
      <div className="text-right">
        <span className="text-body font-bold text-text-1">{value}</span>
        {change !== undefined && change !== 0 && (
          <div className={`text-caption font-semibold mt-0.5 ${change > 0 ? "text-success" : "text-danger"}`}>
            {change > 0 ? "↑" : "↓"} {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressDonut({ data }: { data: Record<string, number> }) {
  const { t } = useTranslation();
  const entries = progressEntries(data);
  const total = entries.reduce((s, e) => s + e.count, 0);
  const divisor = total || 1; // avoid division by zero but display real total
  const segments = entries.map((e) => ({ percent: (e.count / divisor) * 100, color: e.strokeColor }));
  let cumulative = 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex justify-center">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          {total === 0 ? (
            <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="14"
              stroke="currentColor" className="text-border/30" />
          ) : segments.map((seg, i) => {
            const dashArray = `${(seg.percent / 100) * circumference} ${circumference}`;
            const dashOffset = -((cumulative / 100) * circumference);
            cumulative += seg.percent;
            return (
              <circle key={i} cx="70" cy="70" r={radius} fill="none" strokeWidth="14"
                stroke={seg.color} strokeDasharray={dashArray} strokeDashoffset={dashOffset}
                strokeLinecap="round" className="transition-all duration-500" />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-h2 font-bold text-text-1">{total}</span>
          <span className="text-caption text-text-3">{t("analytics.learners")}</span>
        </div>
      </div>
    </div>
  );
}

function progressEntries(data: Record<string, number>) {
  return [
    { key: "completed", label: "Completed", count: data["completed"] || 0, color: "bg-success", strokeColor: "#22c55e" },
    { key: "75-100", label: "75–100%", count: data["75-100"] || 0, color: "bg-primary", strokeColor: "#4A7BF7" },
    { key: "50-75", label: "50–75%", count: data["50-75"] || 0, color: "bg-accent", strokeColor: "#38bdf8" },
    { key: "25-50", label: "25–50%", count: data["25-50"] || 0, color: "bg-warning", strokeColor: "#F5A623" },
    { key: "0-25", label: "0–25%", count: data["0-25"] || 0, color: "bg-red-400", strokeColor: "#f87171" },
  ];
}

function FunnelStep({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-body-sm font-semibold text-text-1">{label}</div>
      <div className="flex-1 h-9 bg-muted/40 rounded-lg overflow-hidden">
        <div className={`h-full ${color} rounded-lg transition-all flex items-center px-3`} style={{ width: `${Math.max(percent, 4)}%` }}>
          <span className="text-[11px] font-bold text-white whitespace-nowrap">{value}</span>
        </div>
      </div>
      <div className="w-14 text-right text-body-sm font-bold text-text-1">{percent}%</div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-text-3" />
      </div>
      <p className="text-body-sm text-text-3">{message}</p>
    </div>
  );
}
