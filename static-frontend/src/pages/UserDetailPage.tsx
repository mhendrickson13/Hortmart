import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { users as usersApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserHeaderActions,
  EditPermissionsButton,
  ReviewRefundButton,
} from "@/components/admin/user-detail-actions";
import { ArrowLeft, Mail, BookOpen, Shield, AlertTriangle } from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.get(id!, token || undefined),
    enabled: !!id,
  });

  const { data: enrollData } = useQuery({
    queryKey: ["user-enrollments", id],
    queryFn: () => usersApi.getEnrollments(id!, token || undefined),
    enabled: !!id,
  });

  if (userLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const user = userData?.user;
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-text-2 text-body">User not found.</p>
        <Link to="/users" className="text-primary font-bold text-body-sm">
          Back to users
        </Link>
      </div>
    );
  }

  const enrollments = (enrollData?.enrollments || []).map((e: any) => ({
    id: String(e.id),
    courseId: String(e.courseId),
    courseTitle: String(e.courseTitle || "Course"),
    coursePrice: Number(e.coursePrice ?? 0),
    enrolledAt: e.enrolledAt || "",
    totalLessons: Number(e.totalLessons ?? 0),
    completedLessons: Number(e.completedLessons ?? 0),
    progressPercent: Number(e.progressPercent ?? e.progress ?? 0),
    lastActivityAt: e.lastActivityAt || null,
    isCompleted: Boolean(e.isCompleted),
  }));

  const kpis = {
    lifetimeSpend: enrollments.reduce((sum: number, e: any) => sum + e.coursePrice, 0),
    avgProgress:
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((sum: number, e: any) => sum + e.progressPercent, 0) /
              enrollments.length
          )
        : 0,
    lastPurchaseAt:
      enrollments.length > 0
        ? enrollments.reduce((best: any, e: any) =>
            new Date(e.enrolledAt) > new Date(best.enrolledAt) ? e : best
          ).enrolledAt
        : null,
    completedCourses: enrollments.filter((e: any) => e.isCompleted).length,
  };

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/users"
            className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 grid place-items-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div>
            <h1 className="text-[20px] font-black tracking-tight text-text-1">User details</h1>
            <p className="text-[12px] font-extrabold text-text-3 mt-1">
              {user.email} &bull; Joined {joinDate}
            </p>
          </div>
        </div>
        <UserHeaderActions userId={user.id} userName={user.name} userRole={user.role} blockedAt={(user as any).blockedAt} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex flex-col gap-3 min-w-0 overflow-auto">
          {/* User Profile Card */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-[52px] h-[52px] rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-[20px] flex-shrink-0">
                {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-body font-bold text-text-1 truncate">
                  {user.name || "No name"}
                </h2>
                <div className="text-[12px] font-extrabold text-text-3 mt-1">{user.email}</div>
                <Pill variant={(user as any).blockedAt ? "error" : "success"} size="sm" className="mt-2">
                  {(user as any).blockedAt ? "BLOCKED" : "ACTIVE"}
                </Pill>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              <div className="rounded-[16px] border border-border/95 bg-white/95 p-3 text-center">
                <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                  Lifetime spend
                </div>
                <div className="mt-1.5 text-[18px] font-black text-text-1">
                  {formatCurrency(kpis.lifetimeSpend)}
                </div>
              </div>
              <div className="rounded-[16px] border border-border/95 bg-white/95 p-3 text-center">
                <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                  Avg progress
                </div>
                <div className="mt-1.5 text-[18px] font-black text-text-1">
                  {kpis.avgProgress}%
                </div>
              </div>
              <div className="rounded-[16px] border border-border/95 bg-white/95 p-3 text-center">
                <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                  Last purchase
                </div>
                <div className="mt-1.5 text-[18px] font-black text-text-1">
                  {kpis.lastPurchaseAt ? formatRelativeTime(kpis.lastPurchaseAt) : "Never"}
                </div>
              </div>
            </div>
          </Card>

          {/* Enrolled Courses */}
          <Card className="p-4 flex-1">
            <h3 className="text-[14px] font-black text-text-1 flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" /> Enrolled Courses ({enrollments.length})
            </h3>
            {enrollments.length === 0 ? (
              <p className="text-body-sm text-text-2 text-center py-8">No courses enrolled.</p>
            ) : (
              <div className="space-y-2.5">
                {enrollments.map((enrollment: any) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-border/95 bg-white/95"
                  >
                    <div className="w-10 h-10 rounded-xl gradient-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-caption font-bold text-text-1 truncate">
                        {enrollment.courseTitle}
                      </span>
                      <div className="text-caption text-text-3 mt-0.5">
                        {enrollment.completedLessons}/{enrollment.totalLessons} lessons
                      </div>
                      <Progress value={enrollment.progressPercent} className="h-1.5 mt-1.5" />
                    </div>
                    <div className="text-caption font-bold text-text-1">
                      {enrollment.progressPercent}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Activity & Actions */}
        <div className="rounded-[22px] bg-white/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Activity & actions
          </h2>

          {/* Permissions */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-text-3" />
                <div>
                  <div className="text-[13px] font-black text-text-1">Permissions</div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                    {user.role} role
                  </div>
                </div>
              </div>
              <EditPermissionsButton userId={user.id} currentRole={user.role} />
            </div>
          </div>

          {/* Email Status */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text-3" />
                <div>
                  <div className="text-[13px] font-black text-text-1">Email status</div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">Registered user</div>
                </div>
              </div>
              <Pill variant="success" size="sm">
                Active
              </Pill>
            </div>
          </div>

          {/* Refund Eligibility */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-text-3" />
                <div>
                  <div className="text-[13px] font-black text-text-1">Refund eligibility</div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                    14 days policy
                  </div>
                </div>
              </div>
              <ReviewRefundButton />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
