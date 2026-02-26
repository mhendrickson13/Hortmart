import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courses as coursesApi, apiClient, uploads as uploadsApi, video as videoApi } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Play,
  Upload,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  FileText,
  ImageIcon,
  Loader2,
} from "lucide-react";

// ── Types ──

interface EditorCourse {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  whatYouWillLearn: string | null;
  coverImage: string | null;
  status: string;
  price: number;
  level: string;
  category: string | null;
  language: string;
  modules: EditorModule[];
}

interface EditorModule {
  id: string;
  title: string;
  position: number;
  lessons: EditorLesson[];
}

interface EditorLesson {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  hlsUrl?: string | null;
  videoStatus?: string | null;
  durationSeconds: number;
  isLocked: boolean;
  isFreePreview: boolean;
  position: number;
}

// ── Page Wrapper ──

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ["course", id],
    queryFn: () => coursesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !data?.course) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-text-2 text-body">{t("editCourse.courseNotFound")}</p>
        <Link to="/manage-courses" className="text-primary font-bold text-body-sm">{t("editCourse.backToCourses")}</Link>
      </div>
    );
  }

  const c = data.course;
  const editorCourse: EditorCourse = {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle ?? null,
    description: c.description ?? null,
    whatYouWillLearn: c.whatYouWillLearn ?? null,
    coverImage: c.coverImage ?? null,
    status: c.status,
    price: c.price,
    level: c.level || "BEGINNER",
    category: c.category ?? null,
    language: c.language || "en",
    modules: (c.modules || []).map((mod: any) => ({
      id: mod.id,
      title: mod.title,
      position: mod.position ?? 0,
      lessons: (mod.lessons || []).map((les: any) => ({
        id: les.id,
        title: les.title,
        description: les.description ?? null,
        videoUrl: les.videoUrl ?? null,
        hlsUrl: les.hlsUrl ?? null,
        videoStatus: les.videoStatus ?? null,
        durationSeconds: les.durationSeconds ?? 0,
        isLocked: les.isLocked ?? false,
        isFreePreview: les.isFreePreview ?? false,
        position: les.position ?? 0,
      })),
    })),
  };

  return <CourseEditor key={dataUpdatedAt} course={editorCourse} />;
}

// ── Course Editor ──

function CourseEditor({ course: initialCourse }: { course: EditorCourse }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [course, setCourse] = useState(initialCourse);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(course.modules.map((m) => m.id))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [showAddModule, setShowAddModule] = useState(course.modules.length === 0);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── Poll encoding status for lessons that are still encoding ──
  useEffect(() => {
    const encodingLessons = course.modules
      .flatMap((m) => m.lessons)
      .filter((l) => l.videoStatus === 'encoding');

    if (encodingLessons.length === 0) return;

    let cancelled = false;

    const poll = async () => {
      for (const lesson of encodingLessons) {
        if (cancelled) return;
        try {
          const status = await videoApi.getStatus(lesson.id);
          if (cancelled) return;
          if (status.videoStatus !== 'encoding') {
            // Update lesson in local state
            setCourse((prev) => ({
              ...prev,
              modules: prev.modules.map((m) => ({
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === lesson.id
                    ? { ...l, videoStatus: status.videoStatus, hlsUrl: status.hlsUrl ?? l.hlsUrl }
                    : l
                ),
              })),
            }));
          }
        } catch { /* ignore polling errors */ }
      }
    };

    // Immediate first poll, then every 10s
    poll();
    const timer = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [course.modules]);

  const lastSavedText = lastSaved
    ? (() => {
        const mins = Math.round((Date.now() - lastSaved.getTime()) / 60000);
        if (mins < 1) return t("editCourse.autoSavedJustNow");
        return t("editCourse.autoSavedMinAgo", { mins });
      })()
    : null;

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  // ─── Cover image upload ───
  const handleCoverUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: t("editCourse.selectImageFile"), variant: "error" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t("editCourse.imageTooLarge"), variant: "error" });
        return;
      }
      setUploadingCover(true);
      setCoverUploadProgress(10);
      try {
        setCoverUploadProgress(30);
        const fileUrl = await uploadsApi.uploadFile(file, "image");
        setCoverUploadProgress(80);
        // Save the URL to the course
        const result = await apiClient.courses.update(course.id, { coverImage: fileUrl } as any);
        const updated = (result as any).course || result;
        setCourse((c) => ({ ...c, ...updated }));
        setCoverUploadProgress(100);
        setLastSaved(new Date());
        toast({ title: t("editCourse.coverImageUploaded"), variant: "success" });
      } catch (err: any) {
        toast({ title: t("editCourse.uploadFailed"), description: err.message || t("common.tryAgain"), variant: "error" });
      } finally {
        setUploadingCover(false);
        setCoverUploadProgress(0);
      }
    },
    [course.id]
  );

  const handleCoverDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingCover(false);
      const file = e.dataTransfer.files[0];
      if (file) handleCoverUpload(file);
    },
    [handleCoverUpload]
  );

  const handleCoverFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleCoverUpload(file);
      // Reset the input so the same file can be selected again
      e.target.value = "";
    },
    [handleCoverUpload]
  );

  // ─── Course field updates ───
  const updateCourseField = useCallback(
    async (field: string, value: string | number) => {
      setSavingField(field);
      try {
        const result = await apiClient.courses.update(course.id, { [field]: value } as any);
        const updated = (result as any).course || result;
        setCourse((c) => ({ ...c, ...updated }));
        setLastSaved(new Date());
        toast({ title: t("editCourse.saved"), variant: "success" });
      } catch {
        toast({ title: t("editCourse.failedToSave"), variant: "error" });
      } finally {
        setSavingField(null);
        setEditingField(null);
      }
    },
    [course.id]
  );

  // ─── Module CRUD ───
  const addModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      const result = await apiClient.courses.createModule(course.id, {
        title: newModuleTitle,
        position: course.modules.length,
      });
      const mod: any = (result as any).module || result;
      setCourse((c) => ({
        ...c,
        modules: [...c.modules, { ...mod, position: mod.position ?? c.modules.length, lessons: [] }],
      }));
      setNewModuleTitle("");
      setShowAddModule(false);
      setExpandedModules((prev) => new Set([...Array.from(prev), mod.id]));
      setLastSaved(new Date());
      toast({ title: t("editCourse.moduleAdded"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToAddModule"), variant: "error" });
    }
  };

  const updateModule = async (moduleId: string, title: string) => {
    try {
      const result = await apiClient.modules.update(moduleId, { title });
      const mod: any = (result as any).module || result;
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) => (m.id === moduleId ? { ...m, ...mod } : m)),
      }));
      setLastSaved(new Date());
      toast({ title: t("editCourse.moduleUpdated"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToUpdateModule"), variant: "error" });
    } finally {
      setEditingModule(null);
    }
  };

  const deleteModule = async (moduleId: string) => {
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const msg = mod.lessons.length > 0
      ? t("editCourse.deleteModuleWithLessons", { title: mod.title, count: mod.lessons.length })
      : t("editCourse.deleteModuleConfirm", { title: mod.title });
    if (!window.confirm(msg)) return;
    try {
      await apiClient.modules.delete(moduleId);
      setCourse((c) => ({ ...c, modules: c.modules.filter((m) => m.id !== moduleId) }));
      toast({ title: t("editCourse.moduleDeleted"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToDeleteModule"), variant: "error" });
    }
  };

  const moveModule = async (moduleId: string, direction: "up" | "down") => {
    const idx = course.modules.findIndex((m) => m.id === moduleId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= course.modules.length) return;
    // Save snapshot before optimistic update
    const previousModules = [...course.modules];
    const newModules = [...course.modules];
    [newModules[idx], newModules[targetIdx]] = [newModules[targetIdx], newModules[idx]];
    const reordered = newModules.map((m, i) => ({ ...m, position: i }));
    setCourse((c) => ({ ...c, modules: reordered }));
    try {
      await apiClient.courses.reorderModules(course.id, reordered.map((m) => m.id));
      toast({ title: t("editCourse.orderUpdated"), variant: "success" });
    } catch {
      // Restore from snapshot, not stale closure
      setCourse((c) => ({ ...c, modules: previousModules }));
      toast({ title: t("editCourse.failedToReorder"), variant: "error" });
    }
  };

  // ─── Lesson CRUD ───
  const addLesson = async (moduleId: string) => {
    try {
      const mod = course.modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const result = await apiClient.courses.createLesson(course.id, {
        title: t("editCourse.defaultLessonTitle", { number: mod.lessons.length + 1 }),
        position: mod.lessons.length,
        moduleId,
      });
      const lesson: any = (result as any).lesson || result;
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...m.lessons, { ...lesson, position: lesson.position ?? mod.lessons.length }] }
            : m
        ),
      }));
      setEditingLesson(lesson.id);
      setLastSaved(new Date());
      toast({ title: t("editCourse.lessonAdded"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToAddLesson"), variant: "error" });
    }
  };

  const updateLesson = async (lessonId: string, data: { title?: string; videoUrl?: string }) => {
    try {
      const result = await apiClient.lessons.update(lessonId, data);
      const lesson: any = (result as any).lesson || result;
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...lesson } : l)),
        })),
      }));
      setLastSaved(new Date());
      toast({ title: t("editCourse.lessonUpdated"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToUpdateLesson"), variant: "error" });
    }
  };

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!window.confirm(t("editCourse.deleteLessonConfirm"))) return;
    try {
      await apiClient.lessons.delete(lessonId);
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m
        ),
      }));
      toast({ title: t("editCourse.lessonDeleted"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToDeleteLesson"), variant: "error" });
    }
  };

  const moveLesson = async (moduleId: string, lessonId: string, direction: "up" | "down") => {
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= mod.lessons.length) return;
    // Save snapshot before optimistic update
    const previousLessons = [...mod.lessons];
    const newLessons = [...mod.lessons];
    [newLessons[idx], newLessons[targetIdx]] = [newLessons[targetIdx], newLessons[idx]];
    const reordered = newLessons.map((l, i) => ({ ...l, position: i }));
    setCourse((c) => ({
      ...c,
      modules: c.modules.map((m) => (m.id === moduleId ? { ...m, lessons: reordered } : m)),
    }));
    try {
      await apiClient.modules.reorderLessons(moduleId, reordered.map((l) => l.id));
      toast({ title: t("editCourse.orderUpdated"), variant: "success" });
    } catch {
      // Restore from snapshot, not stale closure
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) => (m.id === moduleId ? { ...m, lessons: previousLessons } : m)),
      }));
      toast({ title: t("editCourse.failedToReorder"), variant: "error" });
    }
  };

  // ─── Publish ───
  const publishCourse = async () => {
    // Validate before publishing
    const issues: string[] = [];
    if (!course.title) issues.push(t("editCourse.addCourseTitle"));
    if (!course.coverImage) issues.push(t("editCourse.addCoverImage"));
    if (course.modules.length === 0) issues.push(t("editCourse.addAtLeast1Module"));
    if (totalLessons < 3) issues.push(t("editCourse.addAtLeast3Lessons", { count: totalLessons }));
    if (totalLessons > 0 && lessonsWithVideo < totalLessons) issues.push(t("editCourse.lessonsNeedVideo", { count: totalLessons - lessonsWithVideo }));

    if (issues.length > 0) {
      toast({ title: t("editCourse.cannotPublishYet"), description: issues.join(". "), variant: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.courses.publish(course.id);
      setCourse((c) => ({ ...c, status: "PUBLISHED" }));
      toast({ title: t("editCourse.coursePublished"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToPublish"), variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const unpublishCourse = async () => {
    if (!window.confirm(t("editCourse.unpublishConfirm"))) return;
    setIsLoading(true);
    try {
      await apiClient.courses.unpublish(course.id);
      setCourse((c) => ({ ...c, status: "DRAFT" }));
      toast({ title: t("editCourse.courseUnpublished"), description: t("editCourse.nowInDraftMode"), variant: "success" });
    } catch {
      toast({ title: t("editCourse.failedToUnpublish"), variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const lessonsWithVideo = course.modules.reduce((sum, m) => sum + m.lessons.filter(l => l.videoUrl || l.hlsUrl || l.videoStatus === 'ready').length, 0);
  const allLessonsHaveVideo = totalLessons > 0 && lessonsWithVideo === totalLessons;
  const isReadyToPublish =
    !!course.title &&
    !!course.coverImage &&
    course.modules.length > 0 &&
    totalLessons >= 3 &&
    allLessonsHaveVideo;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/manage-courses" className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 grid place-items-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div>
            <h1 className="text-[20px] font-black text-text-1 tracking-tight">{t("editCourse.pageTitle")}</h1>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">
                {course.status === "PUBLISHED" ? t("courses.published") : t("courses.draft")}
              </span>
              {savingField && <span className="text-[12px] font-extrabold text-primary">{t("common.saving")}</span>}
              {!savingField && lastSavedText && <span className="text-[12px] font-extrabold text-text-3">{lastSavedText}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => window.open(`/manage-courses/${course.id}/preview`, "_blank")} className="h-10 px-3.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)] whitespace-nowrap">
            {t("editCourse.preview")}
          </button>
          {course.status === "PUBLISHED" ? (
            <button onClick={unpublishCourse} disabled={isLoading} className="h-10 px-3.5 rounded-[16px] border border-red-200 dark:border-red-800 bg-white dark:bg-card text-red-600 dark:text-red-400 font-black text-[13px] inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
              {isLoading ? t("editCourse.unpublishing") : t("editCourse.unpublish")}
            </button>
          ) : (
            <button onClick={publishCourse} disabled={isLoading} className={`h-10 px-3.5 rounded-[16px] border font-black text-[13px] inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50 ${isReadyToPublish ? "border-primary/55 bg-primary text-white shadow-[0_16px_34px_rgba(47,111,237,0.22)]" : "border-border/95 bg-white/95 dark:bg-card/95 text-text-2"}`}>
              {isLoading ? t("editCourse.publishing") : t("editCourse.publish")}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0 mt-3">
        {/* Left Panel - Course Details & Curriculum */}
        <div className="rounded-[22px] bg-white/92 dark:bg-card/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">{t("editCourse.courseDetails")}</h2>

          {/* Title */}
          <EditableField label={t("editCourse.titleLabel")} hint={t("editCourse.titleHint")} value={course.title} field="title" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("title", v)} />

          {/* Subtitle */}
          <EditableField label={t("courses.subtitleLabel")} hint={t("editCourse.subtitleHint")} value={course.subtitle || ""} field="subtitle" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("subtitle", v)} placeholder={t("editCourse.addSubtitlePlaceholder")} />

          {/* Cover Image */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{t("editCourse.coverImage")}</div>
              {course.coverImage && !uploadingCover && (
                <button onClick={() => { updateCourseField("coverImage", ""); }} className="text-[11px] font-black text-red-500 hover:underline">{t("editCourse.remove")}</button>
              )}
            </div>
            {/* Hidden file input */}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileSelect} />

            {uploadingCover ? (
              <div className="mt-2 flex flex-col items-center justify-center py-8 border-2 border-dashed border-primary/40 rounded-[16px] bg-primary/5">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <div className="text-[13px] font-black text-text-1">{t("editCourse.uploading")}</div>
                <div className="mt-2 w-40 h-1.5 bg-border/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${coverUploadProgress}%` }} />
                </div>
              </div>
            ) : course.coverImage ? (
              <div
                className="mt-2 relative group cursor-pointer"
                onClick={() => coverInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true); }}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={handleCoverDrop}
              >
                <img src={course.coverImage} alt={t("editCourse.coverImage")} className="w-full h-36 rounded-xl object-cover border border-border/95" />
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-white font-black text-[13px] bg-black/30 px-3 py-1.5 rounded-lg">
                    <Upload className="w-4 h-4" /> {t("editCourse.uploadNewImage")}
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true); }}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={handleCoverDrop}
                className={`mt-2 flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-[16px] cursor-pointer transition-colors ${isDraggingCover ? "border-primary bg-primary/5" : "border-border/95 hover:border-primary/40"}`}
              >
                <div className="w-12 h-12 rounded-[14px] bg-primary/10 grid place-items-center text-primary mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-[13px] font-black text-text-1">{t("editCourse.clickToUploadOrDrag")}</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-1">{t("editCourse.imageRequirements")}</div>
              </div>
            )}
            {/* Also allow URL input */}
            {!uploadingCover && (
              <div className="mt-2">
                {editingField === "coverImage" ? (
                  <div className="space-y-2">
                    <Input defaultValue="" autoFocus placeholder={t("editCourse.pasteImageUrlPlaceholder")}
                      onBlur={(e) => { if (e.target.value.trim()) updateCourseField("coverImage", e.target.value.trim()); setEditingField(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { updateCourseField("coverImage", e.currentTarget.value.trim()); } else if (e.key === "Escape") setEditingField(null); }}
                    />
                  </div>
                ) : (
                  <button onClick={() => setEditingField("coverImage")} className="text-[12px] font-black text-primary hover:underline">
                    {t("editCourse.orPasteImageUrl")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Price / Level / Visibility */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{t("courses.price")}</div>
              {editingField === "price" ? (
                <Input type="number" min="0" step="0.01" defaultValue={course.price} autoFocus className="mt-2"
                  onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== course.price) updateCourseField("price", v); else setEditingField(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = parseFloat(e.currentTarget.value) || 0; if (v !== course.price) updateCourseField("price", v); else setEditingField(null); } else if (e.key === "Escape") setEditingField(null); }}
                />
              ) : (
                <div className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditingField("price")}>
                  {course.price === 0 ? t("courses.free") : `$${course.price}`}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{t("courses.level")}</div>
              {editingField === "level" ? (
                <select defaultValue={course.level} autoFocus className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" onChange={(e) => updateCourseField("level", e.target.value)} onBlur={() => setEditingField(null)}>
                  <option value="BEGINNER">{t("courses.beginner")}</option>
                  <option value="INTERMEDIATE">{t("courses.intermediate")}</option>
                  <option value="ADVANCED">{t("courses.advanced")}</option>
                  <option value="ALL_LEVELS">{t("courses.allLevels")}</option>
                </select>
              ) : (
                <div className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditingField("level")}>
                  {{ BEGINNER: t("courses.beginner"), INTERMEDIATE: t("courses.intermediate"), ADVANCED: t("courses.advanced"), ALL_LEVELS: t("courses.allLevels") }[course.level] || course.level}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{t("editCourse.visibility")}</div>
              <select value={course.status} onChange={(e) => updateCourseField("status", e.target.value)} className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="DRAFT">{t("courses.draft")}</option>
                <option value="PUBLISHED">{t("courses.published")}</option>
                <option value="ARCHIVED">{t("courses.archived")}</option>
              </select>
            </div>
          </div>

          {/* Category / Language */}
          <div className="grid grid-cols-2 gap-2.5">
            <EditableField label={t("courses.category")} value={course.category || ""} field="category" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("category", v)} placeholder={t("editCourse.notSet")} />
            <EditableField label={t("editCourse.language")} value={course.language} field="language" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("language", v)} />
          </div>

          {/* Description */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{t("courses.description")}</div>
            {editingField === "description" ? (
              <textarea defaultValue={course.description || ""} autoFocus className="mt-2 w-full h-24 px-3.5 py-2.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-[13px] font-black text-text-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onBlur={(e) => { if (e.target.value !== (course.description || "")) updateCourseField("description", e.target.value); else setEditingField(null); }}
              />
            ) : (
              <div className="mt-2 text-[13px] font-black text-text-1 cursor-pointer hover:text-primary transition-colors min-h-[40px] flex items-start gap-2" onClick={() => setEditingField("description")}>
                <span className="flex-1">{course.description || t("editCourse.noDescriptionYet")}</span>
                <Pencil className="w-3.5 h-3.5 text-text-3 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* What you'll learn */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{t("editCourse.whatYoullLearn")}</div>
            <div className="mt-1 text-[12px] font-extrabold text-text-3">{t("editCourse.whatYoullLearnHint")}</div>
            {editingField === "whatYouWillLearn" ? (
              <textarea defaultValue={course.whatYouWillLearn || ""} autoFocus className="mt-2 w-full h-28 px-3.5 py-2.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-[13px] font-black text-text-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder={t("editCourse.whatYoullLearnPlaceholder")}
                onBlur={(e) => { if (e.target.value !== (course.whatYouWillLearn || "")) updateCourseField("whatYouWillLearn", e.target.value); else setEditingField(null); }}
              />
            ) : (
              <div className="mt-2 text-[13px] font-black text-text-1 cursor-pointer hover:text-primary transition-colors min-h-[40px] flex items-start gap-2" onClick={() => setEditingField("whatYouWillLearn")}>
                <span className="flex-1 whitespace-pre-line">{course.whatYouWillLearn || t("editCourse.noLearningOutcomesYet")}</span>
                <Pencil className="w-3.5 h-3.5 text-text-3 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* Curriculum Section */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">{t("courses.curriculum")}</h2>
          <div className="rounded-[22px] bg-white/95 dark:bg-card/95 border border-border/95 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-black text-text-1">{t("editCourse.modulesAndLessons")}</div>
              <button onClick={() => setShowAddModule(true)} className="h-9 px-3 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center gap-1.5 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)]">
                <Plus className="w-4 h-4" /> {t("editCourse.addModule")}
              </button>
            </div>

            {/* Modules list */}
            <div className="space-y-2.5 mt-2.5">
              {course.modules.map((mod, moduleIdx) => (
                <div key={mod.id} className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
                  {/* Module header */}
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => toggleModule(mod.id)} className="flex-1 text-left flex items-center gap-2 min-w-0">
                      {editingModule === mod.id ? (
                        <Input defaultValue={mod.title} autoFocus className="h-8 flex-1"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => { if (e.target.value !== mod.title) updateModule(mod.id, e.target.value); else setEditingModule(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { if (e.currentTarget.value !== mod.title) updateModule(mod.id, e.currentTarget.value); else setEditingModule(null); } else if (e.key === "Escape") setEditingModule(null); }}
                        />
                      ) : (
                        <span className="font-black text-text-1 truncate">{mod.title}</span>
                      )}
                      {expandedModules.has(mod.id) ? <ChevronUp className="w-4 h-4 text-text-3 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-3 flex-shrink-0" />}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => moveModule(mod.id, "up")} disabled={moduleIdx === 0} className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center disabled:opacity-30" title={t("editCourse.moveUp")}><ArrowUp className="w-3.5 h-3.5 text-text-3" /></button>
                      <button onClick={() => moveModule(mod.id, "down")} disabled={moduleIdx === course.modules.length - 1} className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center disabled:opacity-30" title={t("editCourse.moveDown")}><ArrowDown className="w-3.5 h-3.5 text-text-3" /></button>
                      <button onClick={() => setEditingModule(mod.id)} className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center" title={t("editCourse.editTitle")}><Pencil className="w-3.5 h-3.5 text-text-3" /></button>
                      <button onClick={() => deleteModule(mod.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 grid place-items-center" title={t("editCourse.deleteModule")}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>

                  {/* Lessons */}
                  {expandedModules.has(mod.id) && (
                    <div className="space-y-2 mt-2">
                      {mod.lessons.map((lesson, lessonIdx) => (
                        <div key={lesson.id} className="rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-[34px] h-[34px] rounded-[14px] border grid place-items-center flex-shrink-0 ${(lesson.videoUrl || lesson.hlsUrl || lesson.videoStatus === 'ready') ? "border-success/30 bg-success/10 text-green-600" : "border-border/95 bg-primary/10 text-primary-600"}`}>
                                {(lesson.videoUrl || lesson.hlsUrl || lesson.videoStatus === 'ready') ? <Play className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                {editingLesson === lesson.id ? (
                                  <Input defaultValue={lesson.title} autoFocus className="h-8"
                                    onBlur={(e) => { if (e.target.value !== lesson.title) updateLesson(lesson.id, { title: e.target.value }); setEditingLesson(null); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") { if (e.currentTarget.value !== lesson.title) updateLesson(lesson.id, { title: e.currentTarget.value }); setEditingLesson(null); } else if (e.key === "Escape") setEditingLesson(null); }}
                                  />
                                ) : (
                                  <span className="text-[13px] font-black text-text-1 truncate block">{lesson.title}</span>
                                )}
                                <div className="mt-0.5 flex items-center gap-2 text-[12px] font-extrabold text-text-3">
                                  {(lesson.videoUrl || lesson.hlsUrl || lesson.videoStatus === 'ready') ? (
                                    <span className="text-green-600">{lesson.videoStatus === 'encoding' ? t("editCourse.encoding") : t("editCourse.videoReady")}</span>
                                  ) : lesson.videoStatus === 'encoding' ? (
                                    <span className="text-blue-500">{t("editCourse.encoding")}</span>
                                  ) : (
                                    <span className="text-amber-600">{t("editCourse.noVideo")}</span>
                                  )}
                                  {lesson.durationSeconds > 0 && <span>&bull; {Math.round(lesson.durationSeconds / 60)} {t("editCourse.min")}</span>}
                                  {lesson.isFreePreview && <span className="text-green-600">&bull; {t("editCourse.freePreview")}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!lesson.videoUrl && !lesson.hlsUrl && lesson.videoStatus !== 'ready' && lesson.videoStatus !== 'encoding' && !lesson.isFreePreview && <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-warning/14 text-amber-700 border border-warning/22">{t("editCourse.needsVideo")}</span>}
                              <button onClick={() => moveLesson(mod.id, lesson.id, "up")} disabled={lessonIdx === 0} className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center disabled:opacity-30" title={t("editCourse.moveUp")}><ArrowUp className="w-3 h-3 text-text-3" /></button>
                              <button onClick={() => moveLesson(mod.id, lesson.id, "down")} disabled={lessonIdx === mod.lessons.length - 1} className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center disabled:opacity-30" title={t("editCourse.moveDown")}><ArrowDown className="w-3 h-3 text-text-3" /></button>
                              <button onClick={() => setEditingLesson(lesson.id)} className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center" title={t("editCourse.rename")}><Pencil className="w-3 h-3 text-text-3" /></button>
                              <button onClick={() => deleteLesson(lesson.id, mod.id)} className="w-6 h-6 rounded-md hover:bg-red-50 dark:hover:bg-red-950 grid place-items-center" title={t("editCourse.deleteLesson")}><Trash2 className="w-3 h-3 text-red-400" /></button>
                            </div>
                          </div>
                          {/* Edit lesson button - prominent link to lesson editor for video, resources etc. */}
                          <Link
                            to={`/manage-courses/${course.id}/lessons/${lesson.id}/edit`}
                            className="mt-2 w-full h-8 rounded-[12px] border border-primary/20 bg-primary/5 text-primary font-black text-[12px] inline-flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            {(lesson.videoUrl || lesson.hlsUrl || lesson.videoStatus === 'ready') ? t("editCourse.editVideoResources") : t("editCourse.addVideoResources")}
                          </Link>
                        </div>
                      ))}
                      <button onClick={() => addLesson(mod.id)} className="w-full h-9 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-2 font-black text-[13px] inline-flex items-center justify-center gap-1.5">
                        <Plus className="w-4 h-4" /> {t("editCourse.addLesson")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Module Input */}
            {showAddModule && (
              <div className="flex items-center gap-2 mt-2.5">
                <Input placeholder={t("editCourse.newModuleTitlePlaceholder")} value={newModuleTitle} autoFocus onChange={(e) => setNewModuleTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addModule(); if (e.key === "Escape") { setNewModuleTitle(""); setShowAddModule(false); } }}
                  className="flex-1"
                />
                <button onClick={addModule} disabled={!newModuleTitle.trim()} className="h-10 px-3 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] disabled:opacity-50">{t("editCourse.add")}</button>
                <button onClick={() => { setNewModuleTitle(""); setShowAddModule(false); }} className="h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-2 font-black text-[13px]">{t("common.cancel")}</button>
              </div>
            )}

            {course.modules.length === 0 && !showAddModule && (
              <div className="text-center py-6 text-text-3 text-[13px] font-black">{t("editCourse.noModulesYet")}</div>
            )}
          </div>
        </div>

        {/* Right Panel - Checklist & Actions */}
        <div className="rounded-[22px] bg-white/92 dark:bg-card/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)] p-3.5 min-w-0 flex flex-col gap-3">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">{t("editCourse.publishChecklist")}</h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="font-black text-text-1">{t("editCourse.readyToPublish")}</div>
            <div className="mt-1.5 text-[12px] font-extrabold text-text-3">{t("editCourse.completeChecklistHint")}</div>
            <ChecklistItem label={t("editCourse.checkTitleAndCover")} hint={course.title && course.coverImage ? t("editCourse.looksGood") : !course.title ? t("editCourse.addATitle") : t("editCourse.addACoverImage")} checked={!!course.title && !!course.coverImage} />
            <ChecklistItem label={t("editCourse.checkAtLeast1Module")} hint={course.modules.length > 0 ? t("editCourse.modulesAdded", { count: course.modules.length }) : t("editCourse.addAModule")} checked={course.modules.length > 0} />
            <ChecklistItem label={t("editCourse.checkAtLeast3Lessons")} hint={totalLessons >= 3 ? t("editCourse.lessonsAdded", { count: totalLessons }) : t("editCourse.addMoreLessons", { count: 3 - totalLessons })} checked={totalLessons >= 3} />
            <ChecklistItem label={t("editCourse.checkLessonsHaveVideos")} hint={totalLessons === 0 ? t("editCourse.addLessonsFirst") : lessonsWithVideo === totalLessons ? t("editCourse.allLessonsReady", { count: totalLessons }) : t("editCourse.lessonsHaveVideo", { done: lessonsWithVideo, total: totalLessons })} checked={totalLessons > 0 && lessonsWithVideo === totalLessons} />
            <ChecklistItem label={t("editCourse.checkPricingConfigured")} hint={course.price > 0 ? `$${course.price}` : t("editCourse.setPriceOrFree")} checked={course.price >= 0} />
          </div>

          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">{t("editCourse.howItWorks")}</h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 dark:bg-card/95 p-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-[11px] grid place-items-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <div className="font-black text-text-1 text-[13px]">{t("editCourse.step1Title")}</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-0.5">{t("editCourse.step1Desc")}</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-[11px] grid place-items-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <div className="font-black text-text-1 text-[13px]">{t("editCourse.step2Title")}</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-0.5">{t("editCourse.step2Desc")}</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-[11px] grid place-items-center flex-shrink-0 mt-0.5">3</div>
              <div>
                <div className="font-black text-text-1 text-[13px]">{t("editCourse.step3Title")}</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-0.5">{t("editCourse.step3Desc")}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5">
            {course.status === "PUBLISHED" ? (
              <button onClick={unpublishCourse} disabled={isLoading} className="h-10 rounded-[16px] border border-red-200 dark:border-red-800 bg-white dark:bg-card text-red-600 dark:text-red-400 font-black text-[13px] inline-flex items-center justify-center disabled:opacity-50 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                {isLoading ? t("editCourse.unpublishing") : t("editCourse.unpublishCourse")}
              </button>
            ) : (
              <button onClick={publishCourse} disabled={isLoading} className={`h-10 rounded-[16px] border font-black text-[13px] inline-flex items-center justify-center disabled:opacity-50 ${isReadyToPublish ? "border-primary/55 bg-primary text-white shadow-[0_16px_34px_rgba(47,111,237,0.22)]" : "border-border/95 bg-white/95 dark:bg-card/95 text-text-2"}`}>
                {isReadyToPublish ? t("editCourse.publishNow") : t("editCourse.completeChecklistToPublish")}
              </button>
            )}
          </div>

          <h2 className="mt-auto text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">{t("editCourse.status")}</h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="flex items-center justify-between">
              <div className="font-black text-text-1">{course.status === "PUBLISHED" ? t("courses.published") : t("courses.draft")}</div>
              <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">
                {course.status === "PUBLISHED" ? t("editCourse.public") : t("editCourse.notPublic")}
              </span>
            </div>
            <div className="mt-2 text-[12px] font-extrabold text-text-3 leading-relaxed">
              {course.status === "PUBLISHED" ? t("editCourse.courseIsLive") : t("editCourse.courseIsPreview")}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Reusable editable field component ──

function EditableField({ label, hint, value, field, editingField, setEditingField, onSave, placeholder }: {
  label: string;
  hint?: string;
  value: string;
  field: string;
  editingField: string | null;
  setEditingField: (f: string | null) => void;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
      <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{label}</div>
      {editingField === field ? (
        <Input defaultValue={value} autoFocus className="mt-2"
          onBlur={(e) => { if (e.target.value !== value) onSave(e.target.value); else setEditingField(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { if (e.currentTarget.value !== value) onSave(e.currentTarget.value); else setEditingField(null); } else if (e.key === "Escape") setEditingField(null); }}
        />
      ) : (
        <div className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditingField(field)}>
          {value || placeholder || t("editCourse.notSet")}
          <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
        </div>
      )}
      {hint && <div className="mt-1.5 text-[12px] font-extrabold text-text-3">{hint}</div>}
    </div>
  );
}

// ── Checklist item ──

function ChecklistItem({ label, hint, checked }: { label: string; hint: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 mt-2">
      <div className={`w-[18px] h-[18px] rounded-full border-2 grid place-items-center flex-shrink-0 ${checked ? "border-success/65 bg-success/14" : "border-text-3/55"}`}>
        {checked && (
          <svg viewBox="0 0 10 8" width="7" height="4" className="text-text-1/65">
            <path d="M1 4l2 2 6-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div>
        <div className="text-[13px] font-black text-text-1">{label}</div>
        <div className="mt-1 text-[12px] font-extrabold text-text-3">{hint}</div>
      </div>
    </div>
  );
}
