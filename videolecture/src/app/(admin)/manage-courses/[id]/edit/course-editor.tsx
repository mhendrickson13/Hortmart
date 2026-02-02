"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/components/ui/toaster";
import {
  Plus,
  GripVertical,
  Edit,
  ChevronDown,
  ChevronUp,
  Play,
  Lock,
  Upload,
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
  const [editingLesson, setEditingLesson] = useState<string | null>(null);

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

  const addModule = async () => {
    if (!newModuleTitle.trim()) return;

    try {
      const response = await fetch(`/api/courses/${course.id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newModuleTitle,
          position: course.modules.length,
        }),
      });

      if (!response.ok) throw new Error("Failed to add module");

      const { module } = await response.json();
      setCourse((c) => ({
        ...c,
        modules: [...c.modules, { ...module, lessons: [] }],
      }));
      setNewModuleTitle("");
      setExpandedModules((prev) => new Set([...prev, module.id]));

      toast({ title: "Module added", variant: "success" });
    } catch {
      toast({ title: "Failed to add module", variant: "error" });
    }
  };

  const addLesson = async (moduleId: string) => {
    try {
      const module = course.modules.find((m) => m.id === moduleId);
      if (!module) return;

      const response = await fetch(`/api/courses/${course.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          title: `Lesson ${module.lessons.length + 1}`,
          position: module.lessons.length,
        }),
      });

      if (!response.ok) throw new Error("Failed to add lesson");

      const { lesson } = await response.json();
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) =>
          m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m
        ),
      }));

      setEditingLesson(lesson.id);
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
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update lesson");

      const { lesson } = await response.json();
      setCourse((c) => ({
        ...c,
        modules: c.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === lessonId ? lesson : l)),
        })),
      }));

      toast({ title: "Lesson updated", variant: "success" });
    } catch {
      toast({ title: "Failed to update lesson", variant: "error" });
    }
  };

  const publishCourse = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          publishedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to publish course");

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-bold text-text-1">{course.title}</h1>
            <Pill variant={course.status === "PUBLISHED" ? "published" : "draft"}>
              {course.status}
            </Pill>
          </div>
          <p className="text-body-sm text-text-2 mt-1">
            {course.modules.length} modules • {totalLessons} lessons
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={() => router.push("/manage-courses")}>
            Back to courses
          </Button>
          <Button variant="secondary">Preview</Button>
          <Button
            onClick={publishCourse}
            disabled={!hasContent || isLoading || course.status === "PUBLISHED"}
          >
            {isLoading
              ? "Publishing..."
              : course.status === "PUBLISHED"
              ? "Published"
              : "Publish"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 flex-1 min-h-0">
        {/* Curriculum Editor */}
        <Card className="p-4 flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-semibold text-text-1">Curriculum</h2>
          </div>

          <div className="space-y-3">
            {course.modules.map((module) => (
              <div
                key={module.id}
                className="rounded-xl border border-border/95 bg-white/92 overflow-hidden"
              >
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-surface-3 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-text-3" />
                  <div className="flex-1 text-left">
                    <div className="text-body-sm font-semibold text-text-1">
                      {module.title}
                    </div>
                    <div className="text-caption text-text-3">
                      {module.lessons.length} lessons
                    </div>
                  </div>
                  {expandedModules.has(module.id) ? (
                    <ChevronUp className="w-4 h-4 text-text-3" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-3" />
                  )}
                </button>

                {/* Lessons */}
                {expandedModules.has(module.id) && (
                  <div className="border-t border-border/95 p-3 space-y-2">
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/95 bg-white/95"
                      >
                        <GripVertical className="w-4 h-4 text-text-3" />
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          {lesson.videoUrl ? (
                            <Play className="w-4 h-4 text-primary" />
                          ) : (
                            <Upload className="w-4 h-4 text-text-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingLesson === lesson.id ? (
                            <Input
                              defaultValue={lesson.title}
                              autoFocus
                              onBlur={(e) => {
                                updateLesson(lesson.id, { title: e.target.value });
                                setEditingLesson(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateLesson(lesson.id, {
                                    title: e.currentTarget.value,
                                  });
                                  setEditingLesson(null);
                                }
                              }}
                              className="h-8"
                            />
                          ) : (
                            <div
                              className="text-caption font-semibold text-text-1 cursor-pointer hover:text-primary"
                              onClick={() => setEditingLesson(lesson.id)}
                            >
                              {lesson.title}
                            </div>
                          )}
                          <div className="text-[11px] text-text-3 mt-0.5">
                            {lesson.durationSeconds > 0
                              ? `${Math.round(lesson.durationSeconds / 60)} min`
                              : "No video"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {lesson.isFreePreview && (
                            <Pill size="sm">Preview</Pill>
                          )}
                          {lesson.isLocked && (
                            <Lock className="w-3.5 h-3.5 text-text-3" />
                          )}
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            onClick={() => setEditingLesson(lesson.id)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => addLesson(module.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add lesson
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Module */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="New module title..."
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addModule();
              }}
            />
            <Button onClick={addModule} disabled={!newModuleTitle.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add module
            </Button>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish Checklist */}
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-3">
              Publish checklist
            </h3>
            <div className="space-y-2">
              <ChecklistItem label="Title" checked={!!course.title} />
              <ChecklistItem label="Description" checked={!!course.description} />
              <ChecklistItem label="Cover image" checked={false} />
              <ChecklistItem
                label="At least 1 module"
                checked={course.modules.length > 0}
              />
              <ChecklistItem label="At least 1 lesson" checked={totalLessons > 0} />
            </div>
          </Card>

          {/* Course Info */}
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-3">Course info</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-text-3">Category</Label>
                <div className="text-caption text-text-1 mt-1">
                  {course.category || "Not set"}
                </div>
              </div>
              <div>
                <Label className="text-text-3">Level</Label>
                <div className="text-caption text-text-1 mt-1">
                  {course.level.replace("_", " ")}
                </div>
              </div>
              <div>
                <Label className="text-text-3">Price</Label>
                <div className="text-caption text-text-1 mt-1">
                  {course.price === 0 ? "Free" : `$${course.price}`}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          checked
            ? "border-success bg-success/10"
            : "border-text-3/40"
        }`}
      >
        {checked && (
          <div className="w-2 h-2 rounded-full bg-success" />
        )}
      </div>
      <span
        className={`text-caption ${
          checked ? "text-text-1" : "text-text-3"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
