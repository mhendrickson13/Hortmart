import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { courses as coursesApi } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/admin/stat-card";
import {
  ArrowLeft, TrendingUp, Users, BarChart3,
  GraduationCap, Target, DollarSign, BookOpen, Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type TabKey = "overview" | "students" | "funnel";

export default function CourseAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [studentSearch, setStudentSearch] = useState("");
  const { t, i18n } = useTranslation();

  const { data: courseData } = useQuery({
    queryKey: ["course", id],
    queryFn: () => coursesApi.get(id!),
    enabled: !!id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["course-analytics", id],
    queryFn: () => coursesApi.getAnalytics(id!),
    enabled: !!id,
  });

  const analytics = data?.analytics;
  const topStudents = analytics?.topStudents || [];
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return topStudents;
    const q = studentSearch.toLowerCase();
    return topStudents.filter((s: any) =>
      (s.name && s.name.toLowerCase().includes(q)) || (s.email && s.email.toLowerCase().includes(q))
    );
  }, [topStudents, studentSearch]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const overview = analytics?.overview;
  const courseTitle = courseData?.course?.title || t("courseAnalytics.courseFallback");
  const lessonStats = analytics?.lessonStats || [];
  const enrollmentTrend = analytics?.enrollmentTrend || [];

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: t("analytics.overview"), icon: BarChart3 },
    { key: "students", label: t("courseAnalytics.topStudents"), icon: Users },
    { key: "funnel", label: t("analytics.completionFunnel"), icon: TrendingUp },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/manage-courses" className="w-10 h-10 rounded-xl border border-border bg-white dark:bg-card grid place-items-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-1" />
        </Link>
        <div>
          <h1 className="text-h2 font-bold text-text-1">{t("courseAnalytics.title")}</h1>
          <p className="text-body-sm text-text-3 mt-0.5">{courseTitle}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title={t("analytics.enrollments")} value={String(overview?.totalEnrollments ?? 0)} icon={GraduationCap} color="blue" />
        <StatCard title={t("courseAnalytics.avgProgress")} value={`${overview?.averageProgress ?? 0}%`} icon={Target} color="green" />
        <StatCard title={t("courseAnalytics.completion")} value={`${overview?.completionRate ?? 0}%`} icon={TrendingUp} color="amber" />
        <StatCard title={t("analytics.revenue")} value={formatCurrency(overview?.totalRevenue ?? 0)} icon={DollarSign} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`h-9 px-4 rounded-lg text-body-sm font-semibold inline-flex items-center gap-1.5 transition-all ${activeTab === tab.key ? "bg-white dark:bg-card shadow-sm text-text-1" : "text-text-3 hover:text-text-2"}`}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Enrollment Trend */}
          <Card className="lg:col-span-2 p-5">
            <h3 className="text-body font-bold text-text-1 mb-5">{t("courseAnalytics.enrollmentTrend")}</h3>
            {enrollmentTrend.length > 0 ? (
              <div className="flex items-end gap-1.5 h-[200px]">
                {enrollmentTrend.slice(-14).map((d: any, i: number) => {
                  const max = Math.max(...enrollmentTrend.slice(-14).map((x: any) => x.count), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-bold text-text-3 opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                      <div className="w-full bg-primary rounded-t-lg transition-all group-hover:opacity-80" style={{ height: `${Math.max((d.count / max) * 160, 4)}px` }} />
                      <span className="text-[9px] text-text-3 truncate max-w-full">{new Date(d.date).toLocaleDateString(i18n.language, { month: "short", day: "numeric" })}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-text-3">
                <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-body-sm">{t("courseAnalytics.noEnrollmentData")}</p>
              </div>
            )}
          </Card>

          {/* Lesson Performance */}
          <Card className="p-5">
            <h3 className="text-body font-bold text-text-1 mb-4">{t("courseAnalytics.lessonPerformance")}</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {lessonStats.length > 0 ? lessonStats.map((lesson: any) => (
                <div key={lesson.lessonId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-caption font-semibold text-text-1 truncate">{lesson.title}</div>
                  </div>
                  <span className="text-caption font-bold text-text-1 flex-shrink-0">{lesson.completionRate}%</span>
                  <div className="w-16 h-2 rounded-full bg-border/50 overflow-hidden flex-shrink-0">
                    <div className={`h-full rounded-full transition-all ${lesson.completionRate >= 70 ? "bg-success" : lesson.completionRate >= 40 ? "bg-warning" : "bg-red-400"}`} style={{ width: `${lesson.completionRate}%` }} />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-8 text-text-3">
                  <BookOpen className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-body-sm">{t("courseAnalytics.noLessonData")}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── STUDENTS TAB ── */}
      {activeTab === "students" && (
        <Card className="p-5">
          <h3 className="text-body font-bold text-text-1 mb-4">{t("courseAnalytics.topStudents")}</h3>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder={t("courseAnalytics.searchStudents")}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-body-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-2">
            {filteredStudents.length > 0 ? filteredStudents.map((student: any, i: number) => (
              <div key={student.userId || i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-caption font-bold text-primary flex-shrink-0">
                  {student.name?.charAt(0) || "#"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body-sm font-semibold text-text-1 truncate">{student.name || t("courseAnalytics.studentFallback")}</div>
                  {student.email && <div className="text-caption text-text-3 truncate">{student.email}</div>}
                  <div className="text-caption text-text-3 mt-0.5">
                    {student.completedAt ? t("courseAnalytics.completedOn", { date: new Date(student.completedAt).toLocaleDateString() }) : t("courses.inProgress")}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-border/50 overflow-hidden">
                    <div className={`h-full rounded-full ${student.progress >= 100 ? "bg-success" : student.progress >= 50 ? "bg-primary" : "bg-warning"}`}
                      style={{ width: `${Math.min(Math.round(student.progress), 100)}%` }} />
                  </div>
                  <span className="text-caption font-bold text-primary w-10 text-right">{Math.round(student.progress)}%</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-10 text-text-3">
                <Users className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-body-sm">{t("courseAnalytics.noStudentData")}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── FUNNEL TAB ── */}
      {activeTab === "funnel" && (
        <Card className="p-5">
          <h3 className="text-body font-bold text-text-1 mb-5">{t("analytics.completionFunnel")}</h3>
          <div className="space-y-3">
            <FunnelStep label={t("analytics.enrolled")} value={overview?.totalEnrollments ?? 0} percent={100} color="bg-primary" />
            <FunnelStep label={t("analytics.started")} value={overview?.activeStudents ?? 0}
              percent={overview?.totalEnrollments ? Math.round(((overview.activeStudents ?? 0) / overview.totalEnrollments) * 100) : 0} color="bg-accent" />
            <FunnelStep label={t("courseAnalytics.halfway")}
              value={Math.round((overview?.averageProgress ?? 0) / 100 * (overview?.totalEnrollments ?? 0) * 0.5)}
              percent={Math.round((overview?.averageProgress ?? 0) / 2)} color="bg-warning" />
            <FunnelStep label={t("courseAnalytics.completedFull")}
              value={Math.round((overview?.completionRate ?? 0) / 100 * (overview?.totalEnrollments ?? 0))}
              percent={Math.round(overview?.completionRate ?? 0)} color="bg-success" />
          </div>
        </Card>
      )}
    </div>
  );
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
