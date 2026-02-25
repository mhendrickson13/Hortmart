import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, Mail, BookOpen, Shield, AlertTriangle, ChevronDown, ChevronUp, Eye, Clock, CheckCircle, Circle, Play, LogIn, UserPlus, Ban, Unlock, Star, GraduationCap, History } from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

/** Format seconds as "Xm Ys" */
function fmtDur(s: number) {
  if (!s || s < 1) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

/** Format ISO/date string as short date */
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Event display config */
const EVENT_CONFIG: Record<string, { icon: React.ElementType; labelKey: string; color: string }> = {
  "user.registered":      { icon: UserPlus,     labelKey: "userDetail.eventRegistered",       color: "text-primary" },
  "user.login":           { icon: LogIn,        labelKey: "userDetail.eventLoggedIn",         color: "text-text-3" },
  "user.blocked":         { icon: Ban,          labelKey: "userDetail.eventBlocked",          color: "text-danger" },
  "user.unblocked":       { icon: Unlock,       labelKey: "userDetail.eventUnblocked",        color: "text-success" },
  "user.created_by_admin":{ icon: UserPlus,     labelKey: "userDetail.eventCreatedByAdmin",   color: "text-warning" },
  "enrollment.created":   { icon: BookOpen,     labelKey: "userDetail.eventEnrolledInCourse", color: "text-primary" },
  "lesson.started":       { icon: Play,         labelKey: "userDetail.eventStartedLesson",    color: "text-text-3" },
  "lesson.completed":     { icon: CheckCircle,  labelKey: "userDetail.eventCompletedLesson",  color: "text-success" },
  "course.completed":     { icon: GraduationCap,labelKey: "userDetail.eventCompletedCourse",  color: "text-success" },
  "review.created":       { icon: Star,         labelKey: "userDetail.eventLeftReview",       color: "text-warning" },
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);

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

  const { data: activityData } = useQuery({
    queryKey: ["user-activity", id],
    queryFn: () => usersApi.getActivity(id!, { limit: 50 }, token || undefined),
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
        <p className="text-text-2 text-body">{t("userDetail.userNotFound")}</p>
        <Link to="/users" className="text-primary font-bold text-body-sm">
          {t("userDetail.backToUsers")}
        </Link>
      </div>
    );
  }

  const enrollments = (enrollData?.enrollments || []).map((e: any) => ({
    id: String(e.id),
    courseId: String(e.courseId),
    courseTitle: String(e.courseTitle || "Course"),
    coursePrice: Number(e.coursePrice ?? 0),
    coverImage: e.course?.coverImage || e.coverImage || null,
    enrolledAt: e.enrolledAt || "",
    totalLessons: Number(e.totalLessons ?? 0),
    completedLessons: Number(e.completedLessons ?? 0),
    progressPercent: Number(e.progressPercent ?? e.progress ?? 0),
    lastActivityAt: e.lastActivityAt || null,
    isCompleted: Boolean(e.isCompleted),
    lessonDetails: (e.lessonDetails || []) as Array<{
      id: string; title: string; moduleTitle: string; durationSeconds: number;
      progressPercent: number; watchedSeconds: number; viewCount: number;
      firstViewedAt: string | null; lastWatchedAt: string | null; completedAt: string | null;
    }>,
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
            className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 grid place-items-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div>
            <h1 className="text-[20px] font-black tracking-tight text-text-1">{t("userDetail.title")}</h1>
            <p className="text-[12px] font-extrabold text-text-3 mt-1">
              {user.email} &bull; {t("userDetail.joined", { date: joinDate })}
            </p>
          </div>
        </div>
        <UserHeaderActions
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
          userRole={user.role}
          blockedAt={(user as any).blockedAt}
          existingCourseIds={enrollments.map((e: any) => e.courseId)}
          onEnrolled={() => queryClient.invalidateQueries({ queryKey: ["user-enrollments", id] })}
        />
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
                  {user.name || t("userDetail.noName")}
                </h2>
                <div className="text-[12px] font-extrabold text-text-3 mt-1">{user.email}</div>
                <Pill variant={(user as any).blockedAt ? "error" : "success"} size="sm" className="mt-2">
                  {(user as any).blockedAt ? t("userDetail.blocked") : t("userDetail.active")}
                </Pill>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              <div className="rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 p-3 text-center">
                <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                  {t("userDetail.lifetimeSpend")}
                </div>
                <div className="mt-1.5 text-[18px] font-black text-text-1">
                  {formatCurrency(kpis.lifetimeSpend)}
                </div>
              </div>
              <div className="rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 p-3 text-center">
                <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                  {t("userDetail.avgProgress")}
                </div>
                <div className="mt-1.5 text-[18px] font-black text-text-1">
                  {kpis.avgProgress}%
                </div>
              </div>
              <div className="rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 p-3 text-center">
                <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                  {t("userDetail.lastPurchase")}
                </div>
                <div className="mt-1.5 text-[18px] font-black text-text-1">
                  {kpis.lastPurchaseAt ? formatRelativeTime(kpis.lastPurchaseAt) : t("userDetail.never")}
                </div>
              </div>
            </div>
          </Card>

          {/* Enrolled Courses — expandable with lesson-level stats */}
          <Card className="p-4 flex-1">
            <h3 className="text-[14px] font-black text-text-1 flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" /> {t("userDetail.enrolledCourses", { count: enrollments.length })}
            </h3>
            {enrollments.length === 0 ? (
              <p className="text-body-sm text-text-2 text-center py-8">{t("userDetail.noCoursesEnrolled")}</p>
            ) : (
              <div className="space-y-2.5">
                {enrollments.map((enrollment: any) => {
                  const isExpanded = expandedEnrollment === enrollment.id;
                  return (
                    <div key={enrollment.id} className="rounded-xl border border-border/95 bg-white/95 dark:bg-card/95 overflow-hidden">
                      {/* Course header row — click to expand */}
                      <button
                        type="button"
                        className="w-full flex items-center gap-4 p-3 text-left hover:bg-muted/40 transition-colors"
                        onClick={() => setExpandedEnrollment(isExpanded ? null : enrollment.id)}
                      >
                        {enrollment.coverImage ? (
                          <img src={enrollment.coverImage} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary flex-shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-caption font-bold text-text-1 block truncate">
                            {enrollment.courseTitle}
                          </span>
                          <div className="text-caption text-text-3 mt-0.5">
                            {t("userDetail.lessonsCount", { completed: enrollment.completedLessons, total: enrollment.totalLessons })}
                          </div>
                          <Progress value={enrollment.progressPercent} className="h-1.5 mt-1.5" />
                        </div>
                        <div className="text-caption font-bold text-text-1 mr-1">
                          {enrollment.progressPercent}%
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-text-3 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-3 flex-shrink-0" />}
                      </button>

                      {/* Expanded: per-lesson stats table */}
                      {isExpanded && enrollment.lessonDetails.length > 0 && (
                        <div className="border-t border-border/80 bg-muted/30 px-3 py-2">
                          <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px] mb-2 flex items-center gap-1.5">
                            <Play className="w-3 h-3" /> {t("userDetail.lessonByLessonStats")}
                          </div>
                          <div className="space-y-1">
                            {enrollment.lessonDetails.map((ld: any, idx: number) => {
                              const isComplete = !!ld.completedAt;
                              const watchRatio = ld.durationSeconds > 0 ? Math.round((ld.watchedSeconds / ld.durationSeconds) * 100) : 0;
                              return (
                                <div key={ld.id} className="rounded-lg border border-border/70 bg-white/80 dark:bg-card/80 p-2.5">
                                  <div className="flex items-center gap-2">
                                    {isComplete ? (
                                      <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                    ) : ld.viewCount > 0 ? (
                                      <Circle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-text-4 flex-shrink-0" />
                                    )}
                                    <span className="text-[12px] font-bold text-text-1 flex-1 truncate">
                                      {idx + 1}. {ld.title}
                                    </span>
                                    <span className="text-[11px] text-text-3 font-extrabold flex-shrink-0">
                                      {ld.moduleTitle}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-[11px]">
                                    <div className="flex items-center gap-1 text-text-3">
                                      <Eye className="w-3 h-3" />
                                      <span className="font-bold">{ld.viewCount}</span> {t("userDetail.views")}
                                    </div>
                                    <div className="flex items-center gap-1 text-text-3">
                                      <Clock className="w-3 h-3" />
                                      <span className="font-bold">{fmtDur(ld.watchedSeconds)}</span>
                                      {ld.durationSeconds > 0 && (
                                        <span className="text-text-4">/ {fmtDur(ld.durationSeconds)} ({watchRatio}%)</span>
                                      )}
                                    </div>
                                    <div className="text-text-3 truncate" title={ld.firstViewedAt ? fmtDate(ld.firstViewedAt) : ""}>
                                      {t("userDetail.first")} <span className="font-bold">{fmtDate(ld.firstViewedAt)}</span>
                                    </div>
                                    <div className="text-text-3 truncate" title={ld.completedAt ? fmtDate(ld.completedAt) : ""}>
                                      {isComplete ? (
                                        <>{t("userDetail.done")} <span className="font-bold text-success">{fmtDate(ld.completedAt)}</span></>
                                      ) : (
                                        <>{t("userDetail.last")} <span className="font-bold">{fmtDate(ld.lastWatchedAt)}</span></>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Activity & Actions */}
        <div className="rounded-[22px] bg-white/92 dark:bg-card/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            {t("userDetail.activityAndActions")}
          </h2>

          {/* Permissions */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-text-3" />
                <div>
                  <div className="text-[13px] font-black text-text-1">{t("userDetail.permissions")}</div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                    {t("userDetail.roleLabel", { role: user.role })}
                  </div>
                </div>
              </div>
              <EditPermissionsButton userId={user.id} currentRole={user.role} />
            </div>
          </div>

          {/* Email Status */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text-3" />
                <div>
                  <div className="text-[13px] font-black text-text-1">{t("userDetail.emailStatus")}</div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">{t("userDetail.registeredUser")}</div>
                </div>
              </div>
              <Pill variant="success" size="sm">
                {t("userDetail.active")}
              </Pill>
            </div>
          </div>

          {/* Refund Eligibility */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-text-3" />
                <div>
                  <div className="text-[13px] font-black text-text-1">{t("userDetail.refundEligibility")}</div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                    {t("userDetail.fourteenDaysPolicy")}
                  </div>
                </div>
              </div>
              <ReviewRefundButton />
            </div>
          </div>

          {/* Activity History */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-text-3" />
              <div className="text-[13px] font-black text-text-1">{t("userDetail.activityHistory")}</div>
              {activityData?.total != null && (
                <span className="text-[11px] font-bold text-text-3 bg-muted rounded-full px-2 py-0.5 ml-auto">
                  {activityData.total}
                </span>
              )}
            </div>
            {activityData?.activities && activityData.activities.length > 0 ? (
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {activityData.activities.map((act: any) => {
                  const cfg = EVENT_CONFIG[act.event] || { icon: Circle, labelKey: act.event, color: "text-text-3" };
                  const Icon = cfg.icon;
                  const meta = act.meta || {};
                  const detail = meta.courseTitle || meta.email || "";
                  return (
                    <div key={act.id} className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color} bg-current/10`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-text-1 leading-tight">
                          {t(cfg.labelKey)}
                        </div>
                        {detail && (
                          <div className="text-[11px] text-text-3 truncate mt-0.5" title={detail}>
                            {detail}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-text-4 font-semibold flex-shrink-0 mt-0.5 whitespace-nowrap">
                        {fmtDate(act.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-text-3 py-4 text-center">{t("userDetail.noActivityRecorded")}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
