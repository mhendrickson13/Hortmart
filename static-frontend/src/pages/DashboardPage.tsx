import { useQuery } from "@tanstack/react-query";
import { analytics as analyticsApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useAppPreferences } from "@/lib/theme-context";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  DollarSign, Users, GraduationCap, TrendingUp,
  BookOpen, BarChart3, Clock, ChevronRight, Plus, Search,
  Calendar, ChevronDown,
} from "lucide-react";

type RangeKey = "7d" | "14d" | "30d" | "custom";

function getRange(key: RangeKey, customFrom?: string, customTo?: string) {
  if (key === "custom" && customFrom && customTo) return { from: customFrom, to: customTo, label: `${customFrom} — ${customTo}` };
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const today = fmt(now);
  const sub = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return fmt(d); };
  switch (key) {
    case "7d": return { from: sub(7), to: today, label: "Last 7 days" };
    case "14d": return { from: sub(14), to: today, label: "Last 14 days" };
    case "30d": return { from: sub(30), to: today, label: "Last 30 days" };
    default: return { from: sub(30), to: today, label: "Last 30 days" };
  }
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "14d", label: "Last 14 days" },
  { key: "30d", label: "Last 30 days" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useAppPreferences();
  const [searchQuery, setSearchQuery] = useState("");
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => getRange(rangeKey, customFrom, customTo), [rangeKey, customFrom, customTo]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-stats", range.from, range.to],
    queryFn: () => analyticsApi.getDashboard({ from: range.from, to: range.to }),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-2">
          <BarChart3 className="w-7 h-7 text-danger" />
        </div>
        <p className="text-text-1 text-body font-bold">Failed to load dashboard</p>
        <p className="text-text-3 text-body-sm">{(error as any)?.message || "Something went wrong"}</p>
        <button onClick={() => refetch()} className="h-10 px-6 rounded-2xl bg-primary text-white font-bold text-body-sm shadow-primary hover:shadow-primary-hover transition-all">Try again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const stats = data?.analytics;
  const overview = stats?.overview;
  const topCourses = stats?.topCourses || [];
  const progressBuckets = stats?.progressBuckets || {};
  const revenueTrend = stats?.trends?.revenue || [];
  const enrollmentTrend = stats?.trends?.enrollments || [];
  const topLearners = (stats as any)?.topLearners || [];

  // Build daily chart data (last 14 days)
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
        label: new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" }),
        revenue: revMap.get(d) || 0,
        enrollments: enrMap.get(d) || 0,
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

  const totalRevenue = overview?.totalRevenue ?? 0;
  const totalEnrollments = overview?.totalEnrollments ?? 0;
  const activeUsers = overview?.activeUsers ?? 0;
  const completionRate = overview?.completionRate ?? 0;
  const greeting = getGreeting();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text-1">
            {greeting}, {user?.name?.split(" ")[0] || "Creator"}
          </h1>
          <p className="text-body-sm text-text-3 mt-1">
            Here's what's happening with your platform today
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowRangeMenu(!showRangeMenu)}
              className="h-10 px-3.5 rounded-xl border border-border bg-white dark:bg-card text-text-1 font-semibold text-body-sm inline-flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-text-3" />
              <span className="hidden sm:inline">{range.label}</span>
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
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-caption font-semibold text-text-3 mb-2">Custom range</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-text-3 mb-0.5 block">From</label>
                        <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-surface-2 text-body-sm text-text-1" />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-3 mb-0.5 block">To</label>
                        <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-surface-2 text-body-sm text-text-1" />
                      </div>
                    </div>
                    <button
                      onClick={() => { if (customFrom && customTo) { setRangeKey("custom"); setShowRangeMenu(false); } }}
                      disabled={!customFrom || !customTo}
                      className="mt-3 w-full h-9 rounded-lg bg-primary text-white text-body-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    >Apply</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-white dark:bg-card text-body-sm">
            <Search className="w-4 h-4 text-text-3" />
            <input
              type="text" placeholder="Search courses…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) window.location.href = `/manage-courses?search=${encodeURIComponent(searchQuery)}`; }}
              className="bg-transparent outline-none w-48 placeholder:text-text-3 text-text-1"
            />
          </div>
          <Link to="/manage-courses/new" className="h-10 px-4 rounded-xl bg-primary text-white font-semibold text-body-sm inline-flex items-center gap-2 shadow-primary hover:shadow-primary-hover transition-all">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Course</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title={t("dashboard.revenue")} value={formatCurrency(totalRevenue)} change={revenueChange} changeLabel={t("dashboard.vsLast30Days")} icon={DollarSign} color="blue" />
        <StatCard title={t("dashboard.enrollments")} value={formatNumber(totalEnrollments)} change={enrollmentChange} changeLabel={`${overview?.totalCourses ?? 0} courses`} icon={GraduationCap} color="green" />
        <StatCard title={t("dashboard.activeLearners")} value={formatNumber(activeUsers)} changeLabel={`${formatNumber(overview?.totalUsers ?? 0)} total users`} icon={Users} color="amber" />
        <StatCard title={t("dashboard.completionRate")} value={`${completionRate}%`} changeLabel={t("dashboard.avgAcrossCourses")} icon={TrendingUp} color="red" />
      </div>

      {/* Chart + Progress Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-body font-bold text-text-1">Revenue & Enrollments</h3>
              <p className="text-caption text-text-3 mt-0.5">Last 14 days</p>
            </div>
            <div className="flex items-center gap-4 text-caption text-text-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" />Enrollments</span>
            </div>
          </div>
          {chartDays.length > 0 ? (
            <div className="flex items-end gap-1.5 h-[220px]">
              {chartDays.map((day, i) => {
                const maxRev = Math.max(...chartDays.map((d) => d.revenue), 1);
                const maxEnr = Math.max(...chartDays.map((d) => d.enrollments), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="flex items-end gap-0.5 flex-1 w-full justify-center">
                      <div className="w-[45%] bg-primary rounded-t-lg transition-all group-hover:opacity-80" style={{ height: `${Math.max((day.revenue / maxRev) * 180, 4)}px` }} />
                      <div className="w-[45%] bg-success rounded-t-lg transition-all group-hover:opacity-80" style={{ height: `${Math.max((day.enrollments / maxEnr) * 180, 4)}px` }} />
                    </div>
                    <span className="text-[9px] font-medium text-text-3 truncate max-w-full">{day.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-text-3">
              <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-body-sm">No data for this period</p>
            </div>
          )}
        </Card>

        {/* Progress Donut */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body font-bold text-text-1">Learner Progress</h3>
            <span className="text-caption text-text-3 bg-muted px-2.5 py-1 rounded-full">30d</span>
          </div>
          <ProgressDonut data={progressBuckets} />
          <div className="mt-4 space-y-2">
            {progressEntries(progressBuckets).map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />
                <span className="text-caption text-text-2 flex-1">{label}</span>
                <span className="text-caption font-bold text-text-1">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Courses + Learners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Courses */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body font-bold text-text-1">Top Courses by Revenue</h3>
            <Link to="/manage-courses" className="text-caption text-primary font-semibold hover:underline inline-flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {topCourses.length > 0 ? (
            <div className="space-y-1.5">
              {topCourses.slice(0, 5).map((course: any, idx: number) => {
                const maxRevenue = Math.max(...topCourses.slice(0, 5).map((c: any) => c.revenue || 0), 1);
                return (
                  <Link key={course.id} to={`/manage-courses/${course.id}/analytics`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-caption font-bold text-primary flex-shrink-0">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-body-sm font-semibold text-text-1 truncate group-hover:text-primary transition-colors">{course.title}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-caption text-text-3">{course.enrollments} learners</span>
                        {course.rating && <span className="text-caption text-text-3">★ {Number(course.rating).toFixed(1)}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-body-sm font-bold text-text-1">{formatCurrency(course.revenue)}</div>
                      <div className="w-20 h-1.5 rounded-full bg-border/50 mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(course.revenue / maxRevenue) * 100}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={BookOpen} message="No courses yet" action={<Link to="/manage-courses/new" className="text-primary font-semibold text-caption hover:underline">Create your first course →</Link>} />
          )}
        </Card>

        {/* Recent Learners */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body font-bold text-text-1">Recent Learners</h3>
            <Link to="/users" className="text-caption text-primary font-semibold hover:underline inline-flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {topLearners.length > 0 ? (
            <div className="space-y-1.5">
              {topLearners.slice(0, 6).map((learner: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-caption font-bold text-primary flex-shrink-0">
                    {(learner.name || learner.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm font-semibold text-text-1 truncate">{learner.name || learner.email}</div>
                    <div className="text-caption text-text-3 truncate">{learner.course}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 h-1.5 rounded-full bg-border/50 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${learner.progress >= 100 ? "bg-success" : learner.progress >= 50 ? "bg-primary" : "bg-warning"}`}
                        style={{ width: `${Math.min(learner.progress, 100)}%` }} />
                    </div>
                    <span className="text-caption font-bold text-text-1 w-10 text-right">{learner.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} message="No learner activity yet" />
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-5">
        <h3 className="text-body font-bold text-text-1 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={Plus} label="Create Course" to="/manage-courses/new" color="bg-primary/10 text-primary" />
          <QuickAction icon={Users} label="Manage Users" to="/users" color="bg-success/10 text-success" />
          <QuickAction icon={BarChart3} label="View Analytics" to="/analytics" color="bg-amber-500/10 text-amber-600" />
          <QuickAction icon={Clock} label="Recent Activity" to="/analytics" color="bg-accent/10 text-accent" />
        </div>
      </Card>
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function ProgressDonut({ data }: { data: Record<string, number> }) {
  const entries = progressEntries(data);
  const total = entries.reduce((s, e) => s + e.count, 0) || 1;
  const segments = entries.map((e) => ({ percent: (e.count / total) * 100, color: e.strokeColor }));
  let cumulative = 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex justify-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => {
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
          <span className="text-h3 font-bold text-text-1">{total}</span>
          <span className="text-caption text-text-3">Learners</span>
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

function QuickAction({ icon: Icon, label, to, color }: { icon: React.ComponentType<{ className?: string }>; label: string; to: string; color: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-card transition-all group">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-caption font-semibold text-text-1">{label}</span>
    </Link>
  );
}

function EmptyState({ icon: Icon, message, action }: { icon: React.ComponentType<{ className?: string }>; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-text-3" />
      </div>
      <p className="text-body-sm text-text-3 mb-2">{message}</p>
      {action}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

