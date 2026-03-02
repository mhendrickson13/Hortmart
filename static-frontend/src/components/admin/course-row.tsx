import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn, formatPrice, formatRelativeTime } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Edit, RotateCcw, Trash2, Copy, MailPlus, Link2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { apiClient, ApiError } from "@/lib/api-client";

interface CourseRowProps {
  course: {
    id: string;
    title: string;
    status: string;
    price: number;
    coverImage?: string | null;
    updatedAt?: Date;
    _count?: {
      enrollments: number;
    };
    revenue?: number;
    revenueChange?: number;
  };
  variant?: "default" | "compact";
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CourseRow({ course, variant = "default", onRestore, onDelete }: CourseRowProps) {
  const { t } = useTranslation();
  const isPublished = course.status === "PUBLISHED";
  const isDraft = course.status === "DRAFT";
  const isArchived = course.status === "ARCHIVED";

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const statusVariant = isPublished ? "published" : isDraft ? "draft" : "default";
  const enrollmentCount = course._count?.enrollments || 0;

  if (variant === "compact") {
    // Compact variant for dashboard top courses - matches client_designs/admin_dashboard_desktop.html .row
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
        {/* Left: Thumbnail + Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {course.coverImage ? (
            <img src={course.coverImage} alt={course.title} className="w-[38px] h-[38px] rounded-[14px] border border-border/95 object-cover flex-shrink-0" />
          ) : (
            <div className="w-[38px] h-[38px] rounded-[14px] border border-border/95 bg-gradient-to-br from-primary/28 to-accent/18 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-black text-text-1 truncate max-w-[360px]">
              {course.title}
            </div>
            <div className="text-[12px] font-extrabold text-text-3 mt-1">
              {t("admin.courseRow.learnersCount", { num: enrollmentCount.toLocaleString() })}
            </div>
          </div>
        </div>
        
        {/* Right: Revenue + Delta badge */}
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <span className="text-[13px] font-black text-text-1">
            {course.revenue ? formatPrice(course.revenue) : formatPrice(course.price)}
          </span>
          {course.revenueChange !== undefined && (
            <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-success/14 text-green-700 border border-success/22">
              +{course.revenueChange}%
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default table-style variant - matches client_designs/admin_courses_list_desktop.html .tr
  return (
    <>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.courseRow.invite")}</DialogTitle>
            <DialogDescription>
              {t("admin.courseRow.inviteDesc", { title: course.title })}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`invite-email-${course.id}`}>{t("common.email")}</Label>
              <Input
                id={`invite-email-${course.id}`}
                type="email"
                placeholder="learner@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <p className="text-[12px] text-text-3">{t("admin.courseRow.inviteHelp")}</p>
          </DialogBody>

          <DialogFooter>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setInviteOpen(false)}
                disabled={isInviting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={isInviting || inviteEmail.trim().length === 0}
                onClick={async () => {
                  const email = inviteEmail.trim();
                  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                  if (!isValid) {
                    toast({ title: t("admin.courseRow.inviteInvalidEmail"), variant: "error" });
                    return;
                  }
                  setIsInviting(true);
                  try {
                    await apiClient.courses.invite(course.id, email);
                    toast({ title: t("admin.courseRow.inviteSent"), variant: "success" });
                    setInviteOpen(false);
                    setInviteEmail("");
                  } catch (err) {
                    const message = err instanceof ApiError ? err.message : t("admin.courseRow.inviteFailed");
                    toast({ title: message, variant: "error" });
                  } finally {
                    setIsInviting(false);
                  }
                }}
              >
                {isInviting ? t("admin.courseRow.inviteSending") : t("admin.courseRow.inviteSend")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_0.6fr_0.8fr] gap-2.5 items-center p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 mt-2.5 first:mt-0">
      {/* Course Info */}
      <div className="flex items-center gap-3 min-w-0">
        {course.coverImage ? (
          <img src={course.coverImage} alt={course.title} className="w-[42px] h-[42px] rounded-[16px] border border-border/95 object-cover flex-shrink-0" />
        ) : (
          <div className="w-[42px] h-[42px] rounded-[16px] border border-border/95 bg-gradient-to-br from-primary/26 to-accent/16 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[13px] font-black text-text-1 truncate">
            {course.title}
          </div>
          <div className="text-[12px] font-extrabold text-text-3 mt-1">
            {course.updatedAt 
              ? t("admin.courseRow.updated", { time: formatRelativeTime(course.updatedAt) })
              : t("admin.courseRow.learnersCount", { num: enrollmentCount.toLocaleString() })
            }
          </div>
        </div>
      </div>

      {/* Course ID */}
      <div className="hidden sm:flex items-center gap-2 min-w-0">
        <span className="font-mono text-[12px] font-bold text-text-2 truncate">{course.id}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(course.id);
              toast({ title: t("admin.courseRow.copiedCourseId"), variant: "success" });
            } catch {
              toast({ title: t("admin.courseRow.copyFailed"), variant: "error" });
            }
          }}
          className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-text-2 hover:text-text-1 hover:bg-muted/80 transition-colors"
          aria-label={t("admin.courseRow.copyCourseId")}
          title={t("admin.courseRow.copyCourseId")}
        >
          <Copy className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={async () => {
            const publicUrl = `${window.location.origin}/course/${course.id}`;
            try {
              await navigator.clipboard.writeText(publicUrl);
              toast({ title: t("admin.courseRow.copiedPublicLink"), variant: "success" });
            } catch {
              toast({ title: t("admin.courseRow.copyFailed"), variant: "error" });
            }
          }}
          className="h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-text-2 hover:text-text-1 hover:bg-muted/80 transition-colors"
          aria-label={t("admin.courseRow.copyPublicLink")}
          title={t("admin.courseRow.copyPublicLink")}
        >
          <Link2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status */}
      <div className="hidden sm:block">
        <Pill variant={statusVariant}>
          {course.status}
        </Pill>
      </div>

      {/* Price */}
      <div className="hidden sm:block">
        <span className={cn(
          "font-black",
          isArchived ? "text-text-3 font-extrabold text-[12px]" : "text-text-1"
        )}>
          {isArchived ? "—" : formatPrice(course.price)}
        </span>
      </div>

      {/* Students */}
      <div className="hidden sm:block">
        <span className={cn(
          "font-black",
          (isDraft || isArchived) ? "text-text-3 font-extrabold text-[12px]" : "text-text-1"
        )}>
          {(isDraft || isArchived) ? "—" : enrollmentCount.toLocaleString()}
        </span>
      </div>

      {/* Actions - using .mini button style from design */}
      <div className="flex items-center gap-2 justify-end">
        {isPublished && (
          <>
            <button
              type="button"
              onClick={() => {
                setInviteEmail("");
                setInviteOpen(true);
              }}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center gap-1.5 text-[12px] font-black bg-white/95 dark:bg-card/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
            >
              <MailPlus className="w-3.5 h-3.5" />
              {t("admin.courseRow.invite")}
            </button>
            <Link 
              to={`/manage-courses/${course.id}/edit`}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-primary/10 border border-primary/14 text-primary-600 hover:bg-primary/15 transition-colors"
            >
              {t("common.edit")}
            </Link>
            <Link 
              to={`/manage-courses/${course.id}/analytics`}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-white/95 dark:bg-card/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
            >
              {t("nav.analytics")}
            </Link>
            <Link 
              to={`/manage-courses/${course.id}/edit`}
              className="sm:hidden h-8 w-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </>
        )}
        {isDraft && (
          <>
            <Link 
              to={`/manage-courses/${course.id}/edit`}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-primary/10 border border-primary/14 text-primary-600 hover:bg-primary/15 transition-colors"
            >
              {t("admin.courseRow.continue")}
            </Link>
            <Link 
              to={`/manage-courses/${course.id}/preview`}
              target="_blank"
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-white/95 dark:bg-card/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
            >
              {t("courses.preview")}
            </Link>
            <Link 
              to={`/manage-courses/${course.id}/edit`}
              className="sm:hidden h-8 w-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </>
        )}
        {isArchived && (
          <>
            <button 
              onClick={() => onRestore?.(course.id)}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center gap-1.5 text-[12px] font-black bg-white/95 dark:bg-card/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("admin.courseRow.restore")}
            </button>
            <button 
              onClick={() => onDelete?.(course.id)}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center gap-1.5 text-[12px] font-black bg-white/95 dark:bg-card/95 border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("common.delete")}
            </button>
            <button 
              onClick={() => onRestore?.(course.id)}
              className="sm:hidden h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-text-2"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      </div>
    </>
  );
}

// Table header component for courses list - matches .thead
export function CourseRowHeader() {
  const { t } = useTranslation();
  return (
    <div className="hidden sm:grid grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_0.6fr_0.8fr] gap-2.5 items-center px-3 py-2.5 text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
      <div>{t("admin.courseRow.course")}</div>
      <div>{t("admin.courseRow.courseId")}</div>
      <div>{t("admin.courseRow.status")}</div>
      <div>{t("admin.courseRow.price")}</div>
      <div>{t("admin.courseRow.students")}</div>
      <div className="text-right">{t("admin.courseRow.actions")}</div>
    </div>
  );
}
