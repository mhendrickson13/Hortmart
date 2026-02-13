import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { courses as coursesApi } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/admin/stat-card";
import { ArrowLeft, TrendingUp, Users, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type TabKey = "overview" | "students" | "funnel";

export default function CourseAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const analytics = data?.analytics;
  const overview = analytics?.overview;
  const courseTitle = courseData?.course?.title || "Course";
  const lessonStats = analytics?.lessonStats || [];
  const topStudents = analytics?.topStudents || [];
  const enrollmentTrend = analytics?.enrollmentTrend || [];

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "students", label: "Top Students", icon: Users },
    { key: "funnel", label: "Completion Funnel", icon: TrendingUp },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link to="/manage-courses" className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 grid place-items-center hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-text-1" />
        </Link>
        <div>
          <h1 className="text-[20px] font-black tracking-tight text-text-1">Course Analytics</h1>
          <p className="text-[12px] font-extrabold text-text-3 mt-1">{courseTitle}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Enrollments" value={String(overview?.totalEnrollments ?? 0)} />
        <StatCard title="Avg Progress" value={`${overview?.averageProgress ?? 0}%`} />
        <StatCard title="Completion" value={`${overview?.completionRate ?? 0}%`} />
        <StatCard title="Revenue" value={formatCurrency(overview?.totalRevenue ?? 0)} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-[16px] w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`h-8 px-4 rounded-[12px] text-[13px] font-black inline-flex items-center gap-1.5 transition-all ${activeTab === t.key ? "bg-white shadow-sm text-text-1" : "text-text-3 hover:text-text-2"}`}>
              <Icon className="w-3.5 h-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3">
          {/* Enrollment Trend */}
          <Card className="p-4">
            <h3 className="text-[14px] font-black text-text-1 mb-4">Enrollment Trend</h3>
            {enrollmentTrend.length > 0 ? (
              <div className="flex items-end gap-2 h-[180px]">
                {enrollmentTrend.slice(-14).map((d: any, i: number) => {
                  const max = Math.max(...enrollmentTrend.slice(-14).map((x: any) => x.count), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-text-3">{d.count}</span>
                      <div className="w-full bg-primary/70 rounded-t-md" style={{ height: `${Math.max((d.count / max) * 140, 4)}px` }} />
                      <span className="text-[9px] text-text-3">{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-text-3 text-body-sm">No enrollment data yet</div>
            )}
          </Card>

          {/* Lesson Performance */}
          <Card className="p-4">
            <h3 className="text-[14px] font-black text-text-1 mb-4">Lesson Performance</h3>
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
              {lessonStats.length > 0 ? lessonStats.map((lesson: any) => (
                <div key={lesson.lessonId} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/95 bg-white/95">
                  <div className="flex-1 min-w-0">
                    <div className="text-caption font-bold text-text-1 truncate">{lesson.title}</div>
                  </div>
                  <span className="text-caption font-bold text-text-1">{lesson.completionRate}%</span>
                  <div className="w-16 h-2 rounded-full bg-border/50 overflow-hidden">
                    <div className={`h-full rounded-full ${lesson.completionRate >= 70 ? "bg-success" : lesson.completionRate >= 40 ? "bg-warning" : "bg-red-400"}`} style={{ width: `${lesson.completionRate}%` }} />
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-text-3 text-[13px] font-bold">No lesson data yet</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "students" && (
        <Card className="p-4">
          <h3 className="text-[14px] font-black text-text-1 mb-4">Top Students</h3>
          <div className="space-y-2.5">
            {topStudents.length > 0 ? topStudents.map((student: any, i: number) => (
              <div key={student.userId || i} className="flex items-center gap-3 p-3 rounded-[16px] border border-border/95 bg-white/95">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[12px] flex-shrink-0">
                  {student.name?.charAt(0) || "#"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black text-text-1 truncate">{student.name || "Student"}</div>
                  <div className="text-[11px] font-extrabold text-text-3 mt-0.5">
                    {student.completedAt ? `Completed on ${new Date(student.completedAt).toLocaleDateString()}` : "In progress"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-black text-primary">{Math.round(student.progress)}%</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-text-3 text-body-sm">No student data yet</div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "funnel" && (
        <Card className="p-4">
          <h3 className="text-[14px] font-black text-text-1 mb-4">Completion Funnel</h3>
          <div className="space-y-3">
            <FunnelStep label="Enrolled" value={overview?.totalEnrollments ?? 0} percent={100} color="bg-primary" />
            <FunnelStep label="Started (>0%)" value={overview?.activeStudents ?? 0} percent={overview?.totalEnrollments ? Math.round(((overview.activeStudents ?? 0) / overview.totalEnrollments) * 100) : 0} color="bg-accent" />
            <FunnelStep label="Halfway (>50%)" value={Math.round((overview?.averageProgress ?? 0) / 100 * (overview?.totalEnrollments ?? 0) * 0.5)} percent={Math.round((overview?.averageProgress ?? 0) / 2)} color="bg-warning" />
            <FunnelStep label="Completed (100%)" value={Math.round((overview?.completionRate ?? 0) / 100 * (overview?.totalEnrollments ?? 0))} percent={Math.round(overview?.completionRate ?? 0)} color="bg-success" />
          </div>
        </Card>
      )}
    </>
  );
}

function FunnelStep({ label, value, percent, color }: { label: string; value: number; percent: number; color: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-body-sm font-semibold text-text-1">{label}</div>
      <div className="flex-1 h-8 bg-border/30 rounded-lg overflow-hidden">
        <div className={`h-full ${color} rounded-lg transition-all flex items-center px-3`} style={{ width: `${Math.max(percent, 4)}%` }}>
          <span className="text-[11px] font-bold text-white">{value}</span>
        </div>
      </div>
      <div className="w-12 text-right text-body-sm font-bold text-text-1">{percent}%</div>
    </div>
  );
}
