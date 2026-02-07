import { auth } from "@/lib/auth";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  BookOpen,
  Clock,
  Shield,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import {
  UserHeaderActions,
  EditPermissionsButton,
  ReviewRefundButton,
  DownloadCertificateButton,
} from "@/components/admin/user-detail-actions";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  lastActiveAt: string | null;
  emailVerified?: string | null;
}

interface Enrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  enrolledAt: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  lastActivityAt: string | null;
  isCompleted: boolean;
}

interface KPIs {
  lifetimeSpend: number;
  avgProgress: number;
  lastPurchaseAt: string | null;
  completedCourses: number;
}

async function getUserDetail(userId: string) {
  try {
    const session = await auth();
    if (!session?.accessToken) return null;

    const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

    const [userRes, enrollmentsRes] = await Promise.all([
      fetch(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      }),
      fetch(`${API_URL}/users/${userId}/enrollments`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      }),
    ]);

    if (!userRes.ok) return null;

    const userPayload = await userRes.json();
    const user = userPayload.user as UserDetail;

    let enrollments: Enrollment[] = [];
    if (enrollmentsRes.ok) {
      const enrollmentsPayload = await enrollmentsRes.json();
      const raw = enrollmentsPayload.enrollments as Array<
        Record<string, unknown>
      >;
      enrollments = raw.map((e) => ({
        id: String(e.id),
        courseId: String(e.courseId),
        courseTitle: String(e.courseTitle),
        coursePrice: Number(e.coursePrice ?? 0),
        enrolledAt:
          typeof e.enrolledAt === "string"
            ? e.enrolledAt
            : (e.enrolledAt as Date)?.toISOString?.() ?? "",
        totalLessons: Number(e.totalLessons ?? 0),
        completedLessons: Number(e.completedLessons ?? 0),
        progressPercent: Number(e.progressPercent ?? e.progress ?? 0),
        lastActivityAt:
          e.lastActivityAt != null ? String(e.lastActivityAt) : null,
        isCompleted: Boolean(e.isCompleted),
      }));
    }

    const completedCourses = enrollments.filter((e) => e.isCompleted).length;
    const lifetimeSpend = enrollments.reduce((sum, e) => sum + e.coursePrice, 0);
    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + e.progressPercent, 0) /
              enrollments.length
          )
        : 0;
    const lastPurchaseAt =
      enrollments.length > 0
        ? enrollments.reduce((best, e) =>
            new Date(e.enrolledAt) > new Date(best.enrolledAt) ? e : best
          ).enrolledAt
        : null;

    return {
      user,
      enrollments,
      kpis: { lifetimeSpend, avgProgress, lastPurchaseAt, completedCourses },
    };
  } catch (error) {
    console.error("Failed to fetch user detail:", error);
    return null;
  }
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth();
  const { id } = await params;
  const data = await getUserDetail(id);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-text-2 text-body">User not found.</p>
        <Link href="/users" className="text-primary font-bold text-body-sm">
          Back to users
        </Link>
      </div>
    );
  }

  const { user, enrollments, kpis } = data;

  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <>
      {/* Header - matches design */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/users"
            className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 grid place-items-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div>
            <h1 className="text-[20px] font-black tracking-tight text-text-1">
              User details
            </h1>
            <p className="text-[12px] font-extrabold text-text-3 mt-1">
              {user.email} &bull; Joined {joinDate} &bull;{" "}
              {user.lastActiveAt
                ? `Last active ${formatRelativeTime(user.lastActiveAt)}`
                : "Never active"}
            </p>
          </div>
        </div>
        <UserHeaderActions
          userId={user.id}
          userName={user.name}
          userRole={user.role}
        />
      </div>

      {/* Two-column layout - matches design grid(1.1fr, 0.9fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex flex-col gap-3 min-w-0 overflow-auto">
          {/* Profile Card */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-[52px] h-[52px] rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-[20px] flex-shrink-0">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || ""}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  user.name?.charAt(0)?.toUpperCase() ||
                  user.email.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-body font-bold text-text-1 truncate">
                    {user.name || "No name"}
                  </h2>
                </div>
                <div className="text-[12px] font-extrabold text-text-3 mt-1">
                  {user.email} &bull; {user.role === "ADMIN" ? "Admin" : user.role === "CREATOR" ? "Creator" : "Learner"}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Pill variant="success" size="sm">
                    ACTIVE
                  </Pill>
                  {user.emailVerified && (
                    <Pill variant="primary" size="sm">
                      Verified email
                    </Pill>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 hidden sm:block">
                <div className="text-[13px] font-black text-text-1">
                  {enrollments.length} courses
                </div>
                <div className="text-[12px] font-extrabold text-text-3 mt-1">
                  {kpis.completedCourses} completed
                </div>
              </div>
            </div>

            {/* KPI cards inside profile */}
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
                  {kpis.lastPurchaseAt
                    ? formatRelativeTime(kpis.lastPurchaseAt)
                    : "Never"}
                </div>
              </div>
            </div>
          </Card>

          {/* Enrolled Courses */}
          <Card className="p-4 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-black text-text-1 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Enrolled Courses ({enrollments.length})
              </h3>
            </div>

            {enrollments.length === 0 ? (
              <p className="text-body-sm text-text-2 text-center py-8">
                This user has not enrolled in any courses.
              </p>
            ) : (
              <div className="space-y-2.5">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-border/95 bg-white/95"
                  >
                    <div className="w-10 h-10 rounded-xl gradient-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-bold text-text-1 truncate">
                          {enrollment.courseTitle}
                        </span>
                        {enrollment.isCompleted ? (
                          <Pill size="sm" variant="completed">
                            COMPLETED
                          </Pill>
                        ) : enrollment.progressPercent > 0 ? (
                          <Pill size="sm" variant="primary">
                            IN PROGRESS
                          </Pill>
                        ) : null}
                      </div>
                      <div className="text-caption text-text-3 mt-0.5">
                        Enrolled {formatRelativeTime(enrollment.enrolledAt)}{" "}
                        &bull; {enrollment.completedLessons}/
                        {enrollment.totalLessons} lessons
                      </div>
                      <div className="mt-1.5">
                        <Progress
                          value={enrollment.progressPercent}
                          className="h-1.5"
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-caption font-bold text-text-1">
                        {enrollment.progressPercent}%
                      </div>
                      <div className="text-[11px] text-text-3">
                        {formatCurrency(enrollment.coursePrice)}
                      </div>
                      {enrollment.isCompleted && (
                        <DownloadCertificateButton />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Activity & Actions panel */}
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
                  <div className="text-[13px] font-black text-text-1">
                    Permissions
                  </div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                    {user.role === "ADMIN" ? "Admin" : user.role === "CREATOR" ? "Creator" : "Learner"} role
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
                  <div className="text-[13px] font-black text-text-1">
                    Email status
                  </div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                    {user.emailVerified ? "Verified" : "Not verified"}
                  </div>
                </div>
              </div>
              <Pill
                variant={user.emailVerified ? "success" : "warning"}
                size="sm"
              >
                {user.emailVerified ? "OK" : "Pending"}
              </Pill>
            </div>
          </div>

          {/* Refund Eligibility */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-text-3" />
                <div>
                  <div className="text-[13px] font-black text-text-1">
                    Refund eligibility
                  </div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                    14 days policy
                  </div>
                </div>
              </div>
              <ReviewRefundButton />
            </div>
          </div>

          {/* Audit Log */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Audit log
          </h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3 space-y-3">
            {enrollments.length > 0 ? (
              <>
                {/* Show most recent purchase */}
                {enrollments
                  .sort(
                    (a, b) =>
                      new Date(b.enrolledAt).getTime() -
                      new Date(a.enrolledAt).getTime()
                  )
                  .slice(0, 3)
                  .map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black text-text-1 truncate">
                          Purchase: {enrollment.courseTitle}
                        </div>
                        <div className="text-[11px] font-extrabold text-text-3 mt-0.5">
                          {formatRelativeTime(enrollment.enrolledAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                {/* Show progress events */}
                {enrollments
                  .filter((e) => e.progressPercent > 0)
                  .slice(0, 2)
                  .map((enrollment) => (
                    <div
                      key={`progress-${enrollment.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black text-text-1 truncate">
                          Progress: {enrollment.courseTitle} ({enrollment.progressPercent}%)
                        </div>
                        <div className="text-[11px] font-extrabold text-text-3 mt-0.5">
                          {enrollment.lastActivityAt
                            ? formatRelativeTime(enrollment.lastActivityAt)
                            : "Recently"}
                        </div>
                      </div>
                    </div>
                  ))}
              </>
            ) : (
              <div className="text-center py-4 text-text-3 text-[13px] font-bold">
                No activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
