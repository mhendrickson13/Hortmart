import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { courses as coursesApi, apiClient, uploads as uploadsApi } from "@/lib/api-client";
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
  durationSeconds: number;
  isLocked: boolean;
  isFreePreview: boolean;
  position: number;
}

// ── Page Wrapper ──

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
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
        <p className="text-text-2 text-body">Course not found.</p>
        <Link to="/manage-courses" className="text-primary font-bold text-body-sm">Back to courses</Link>
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
        durationSeconds: les.durationSeconds ?? 0,
        isLocked: les.isLocked ?? false,
        isFreePreview: les.isFreePreview ?? false,
        position: les.position ?? 0,
      })),
    })),
  };

  return <CourseEditor course={editorCourse} />;
}

// ── Course Editor ──

function CourseEditor({ course: initialCourse }: { course: EditorCourse }) {
  const navigate = useNavigate();
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

  const lastSavedText = lastSaved
    ? (() => {
        const mins = Math.round((Date.now() - lastSaved.getTime()) / 60000);
        if (mins < 1) return "Auto-saved just now";
        return `Auto-saved ${mins} min ago`;
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
        toast({ title: "Please select an image file", variant: "error" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Image must be under 10MB", variant: "error" });
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
        toast({ title: "Cover image uploaded", variant: "success" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message || "Try again", variant: "error" });
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
        toast({ title: "Saved", variant: "success" });
      } catch {
        toast({ title: "Failed to save", variant: "error" });
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
      toast({ title: "Module added", variant: "success" });
    } catch {
      toast({ title: "Failed to add module", variant: "error" });
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
      toast({ title: "Module updated", variant: "success" });
    } catch {
      toast({ title: "Failed to update module", variant: "error" });
    } finally {
      setEditingModule(null);
    }
  };

  const deleteModule = async (moduleId: string) => {
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const msg = mod.lessons.length > 0
      ? `Delete "${mod.title}" and its ${mod.lessons.length} lesson(s)?`
      : `Delete "${mod.title}"?`;
    if (!window.confirm(msg)) return;
    try {
      await apiClient.modules.delete(moduleId);
      setCourse((c) => ({ ...c, modules: c.modules.filter((m) => m.id !== moduleId) }));
      toast({ title: "Module deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete module", variant: "error" });
    }
  };

  const moveModule = async (moduleId: string, direction: "up" | "down") => {
    const idx = course.modules.findIndex((m) => m.id === moduleId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= course.modules.length) return;
    const newModules = [...course.modules];
    [newModules[idx], newModules[targetIdx]] = [newModules[targetIdx], newModules[idx]];
    const reordered = newModules.map((m, i) => ({ ...m, position: i }));
    setCourse((c) => ({ ...c, modules: reordered }));
    try {
      await apiClient.courses.reorderModules(course.id, reordered.map((m) => m.id));
    } catch {
      setCourse((c) => ({ ...c, modules: course.modules }));
      toast({ title: "Failed to reorder", variant: "error" });
    }
  };

  // ─── Lesson CRUD ───
  const addLesson = async (moduleId: string) => {
    try {
      const mod = course.modules.find((m) => m.id === moduleId);
      if (!mod) return;
      const result = await apiClient.courses.createLesson(course.id, {
        title: `Lesson ${mod.lessons.length + 1}`,
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
      toast({ title: "Lesson added", variant: "success" });
    } catch {
      toast({ title: "Failed to add lesson", variant: "error" });
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
      toast({ title: "Lesson updated", variant: "success" });
    } catch {
      toast({ title: "Failed to update lesson", variant: "error" });
    }
  };

  const deleteLesson = async (lessonId: string, moduleId: string) => {
    if (!window.confirm("Delete this lesson?")) return;
    try {
      await apiClient.lessons.delete(lessonId);
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m
        ),
      }));
      toast({ title: "Lesson deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete lesson", variant: "error" });
    }
  };

  const moveLesson = async (moduleId: string, lessonId: string, direction: "up" | "down") => {
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= mod.lessons.length) return;
    const newLessons = [...mod.lessons];
    [newLessons[idx], newLessons[targetIdx]] = [newLessons[targetIdx], newLessons[idx]];
    const reordered = newLessons.map((l, i) => ({ ...l, position: i }));
    setCourse((c) => ({
      ...c,
      modules: c.modules.map((m) => (m.id === moduleId ? { ...m, lessons: reordered } : m)),
    }));
    try {
      await apiClient.modules.reorderLessons(moduleId, reordered.map((l) => l.id));
    } catch {
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) => (m.id === moduleId ? { ...m, lessons: mod.lessons } : m)),
      }));
      toast({ title: "Failed to reorder", variant: "error" });
    }
  };

  // ─── Publish ───
  const publishCourse = async () => {
    // Validate before publishing
    const issues: string[] = [];
    if (!course.title) issues.push("Add a course title");
    if (!course.coverImage) issues.push("Add a cover image");
    if (course.modules.length === 0) issues.push("Add at least 1 module");
    if (totalLessons < 3) issues.push(`Add at least 3 lessons (currently ${totalLessons})`);
    if (totalLessons > 0 && lessonsWithVideo < totalLessons) issues.push(`${totalLessons - lessonsWithVideo} lesson(s) still need a video`);

    if (issues.length > 0) {
      toast({ title: "Cannot publish yet", description: issues.join(". "), variant: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.courses.publish(course.id);
      setCourse((c) => ({ ...c, status: "PUBLISHED" }));
      toast({ title: "Course published!", variant: "success" });
    } catch {
      toast({ title: "Failed to publish course", variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const lessonsWithVideo = course.modules.reduce((sum, m) => sum + m.lessons.filter(l => l.videoUrl).length, 0);
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
          <Link to="/manage-courses" className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 grid place-items-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div>
            <h1 className="text-[20px] font-black text-text-1 tracking-tight">Edit course</h1>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">
                {course.status === "PUBLISHED" ? "Published" : "Draft"}
              </span>
              {savingField && <span className="text-[12px] font-extrabold text-primary">Saving...</span>}
              {!savingField && lastSavedText && <span className="text-[12px] font-extrabold text-text-3">{lastSavedText}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => window.open(`/course/${course.id}`, "_blank")} className="h-10 px-3.5 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] whitespace-nowrap">
            Preview
          </button>
          <button onClick={publishCourse} disabled={isLoading || course.status === "PUBLISHED"} className={`h-10 px-3.5 rounded-[16px] border font-black text-[13px] inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50 ${isReadyToPublish && course.status !== "PUBLISHED" ? "border-primary/55 bg-primary text-white shadow-[0_16px_34px_rgba(47,111,237,0.22)]" : "border-border/95 bg-white/95 text-text-2"}`}>
            {isLoading ? "Publishing..." : course.status === "PUBLISHED" ? "Published" : "Publish"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0 mt-3">
        {/* Left Panel - Course Details & Curriculum */}
        <div className="rounded-[22px] bg-white/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Course details</h2>

          {/* Title */}
          <EditableField label="Title" hint="Short, searchable, benefit-focused." value={course.title} field="title" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("title", v)} />

          {/* Subtitle */}
          <EditableField label="Subtitle" hint="A longer tagline shown below the title." value={course.subtitle || ""} field="subtitle" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("subtitle", v)} placeholder="Add a subtitle..." />

          {/* Cover Image */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Cover Image</div>
              {course.coverImage && !uploadingCover && (
                <button onClick={() => { updateCourseField("coverImage", ""); }} className="text-[11px] font-black text-red-500 hover:underline">Remove</button>
              )}
            </div>
            {/* Hidden file input */}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileSelect} />

            {uploadingCover ? (
              <div className="mt-2 flex flex-col items-center justify-center py-8 border-2 border-dashed border-primary/40 rounded-[16px] bg-primary/5">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <div className="text-[13px] font-black text-text-1">Uploading...</div>
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
                <img src={course.coverImage} alt="Cover" className="w-full h-36 rounded-xl object-cover border border-border/95" />
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-white font-black text-[13px] bg-black/30 px-3 py-1.5 rounded-lg">
                    <Upload className="w-4 h-4" /> Upload new image
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
                <div className="text-[13px] font-black text-text-1">Click to upload or drag & drop</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-1">JPG, PNG, WebP &bull; Max 10MB &bull; 16:9 recommended</div>
              </div>
            )}
            {/* Also allow URL input */}
            {!uploadingCover && (
              <div className="mt-2">
                {editingField === "coverImage" ? (
                  <div className="space-y-2">
                    <Input defaultValue="" autoFocus placeholder="Or paste an image URL (https://...)"
                      onBlur={(e) => { if (e.target.value.trim()) updateCourseField("coverImage", e.target.value.trim()); setEditingField(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.currentTarget.value.trim()) { updateCourseField("coverImage", e.currentTarget.value.trim()); } else if (e.key === "Escape") setEditingField(null); }}
                    />
                  </div>
                ) : (
                  <button onClick={() => setEditingField("coverImage")} className="text-[12px] font-black text-primary hover:underline">
                    Or paste an image URL
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Price / Level / Visibility */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Price</div>
              {editingField === "price" ? (
                <Input type="number" min="0" step="0.01" defaultValue={course.price} autoFocus className="mt-2"
                  onBlur={(e) => { const v = parseFloat(e.target.value) || 0; if (v !== course.price) updateCourseField("price", v); else setEditingField(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { const v = parseFloat(e.currentTarget.value) || 0; if (v !== course.price) updateCourseField("price", v); else setEditingField(null); } else if (e.key === "Escape") setEditingField(null); }}
                />
              ) : (
                <div className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditingField("price")}>
                  {course.price === 0 ? "Free" : `$${course.price}`}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Level</div>
              {editingField === "level" ? (
                <select defaultValue={course.level} autoFocus className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" onChange={(e) => updateCourseField("level", e.target.value)} onBlur={() => setEditingField(null)}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </select>
              ) : (
                <div className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditingField("level")}>
                  {course.level.replace("_", " ")}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Visibility</div>
              <select value={course.status} onChange={(e) => updateCourseField("status", e.target.value)} className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Category / Language */}
          <div className="grid grid-cols-2 gap-2.5">
            <EditableField label="Category" value={course.category || ""} field="category" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("category", v)} placeholder="Not set" />
            <EditableField label="Language" value={course.language} field="language" editingField={editingField} setEditingField={setEditingField} onSave={(v) => updateCourseField("language", v)} />
          </div>

          {/* Description */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Description</div>
            {editingField === "description" ? (
              <textarea defaultValue={course.description || ""} autoFocus className="mt-2 w-full h-24 px-3.5 py-2.5 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onBlur={(e) => { if (e.target.value !== (course.description || "")) updateCourseField("description", e.target.value); else setEditingField(null); }}
              />
            ) : (
              <div className="mt-2 text-[13px] font-black text-text-1 cursor-pointer hover:text-primary transition-colors min-h-[40px] flex items-start gap-2" onClick={() => setEditingField("description")}>
                <span className="flex-1">{course.description || "No description yet. Click to add."}</span>
                <Pencil className="w-3.5 h-3.5 text-text-3 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* What you'll learn */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">What you&apos;ll learn</div>
            <div className="mt-1 text-[12px] font-extrabold text-text-3">One learning outcome per line. Shown on the course page.</div>
            {editingField === "whatYouWillLearn" ? (
              <textarea defaultValue={course.whatYouWillLearn || ""} autoFocus className="mt-2 w-full h-28 px-3.5 py-2.5 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder={"Build full-stack apps with React\nDeploy to AWS Lambda\nManage MySQL databases"}
                onBlur={(e) => { if (e.target.value !== (course.whatYouWillLearn || "")) updateCourseField("whatYouWillLearn", e.target.value); else setEditingField(null); }}
              />
            ) : (
              <div className="mt-2 text-[13px] font-black text-text-1 cursor-pointer hover:text-primary transition-colors min-h-[40px] flex items-start gap-2" onClick={() => setEditingField("whatYouWillLearn")}>
                <span className="flex-1 whitespace-pre-line">{course.whatYouWillLearn || "No learning outcomes yet. Click to add."}</span>
                <Pencil className="w-3.5 h-3.5 text-text-3 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* Curriculum Section */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Curriculum</h2>
          <div className="rounded-[22px] bg-white/95 border border-border/95 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-black text-text-1">Modules &amp; lessons</div>
              <button onClick={() => setShowAddModule(true)} className="h-9 px-3 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center gap-1.5 shadow-[0_14px_28px_rgba(21,25,35,0.06)]">
                <Plus className="w-4 h-4" /> Add module
              </button>
            </div>

            {/* Modules list */}
            <div className="space-y-2.5 mt-2.5">
              {course.modules.map((mod, moduleIdx) => (
                <div key={mod.id} className="rounded-[18px] border border-border/95 bg-white/95 p-3">
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
                      <button onClick={() => moveModule(mod.id, "up")} disabled={moduleIdx === 0} className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center disabled:opacity-30" title="Move up"><ArrowUp className="w-3.5 h-3.5 text-text-3" /></button>
                      <button onClick={() => moveModule(mod.id, "down")} disabled={moduleIdx === course.modules.length - 1} className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center disabled:opacity-30" title="Move down"><ArrowDown className="w-3.5 h-3.5 text-text-3" /></button>
                      <button onClick={() => setEditingModule(mod.id)} className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center" title="Edit title"><Pencil className="w-3.5 h-3.5 text-text-3" /></button>
                      <button onClick={() => deleteModule(mod.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 grid place-items-center" title="Delete module"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>

                  {/* Lessons */}
                  {expandedModules.has(mod.id) && (
                    <div className="space-y-2 mt-2">
                      {mod.lessons.map((lesson, lessonIdx) => (
                        <div key={lesson.id} className="rounded-[16px] border border-border/95 bg-white/95 p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-[34px] h-[34px] rounded-[14px] border grid place-items-center flex-shrink-0 ${lesson.videoUrl ? "border-success/30 bg-success/10 text-green-600" : "border-border/95 bg-primary/10 text-primary-600"}`}>
                                {lesson.videoUrl ? <Play className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
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
                                  {lesson.videoUrl ? (
                                    <span className="text-green-600">Video ready</span>
                                  ) : (
                                    <span className="text-amber-600">No video</span>
                                  )}
                                  {lesson.durationSeconds > 0 && <span>&bull; {Math.round(lesson.durationSeconds / 60)} min</span>}
                                  {lesson.isFreePreview && <span className="text-green-600">&bull; Free preview</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!lesson.videoUrl && !lesson.isFreePreview && <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-warning/14 text-amber-700 border border-warning/22">NEEDS VIDEO</span>}
                              <button onClick={() => moveLesson(mod.id, lesson.id, "up")} disabled={lessonIdx === 0} className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center disabled:opacity-30" title="Move up"><ArrowUp className="w-3 h-3 text-text-3" /></button>
                              <button onClick={() => moveLesson(mod.id, lesson.id, "down")} disabled={lessonIdx === mod.lessons.length - 1} className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center disabled:opacity-30" title="Move down"><ArrowDown className="w-3 h-3 text-text-3" /></button>
                              <button onClick={() => setEditingLesson(lesson.id)} className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center" title="Rename"><Pencil className="w-3 h-3 text-text-3" /></button>
                              <button onClick={() => deleteLesson(lesson.id, mod.id)} className="w-6 h-6 rounded-md hover:bg-red-50 grid place-items-center" title="Delete lesson"><Trash2 className="w-3 h-3 text-red-400" /></button>
                            </div>
                          </div>
                          {/* Edit lesson button - prominent link to lesson editor for video, resources etc. */}
                          <Link
                            to={`/manage-courses/${course.id}/lessons/${lesson.id}/edit`}
                            className="mt-2 w-full h-8 rounded-[12px] border border-primary/20 bg-primary/5 text-primary font-black text-[12px] inline-flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            {lesson.videoUrl ? "Edit video, resources & settings" : "Add video, resources & settings"}
                          </Link>
                        </div>
                      ))}
                      <button onClick={() => addLesson(mod.id)} className="w-full h-9 rounded-[16px] border border-border/95 bg-white/95 text-text-2 font-black text-[13px] inline-flex items-center justify-center gap-1.5">
                        <Plus className="w-4 h-4" /> Add lesson
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Module Input */}
            {showAddModule && (
              <div className="flex items-center gap-2 mt-2.5">
                <Input placeholder="New module title..." value={newModuleTitle} autoFocus onChange={(e) => setNewModuleTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addModule(); if (e.key === "Escape") { setNewModuleTitle(""); setShowAddModule(false); } }}
                  className="flex-1"
                />
                <button onClick={addModule} disabled={!newModuleTitle.trim()} className="h-10 px-3 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] disabled:opacity-50">Add</button>
                <button onClick={() => { setNewModuleTitle(""); setShowAddModule(false); }} className="h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 text-text-2 font-black text-[13px]">Cancel</button>
              </div>
            )}

            {course.modules.length === 0 && !showAddModule && (
              <div className="text-center py-6 text-text-3 text-[13px] font-black">No modules yet. Click &quot;Add module&quot; to get started.</div>
            )}
          </div>
        </div>

        {/* Right Panel - Checklist & Actions */}
        <div className="rounded-[22px] bg-white/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] p-3.5 min-w-0 flex flex-col gap-3">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Publish checklist</h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3">
            <div className="font-black text-text-1">Ready to publish?</div>
            <div className="mt-1.5 text-[12px] font-extrabold text-text-3">Complete these items to enable publishing.</div>
            <ChecklistItem label="Title & cover image" hint={course.title && course.coverImage ? "Looks good" : !course.title ? "Add a title" : "Add a cover image"} checked={!!course.title && !!course.coverImage} />
            <ChecklistItem label="At least 1 module" hint={course.modules.length > 0 ? `${course.modules.length} modules added` : "Add a module"} checked={course.modules.length > 0} />
            <ChecklistItem label="At least 3 lessons" hint={totalLessons >= 3 ? `${totalLessons} lessons added` : `Add ${3 - totalLessons} more lesson${3 - totalLessons !== 1 ? "s" : ""}`} checked={totalLessons >= 3} />
            <ChecklistItem label="Lessons have videos" hint={totalLessons === 0 ? "Add lessons first" : lessonsWithVideo === totalLessons ? `All ${totalLessons} lessons ready` : `${lessonsWithVideo}/${totalLessons} lessons have video`} checked={totalLessons > 0 && lessonsWithVideo === totalLessons} />
            <ChecklistItem label="Pricing configured" hint={course.price > 0 ? `$${course.price}` : "Set price or mark free"} checked={course.price >= 0} />
          </div>

          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">How it works</h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-[11px] grid place-items-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <div className="font-black text-text-1 text-[13px]">Add modules & lessons</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-0.5">Create the course structure in the curriculum below.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-[11px] grid place-items-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <div className="font-black text-text-1 text-[13px]">Edit each lesson</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-0.5">Click the blue button on each lesson to set its video URL, add downloadable resources (PDFs, links), and configure settings.</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-[11px] grid place-items-center flex-shrink-0 mt-0.5">3</div>
              <div>
                <div className="font-black text-text-1 text-[13px]">Publish</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-0.5">Once all lessons have videos, publish the course to make it visible.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5">
            <button onClick={publishCourse} disabled={isLoading || course.status === "PUBLISHED"} className={`h-10 rounded-[16px] border font-black text-[13px] inline-flex items-center justify-center disabled:opacity-50 ${isReadyToPublish && course.status !== "PUBLISHED" ? "border-primary/55 bg-primary text-white shadow-[0_16px_34px_rgba(47,111,237,0.22)]" : "border-border/95 bg-white/95 text-text-2"}`}>
              {course.status === "PUBLISHED" ? "Already published" : isReadyToPublish ? "Publish now" : "Complete checklist to publish"}
            </button>
          </div>

          <h2 className="mt-auto text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Status</h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3">
            <div className="flex items-center justify-between">
              <div className="font-black text-text-1">{course.status === "PUBLISHED" ? "Published" : "Draft"}</div>
              <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">
                {course.status === "PUBLISHED" ? "Public" : "Not public"}
              </span>
            </div>
            <div className="mt-2 text-[12px] font-extrabold text-text-3 leading-relaxed">
              {course.status === "PUBLISHED" ? "Course is live and visible to learners." : "Preview is available. Publishing will make the course visible to learners."}
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
  return (
    <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
      <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">{label}</div>
      {editingField === field ? (
        <Input defaultValue={value} autoFocus className="mt-2"
          onBlur={(e) => { if (e.target.value !== value) onSave(e.target.value); else setEditingField(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { if (e.currentTarget.value !== value) onSave(e.currentTarget.value); else setEditingField(null); } else if (e.key === "Escape") setEditingField(null); }}
        />
      ) : (
        <div className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditingField(field)}>
          {value || placeholder || "Not set"}
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
    <div className="flex items-center gap-2.5 p-2.5 rounded-[16px] border border-border/95 bg-white/95 mt-2">
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
