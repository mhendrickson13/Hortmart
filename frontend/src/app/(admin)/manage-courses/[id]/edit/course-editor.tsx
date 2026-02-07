"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api-client";
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
  FileText,
  ExternalLink,
} from "lucide-react";

interface CourseEditorProps {
  course: {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    status: string;
    price: number;
    level: string;
    category: string | null;
    language: string;
    modules: Array<{
      id: string;
      title: string;
      position: number;
      lessons: Array<{
        id: string;
        title: string;
        description: string | null;
        videoUrl: string | null;
        durationSeconds: number;
        isLocked: boolean;
        isFreePreview: boolean;
        position: number;
      }>;
    }>;
  };
}

export function CourseEditor({ course: initialCourse }: CourseEditorProps) {
  const router = useRouter();
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

  // Update relative time display every minute
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
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // ─── Course field updates ───
  const updateCourseField = useCallback(
    async (field: string, value: string | number) => {
      setSavingField(field);
      try {
        const result = await apiClient.courses.update(course.id, {
          [field]: value,
        });
        const updated = result.course || result;
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

      const mod = result.module || result;
      setCourse((c) => ({
        ...c,
        modules: [
          ...c.modules,
          {
            ...mod,
            position: mod.position ?? c.modules.length,
            lessons: [],
          },
        ],
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
      const mod = result.module || result;
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId ? { ...m, ...mod } : m
        ),
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
    if (
      mod.lessons.length > 0 &&
      !window.confirm(
        `Delete "${mod.title}" and its ${mod.lessons.length} lesson(s)?`
      )
    )
      return;
    if (mod.lessons.length === 0 && !window.confirm(`Delete "${mod.title}"?`))
      return;

    try {
      await apiClient.modules.delete(moduleId);
      setCourse((c) => ({
        ...c,
        modules: c.modules.filter((m) => m.id !== moduleId),
      }));
      toast({ title: "Module deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete module", variant: "error" });
    }
  };

  // ─── Module reordering ───
  const moveModule = async (moduleId: string, direction: "up" | "down") => {
    const idx = course.modules.findIndex((m) => m.id === moduleId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= course.modules.length) return;

    const newModules = [...course.modules];
    [newModules[idx], newModules[targetIdx]] = [
      newModules[targetIdx],
      newModules[idx],
    ];
    // Update positions
    const reordered = newModules.map((m, i) => ({ ...m, position: i }));
    setCourse((c) => ({ ...c, modules: reordered }));

    try {
      await apiClient.courses.reorderModules(
        course.id,
        reordered.map((m) => m.id)
      );
    } catch {
      // revert on error
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

      const lesson = result.lesson || result;
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: [
                  ...m.lessons,
                  {
                    ...lesson,
                    position: lesson.position ?? mod.lessons.length,
                  },
                ],
              }
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

  const updateLesson = async (
    lessonId: string,
    data: { title?: string; videoUrl?: string }
  ) => {
    try {
      const result = await apiClient.lessons.update(lessonId, data);
      const lesson = result.lesson || result;
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) =>
            l.id === lessonId ? { ...l, ...lesson } : l
          ),
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
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
            : m
        ),
      }));
      toast({ title: "Lesson deleted", variant: "success" });
    } catch {
      toast({ title: "Failed to delete lesson", variant: "error" });
    }
  };

  // ─── Lesson reordering ───
  const moveLesson = async (
    moduleId: string,
    lessonId: string,
    direction: "up" | "down"
  ) => {
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= mod.lessons.length) return;

    const newLessons = [...mod.lessons];
    [newLessons[idx], newLessons[targetIdx]] = [
      newLessons[targetIdx],
      newLessons[idx],
    ];
    const reordered = newLessons.map((l, i) => ({ ...l, position: i }));
    setCourse((c) => ({
      ...c,
      modules: c.modules.map((m) =>
        m.id === moduleId ? { ...m, lessons: reordered } : m
      ),
    }));

    try {
      await apiClient.modules.reorderLessons(
        moduleId,
        reordered.map((l) => l.id)
      );
    } catch {
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId ? { ...m, lessons: mod.lessons } : m
        ),
      }));
      toast({ title: "Failed to reorder", variant: "error" });
    }
  };

  // ─── Publish ───
  const publishCourse = async () => {
    setIsLoading(true);
    try {
      await apiClient.courses.publish(course.id);
      setCourse((c) => ({ ...c, status: "PUBLISHED" }));
      toast({ title: "Course published!", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Failed to publish course", variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );
  const hasContent = course.modules.length > 0 && totalLessons > 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-black text-text-1 tracking-tight">
            Edit course
          </h1>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">
              {course.status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
            {savingField && (
              <span className="text-[12px] font-extrabold text-primary">
                Saving...
              </span>
            )}
            {!savingField && lastSavedText && (
              <span className="text-[12px] font-extrabold text-text-3">
                {lastSavedText}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.open(`/course/${course.id}`, "_blank")}
            className="h-10 px-3.5 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] whitespace-nowrap"
          >
            Preview
          </button>
          <button
            onClick={publishCourse}
            disabled={!hasContent || isLoading || course.status === "PUBLISHED"}
            className="h-10 px-3.5 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] inline-flex items-center gap-2 shadow-[0_16px_34px_rgba(47,111,237,0.22)] whitespace-nowrap disabled:opacity-50"
          >
            {isLoading
              ? "Publishing..."
              : course.status === "PUBLISHED"
              ? "Published"
              : "Publish"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0">
        {/* Left Panel */}
        <div className="rounded-[22px] bg-white/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Course details
          </h2>

          {/* Title field - editable */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
              Title
            </div>
            {editingField === "title" ? (
              <Input
                defaultValue={course.title}
                autoFocus
                className="mt-2"
                onBlur={(e) => {
                  if (e.target.value !== course.title) {
                    updateCourseField("title", e.target.value);
                  } else {
                    setEditingField(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.currentTarget.value !== course.title) {
                      updateCourseField("title", e.currentTarget.value);
                    } else {
                      setEditingField(null);
                    }
                  } else if (e.key === "Escape") {
                    setEditingField(null);
                  }
                }}
              />
            ) : (
              <div
                className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setEditingField("title")}
              >
                {course.title}
                <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
              </div>
            )}
            <div className="mt-1.5 text-[12px] font-extrabold text-text-3">
              Short, searchable, benefit-focused.
            </div>
          </div>

          {/* Price, Level, and Visibility row */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                Price
              </div>
              {editingField === "price" ? (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={course.price}
                  autoFocus
                  className="mt-2"
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (val !== course.price) {
                      updateCourseField("price", val);
                    } else {
                      setEditingField(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = parseFloat(e.currentTarget.value) || 0;
                      if (val !== course.price) {
                        updateCourseField("price", val);
                      } else {
                        setEditingField(null);
                      }
                    } else if (e.key === "Escape") {
                      setEditingField(null);
                    }
                  }}
                />
              ) : (
                <div
                  className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setEditingField("price")}
                >
                  {course.price === 0 ? "Free" : `$${course.price}`}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                Level
              </div>
              {editingField === "level" ? (
                <select
                  defaultValue={course.level}
                  autoFocus
                  className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  onChange={(e) => updateCourseField("level", e.target.value)}
                  onBlur={() => setEditingField(null)}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </select>
              ) : (
                <div
                  className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setEditingField("level")}
                >
                  {course.level.replace("_", " ")}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                Visibility
              </div>
              <select
                value={course.status}
                onChange={(e) => updateCourseField("status", e.target.value)}
                className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Category and Language row - editable */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                Category
              </div>
              {editingField === "category" ? (
                <Input
                  defaultValue={course.category || ""}
                  autoFocus
                  className="mt-2"
                  onBlur={(e) => {
                    if (e.target.value !== (course.category || "")) {
                      updateCourseField("category", e.target.value);
                    } else {
                      setEditingField(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateCourseField("category", e.currentTarget.value);
                    } else if (e.key === "Escape") {
                      setEditingField(null);
                    }
                  }}
                />
              ) : (
                <div
                  className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setEditingField("category")}
                >
                  {course.category || "Not set"}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                Language
              </div>
              {editingField === "language" ? (
                <Input
                  defaultValue={course.language}
                  autoFocus
                  className="mt-2"
                  onBlur={(e) => {
                    if (e.target.value !== course.language) {
                      updateCourseField("language", e.target.value);
                    } else {
                      setEditingField(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateCourseField("language", e.currentTarget.value);
                    } else if (e.key === "Escape") {
                      setEditingField(null);
                    }
                  }}
                />
              ) : (
                <div
                  className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setEditingField("language")}
                >
                  {course.language}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
          </div>

          {/* Description field - editable */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
              Description
            </div>
            {editingField === "description" ? (
              <textarea
                defaultValue={course.description || ""}
                autoFocus
                className="mt-2 w-full h-24 px-3.5 py-2.5 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onBlur={(e) => {
                  if (e.target.value !== (course.description || "")) {
                    updateCourseField("description", e.target.value);
                  } else {
                    setEditingField(null);
                  }
                }}
              />
            ) : (
              <div
                className="mt-2 text-[13px] font-black text-text-1 cursor-pointer hover:text-primary transition-colors min-h-[40px] flex items-start gap-2"
                onClick={() => setEditingField("description")}
              >
                <span className="flex-1">
                  {course.description || "No description yet. Click to add."}
                </span>
                <Pencil className="w-3.5 h-3.5 text-text-3 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* Curriculum Section */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Curriculum
          </h2>
          <div className="rounded-[22px] bg-white/95 border border-border/95 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-black text-text-1">Modules & lessons</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddModule(true)}
                  className="h-9 px-3 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center gap-1.5 shadow-[0_14px_28px_rgba(21,25,35,0.06)]"
                >
                  <Plus className="w-4 h-4" />
                  Add module
                </button>
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-2.5 mt-2.5">
              {course.modules.map((module, moduleIdx) => (
                <div
                  key={module.id}
                  className="rounded-[18px] border border-border/95 bg-white/95 p-3"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="flex-1 text-left flex items-center gap-2 min-w-0"
                    >
                      {editingModule === module.id ? (
                        <Input
                          defaultValue={module.title}
                          autoFocus
                          className="h-8 flex-1"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => {
                            if (e.target.value !== module.title) {
                              updateModule(module.id, e.target.value);
                            } else {
                              setEditingModule(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (e.currentTarget.value !== module.title) {
                                updateModule(module.id, e.currentTarget.value);
                              } else {
                                setEditingModule(null);
                              }
                            } else if (e.key === "Escape") {
                              setEditingModule(null);
                            }
                          }}
                        />
                      ) : (
                        <span className="font-black text-text-1 truncate">
                          {module.title}
                        </span>
                      )}
                      {expandedModules.has(module.id) ? (
                        <ChevronUp className="w-4 h-4 text-text-3 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-3 flex-shrink-0" />
                      )}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveModule(module.id, "up")}
                        disabled={moduleIdx === 0}
                        className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-text-3" />
                      </button>
                      <button
                        onClick={() => moveModule(module.id, "down")}
                        disabled={moduleIdx === course.modules.length - 1}
                        className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-text-3" />
                      </button>
                      <button
                        onClick={() => setEditingModule(module.id)}
                        className="w-7 h-7 rounded-lg hover:bg-muted grid place-items-center"
                        title="Edit title"
                      >
                        <Pencil className="w-3.5 h-3.5 text-text-3" />
                      </button>
                      <button
                        onClick={() => deleteModule(module.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 grid place-items-center"
                        title="Delete module"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Lessons */}
                  {expandedModules.has(module.id) && (
                    <div className="space-y-2 mt-2">
                      {module.lessons.map((lesson, lessonIdx) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-[16px] border border-border/95 bg-white/95"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-[34px] h-[34px] rounded-[14px] border border-border/95 bg-primary/10 grid place-items-center text-primary-600 flex-shrink-0">
                              {lesson.videoUrl ? (
                                <Play className="w-4 h-4" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              {editingLesson === lesson.id ? (
                                <Input
                                  defaultValue={lesson.title}
                                  autoFocus
                                  onBlur={(e) => {
                                    if (e.target.value !== lesson.title) {
                                      updateLesson(lesson.id, {
                                        title: e.target.value,
                                      });
                                    }
                                    setEditingLesson(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      if (
                                        e.currentTarget.value !== lesson.title
                                      ) {
                                        updateLesson(lesson.id, {
                                          title: e.currentTarget.value,
                                        });
                                      }
                                      setEditingLesson(null);
                                    } else if (e.key === "Escape") {
                                      setEditingLesson(null);
                                    }
                                  }}
                                  className="h-8"
                                />
                              ) : (
                                <Link
                                  href={`/manage-courses/${course.id}/lessons/${lesson.id}/edit`}
                                  className="text-[13px] font-black text-text-1 hover:text-primary truncate block"
                                >
                                  {lesson.title}
                                </Link>
                              )}
                              <div className="mt-1 text-[12px] font-extrabold text-text-3">
                                {lesson.durationSeconds > 0
                                  ? `${Math.round(lesson.durationSeconds / 60)} min`
                                  : "No video"}{" "}
                                &bull;{" "}
                                {lesson.videoUrl
                                  ? "Video uploaded"
                                  : "No video"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {lesson.isFreePreview && (
                              <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-success/14 text-green-700 border border-success/22">
                                FREE PREVIEW
                              </span>
                            )}
                            {!lesson.videoUrl && !lesson.isFreePreview && (
                              <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-warning/14 text-amber-700 border border-warning/22">
                                DRAFT
                              </span>
                            )}
                            {/* Edit lesson */}
                            <Link
                              href={`/manage-courses/${course.id}/lessons/${lesson.id}/edit`}
                              className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center"
                              title="Edit lesson"
                            >
                              <Pencil className="w-3 h-3 text-text-3" />
                            </Link>
                            {/* Move up */}
                            <button
                              onClick={() =>
                                moveLesson(module.id, lesson.id, "up")
                              }
                              disabled={lessonIdx === 0}
                              className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="w-3 h-3 text-text-3" />
                            </button>
                            {/* Move down */}
                            <button
                              onClick={() =>
                                moveLesson(module.id, lesson.id, "down")
                              }
                              disabled={
                                lessonIdx === module.lessons.length - 1
                              }
                              className="w-6 h-6 rounded-md hover:bg-muted grid place-items-center disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="w-3 h-3 text-text-3" />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() =>
                                deleteLesson(lesson.id, module.id)
                              }
                              className="w-6 h-6 rounded-md hover:bg-red-50 grid place-items-center"
                              title="Delete lesson"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => addLesson(module.id)}
                        className="w-full h-9 rounded-[16px] border border-border/95 bg-white/95 text-text-2 font-black text-[13px] inline-flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add lesson
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Module Input */}
            {showAddModule && (
              <div className="flex items-center gap-2 mt-2.5">
                <Input
                  placeholder="New module title..."
                  value={newModuleTitle}
                  autoFocus
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addModule();
                    if (e.key === "Escape") {
                      setNewModuleTitle("");
                      setShowAddModule(false);
                    }
                  }}
                  className="flex-1"
                />
                <button
                  onClick={addModule}
                  disabled={!newModuleTitle.trim()}
                  className="h-10 px-3 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setNewModuleTitle("");
                    setShowAddModule(false);
                  }}
                  className="h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 text-text-2 font-black text-[13px]"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Empty state */}
            {course.modules.length === 0 && !showAddModule && (
              <div className="text-center py-6 text-text-3 text-[13px] font-black">
                No modules yet. Click &quot;Add module&quot; to get started.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="rounded-[22px] bg-white/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] p-3.5 min-w-0 flex flex-col gap-3">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Publish checklist
          </h2>

          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3">
            <div className="font-black text-text-1">Ready to publish?</div>
            <div className="mt-1.5 text-[12px] font-extrabold text-text-3">
              Complete these items to enable publishing.
            </div>

            <ChecklistItem
              label="Title & cover image"
              hint={course.title ? "Looks good" : "Add a title"}
              checked={!!course.title}
            />
            <ChecklistItem
              label="At least 1 module"
              hint={
                course.modules.length > 0
                  ? `${course.modules.length} modules added`
                  : "Add a module"
              }
              checked={course.modules.length > 0}
            />
            <ChecklistItem
              label="At least 3 lessons"
              hint={
                totalLessons >= 3
                  ? `${totalLessons} lessons added`
                  : `Add ${3 - totalLessons} more lesson${3 - totalLessons !== 1 ? "s" : ""}`
              }
              checked={totalLessons >= 3}
            />
            <ChecklistItem
              label="Pricing configured"
              hint={
                course.price > 0
                  ? `$${course.price}`
                  : "Set price or mark free"
              }
              checked={course.price >= 0}
            />
          </div>

          {/* Quick Actions */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Quick actions
          </h2>
          <div className="grid gap-2.5">
            <button
              onClick={() => {
                // Navigate to lesson editor for first lesson if exists
                const firstLesson = course.modules[0]?.lessons[0];
                if (firstLesson) {
                  router.push(`/manage-courses/${course.id}/lessons/${firstLesson.id}/edit`);
                } else {
                  toast({ title: "Add a lesson first", variant: "warning" });
                }
              }}
              className="h-10 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center justify-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)]"
            >
              <Upload className="w-4 h-4" />
              Upload video
            </button>
            <button
              onClick={() => {
                const firstLesson = course.modules[0]?.lessons[0];
                if (firstLesson) {
                  router.push(`/manage-courses/${course.id}/lessons/${firstLesson.id}/edit`);
                } else {
                  toast({ title: "Add a lesson first", variant: "warning" });
                }
              }}
              className="h-10 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center justify-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)]"
            >
              <FileText className="w-4 h-4" />
              Add resources
            </button>
            <button
              onClick={publishCourse}
              disabled={
                !hasContent || isLoading || course.status === "PUBLISHED"
              }
              className="h-10 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] inline-flex items-center justify-center shadow-[0_16px_34px_rgba(47,111,237,0.22)] disabled:opacity-50"
            >
              Publish when ready
            </button>
          </div>

          {/* Status */}
          <h2 className="mt-auto text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Status
          </h2>
          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3">
            <div className="flex items-center justify-between">
              <div className="font-black text-text-1">
                {course.status === "PUBLISHED" ? "Published" : "Draft"}
              </div>
              <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-primary/10 text-primary-600 border border-primary/14">
                {course.status === "PUBLISHED" ? "Public" : "Not public"}
              </span>
            </div>
            <div className="mt-2 text-[12px] font-extrabold text-text-3 leading-relaxed">
              {course.status === "PUBLISHED"
                ? "Course is live and visible to learners."
                : "Preview is available. Publishing will make the course visible to learners."}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ChecklistItem({
  label,
  hint,
  checked,
}: {
  label: string;
  hint: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-[16px] border border-border/95 bg-white/95 mt-2">
      <div
        className={`w-[18px] h-[18px] rounded-full border-2 grid place-items-center flex-shrink-0 ${
          checked ? "border-success/65 bg-success/14" : "border-text-3/55"
        }`}
      >
        {checked && (
          <svg
            viewBox="0 0 10 8"
            width="7"
            height="4"
            className="text-text-1/65"
          >
            <path
              d="M1 4l2 2 6-5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div>
        <div className="text-[13px] font-black text-text-1">{label}</div>
        <div className="mt-1 text-[12px] font-extrabold text-text-3">
          {hint}
        </div>
      </div>
    </div>
  );
}
