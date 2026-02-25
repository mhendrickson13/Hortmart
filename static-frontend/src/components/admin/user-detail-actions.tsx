import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiClient, courses as coursesApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/toaster";
import { useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Plus,
  Ban,
  Shield,
  CheckCircle,
  Download,
  X,
  Send,
  BookOpen,
  Search,
  Loader2,
} from "lucide-react";

// ── Send Message Modal ──

function SendMessageModal({
  userId,
  userName,
  userEmail,
  onClose,
}: {
  userId: string;
  userName: string | null;
  userEmail: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await apiClient.users.sendMessage(userId, { subject: subject.trim(), message: message.trim() }, token || undefined);
      toast({ title: t("admin.userActions.emailSent"), description: t("admin.userActions.messageSentTo", { email: userEmail }), variant: "success" });
      onClose();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("admin.userActions.failedToSendEmail"), variant: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={modalRef} className="w-full max-w-lg bg-white dark:bg-card rounded-2xl shadow-xl border border-border/80 overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80">
          <div>
            <h2 className="text-[15px] font-black text-text-1">{t("admin.userActions.sendMessage")}</h2>
            <p className="text-[12px] text-text-3 mt-0.5">{t("admin.userActions.subject")}: {userName || userEmail}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-2" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-bold text-text-2 mb-1.5 block">{t("admin.userActions.subject")}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("admin.userActions.emailSubjectPlaceholder")}
              className="w-full h-10 px-3 rounded-xl border border-border/80 bg-white dark:bg-card text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[12px] font-bold text-text-2 mb-1.5 block">{t("admin.userActions.message")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("admin.userActions.writeMessagePlaceholder")}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-white dark:bg-card text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/80 bg-surface-1/50">
          <button onClick={onClose} className="h-9 px-4 rounded-xl text-[13px] font-bold text-text-2 hover:bg-surface-2 transition-colors">
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="h-9 px-4 rounded-xl text-[13px] font-bold bg-primary text-white inline-flex items-center gap-2 disabled:opacity-50 transition-colors hover:bg-primary/90"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? t("admin.userActions.sending") : t("admin.userActions.sendEmail")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Course Modal ──

function AddCourseModal({
  userId,
  userName,
  existingCourseIds,
  onClose,
  onEnrolled,
}: {
  userId: string;
  userName: string | null;
  existingCourseIds: string[];
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      try {
        const res = await coursesApi.list({ limit: 100, status: "PUBLISHED" }, token || undefined);
        setCoursesList(res.courses || []);
      } catch { setCoursesList([]); }
      setLoading(false);
    })();
  }, [token]);

  const filtered = coursesList.filter(
    (c) =>
      !existingCourseIds.includes(c.id) &&
      (c.title?.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEnroll = async (courseId: string, courseTitle: string) => {
    setEnrolling(courseId);
    try {
      await apiClient.users.enrollInCourse(userId, courseId, token || undefined);
      toast({ title: t("admin.userActions.enrolled"), description: t("admin.userActions.enrolledInCourse", { name: userName || t("settings.user"), course: courseTitle }), variant: "success" });
      onEnrolled();
      onClose();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : t("admin.userActions.failedToEnroll"), variant: "error" });
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-white dark:bg-card rounded-2xl shadow-xl border border-border/80 overflow-hidden animate-fade-in max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-black text-text-1">{t("admin.userActions.addCourse")}</h2>
            <p className="text-[12px] text-text-3 mt-0.5">{t("admin.userActions.enrollUserInCourse", { name: userName || t("settings.user") })}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-2 transition-colors">
            <X className="w-4 h-4 text-text-2" />
          </button>
        </div>
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.userActions.searchCourses")}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border/80 bg-white dark:bg-card text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-text-3" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] text-text-3 text-center py-12">
              {search ? t("admin.userActions.noMatchingCourses") : t("admin.userActions.noAvailableCourses")}
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {filtered.map((course) => (
                <div key={course.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/80 hover:bg-surface-1/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-text-1 truncate">{course.title}</div>
                    {course.category && <div className="text-[11px] text-text-3">{course.category}</div>}
                  </div>
                  <button
                    onClick={() => handleEnroll(course.id, course.title)}
                    disabled={enrolling === course.id}
                    className="h-8 px-3 rounded-xl text-[12px] font-bold bg-primary text-white inline-flex items-center gap-1.5 disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    {enrolling === course.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    {enrolling === course.id ? t("admin.userActions.enrolling") : t("admin.userActions.enroll")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Header Action Buttons ──

interface UserHeaderActionsProps {
  userId: string;
  userName: string | null;
  userEmail: string;
  userRole: string;
  blockedAt?: string | null;
  existingCourseIds?: string[];
  onEnrolled?: () => void;
}

export function UserHeaderActions({
  userId,
  userName,
  userEmail,
  userRole,
  blockedAt,
  existingCourseIds = [],
  onEnrolled,
}: UserHeaderActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [blocking, setBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(!!blockedAt);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  const handleBlock = async () => {
    if (userRole === "ADMIN") {
      toast({ title: t("admin.userActions.cannotBlockAdmin"), variant: "error" });
      return;
    }

    const action = isBlocked ? "unblock" : "block";
    const displayName = userName || t("admin.userActions.thisUser");
    const confirmMsg = isBlocked
      ? t("admin.userActions.confirmUnblock", { name: displayName })
      : t("admin.userActions.confirmBlock", { name: displayName });

    if (!window.confirm(confirmMsg)) return;

    setBlocking(true);
    try {
      if (action === "block") {
        await apiClient.users.block(userId);
      } else {
        await apiClient.users.unblock(userId);
      }

      setIsBlocked(!isBlocked);
      toast({
        title: isBlocked ? t("admin.userActions.userUnblocked") : t("admin.userActions.userBlocked"),
        variant: "success",
      });
      navigate(0);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : t("admin.userActions.failedToAction", { action }),
        variant: "error",
      });
    } finally {
      setBlocking(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setShowMessageModal(true)}
          className="h-10 px-3.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)]"
        >
          <Mail className="w-4 h-4" />
          {t("admin.userActions.message")}
        </button>
        <button
          onClick={() => setShowAddCourseModal(true)}
          className="h-10 px-3.5 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] inline-flex items-center gap-2 shadow-[0_16px_34px_rgba(47,111,237,0.22)]"
        >
          <Plus className="w-4 h-4" />
          {t("admin.userActions.addCourse")}
        </button>
      <button
        onClick={handleBlock}
        disabled={blocking}
        className={`h-10 px-3.5 rounded-[16px] border font-black text-[13px] inline-flex items-center gap-2 transition-colors disabled:opacity-50 ${
          isBlocked
            ? "border-success/50 bg-card text-success hover:bg-success/5"
            : "border-red-300 dark:border-red-800 bg-card text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
        }`}
      >
        {isBlocked ? (
          <>
            <CheckCircle className="w-4 h-4" />
            {blocking ? t("admin.userActions.unblocking") : t("admin.userActions.unblock")}
          </>
        ) : (
          <>
            <Ban className="w-4 h-4" />
            {blocking ? t("admin.userActions.blocking") : t("admin.userActions.block")}
          </>
        )}
      </button>
      </div>

      {showMessageModal && (
        <SendMessageModal
          userId={userId}
          userName={userName}
          userEmail={userEmail}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {showAddCourseModal && (
        <AddCourseModal
          userId={userId}
          userName={userName}
          existingCourseIds={existingCourseIds}
          onClose={() => setShowAddCourseModal(false)}
          onEnrolled={() => onEnrolled?.()}
        />
      )}
    </>
  );
}

// ── Edit Permissions Button ──

interface EditPermissionsProps {
  userId: string;
  currentRole: string;
}

export function EditPermissionsButton({
  userId,
  currentRole,
}: EditPermissionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (role === currentRole) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await apiClient.users.update(userId, { role } as never);
      toast({ title: t("admin.userActions.roleUpdated"), variant: "success" });
      setEditing(false);
      navigate(0);
    } catch {
      toast({ title: t("admin.userActions.failedToUpdateRole"), variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-[30px] px-2 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1"
        >
          <option value="LEARNER">{t("admin.userActions.learner")}</option>
          <option value="CREATOR">{t("admin.userActions.creator")}</option>
          <option value="ADMIN">{t("admin.userActions.adminRole")}</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-primary/55 bg-primary text-white disabled:opacity-50"
        >
          {saving ? "..." : t("common.save")}
        </button>
        <button
          onClick={() => {
            setRole(currentRole);
            setEditing(false);
          }}
          className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1"
        >
          {t("common.cancel")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:bg-muted transition-colors"
    >
      {t("common.edit")}
    </button>
  );
}

// ── Review Refund Button ──

export function ReviewRefundButton() {
  const { t } = useTranslation();
  return (
    <button
      onClick={() =>
        toast({
          title: t("admin.userActions.refundComingSoon"),
          description: t("admin.userActions.refundComingSoonDesc"),
          variant: "info",
        })
      }
      className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:bg-muted transition-colors"
    >
      {t("admin.userActions.review")}
    </button>
  );
}

// ── Download Certificate Button ──

export function DownloadCertificateButton() {
  const { t } = useTranslation();
  return (
    <button
      onClick={() =>
        toast({
          title: t("admin.userActions.certificatesComingSoon"),
          description: t("admin.userActions.certificatesComingSoonDesc"),
          variant: "info",
        })
      }
      className="mt-1 h-[26px] px-2 rounded-[12px] text-[11px] font-black bg-primary/10 border border-primary/14 text-primary-600 inline-flex items-center gap-1 hover:bg-primary/15 transition-colors"
    >
      <Download className="w-3 h-3" />
      {t("admin.userActions.download")}
    </button>
  );
}
