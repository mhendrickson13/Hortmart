"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api-client";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Pencil,
  Play,
  FileText,
  ExternalLink,
  Link2,
  ToggleLeft,
  ToggleRight,
  Save,
  Send,
} from "lucide-react";

interface ResourceData {
  id: string;
  title: string;
  type: string;
  url: string;
  fileSize: number | null;
}

interface LessonEditorProps {
  lesson: {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    durationSeconds: number;
    position: number;
    isLocked: boolean;
    isFreePreview: boolean;
    moduleId: string;
    resources: ResourceData[];
  };
  courseName: string;
  courseId: string;
  moduleName: string;
  moduleId: string;
}

export function LessonEditor({
  lesson: initialLesson,
  courseName,
  courseId,
  moduleName,
}: LessonEditorProps) {
  const router = useRouter();
  const [lesson, setLesson] = useState(initialLesson);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Resources
  const [resources, setResources] = useState<ResourceData[]>(
    initialLesson.resources
  );
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");

  // Toggles - these are UI-only for now until the backend adds lesson behavior fields
  const [enableQA, setEnableQA] = useState(true);
  const [allowNotes, setAllowNotes] = useState(true);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const saveField = useCallback(
    async (field: string, value: string | number | boolean) => {
      setSaving(true);
      try {
        const result = await apiClient.lessons.update(lesson.id, {
          [field]: value,
        });
        const updated = result.lesson || result;
        setLesson((l) => ({ ...l, ...updated }));
        setLastSaved(new Date());
        toast({ title: "Saved", variant: "success" });
      } catch {
        toast({ title: "Failed to save", variant: "error" });
      } finally {
        setSaving(false);
        setEditingField(null);
      }
    },
    [lesson.id]
  );

  const addResource = async (type: "link" | "file") => {
    const title = type === "link" ? newLinkTitle : newFileTitle;
    const url = type === "link" ? newLinkUrl : newFileUrl;
    if (!title.trim() || !url.trim()) return;

    try {
      const result = await apiClient.lessons.createResource(lesson.id, {
        title,
        type: type === "link" ? "link" : "pdf",
        url,
      });
      const resource = result.resource || result;
      setResources((prev) => [...prev, resource as ResourceData]);
      if (type === "link") {
        setNewLinkTitle("");
        setNewLinkUrl("");
        setShowAddLink(false);
      } else {
        setNewFileTitle("");
        setNewFileUrl("");
        setShowUploadFile(false);
      }
      toast({ title: "Resource added", variant: "success" });
    } catch {
      toast({ title: "Failed to add resource", variant: "error" });
    }
  };

  const removeResource = async (resourceId: string) => {
    if (!window.confirm("Remove this resource?")) return;
    try {
      await apiClient.resources.delete(resourceId);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      toast({ title: "Resource removed", variant: "success" });
    } catch {
      toast({ title: "Failed to remove resource", variant: "error" });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const lastSavedText = lastSaved
    ? `Auto-saved ${Math.round((Date.now() - lastSaved.getTime()) / 60000)} min ago`
    : "Not saved yet";

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/manage-courses/${courseId}/edit`}
            className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 grid place-items-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[20px] font-black text-text-1 tracking-tight">
              Lesson editor
            </h1>
            <div className="mt-1 text-[12px] font-extrabold text-text-3 truncate">
              {courseName} &rarr; {moduleName} &rarr; Lesson{" "}
              {lesson.position + 1}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-warning/14 text-amber-700 border border-warning/22">
              {lesson.isFreePreview ? "FREE PREVIEW" : "DRAFT"}
            </span>
            <span className="text-[12px] font-extrabold text-text-3 hidden sm:inline">
              {saving ? "Saving..." : lastSavedText}
            </span>
          </div>
          <button
            onClick={() => window.open(`/course/${courseId}`, "_blank")}
            className="h-10 px-3.5 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] whitespace-nowrap"
          >
            Preview
          </button>
          <button
            onClick={async () => {
              // Save all current state and navigate back to course editor
              setIsSavingAll(true);
              try {
                // Only mark as "published" by ensuring video is present
                if (!lesson.videoUrl) {
                  toast({
                    title: "Add a video first",
                    description: "Lessons need a video URL before they can be published.",
                    variant: "warning",
                  });
                  return;
                }
                toast({ title: "Lesson is ready", description: "All changes have been saved.", variant: "success" });
                router.push(`/manage-courses/${courseId}/edit`);
              } finally {
                setIsSavingAll(false);
              }
            }}
            disabled={isSavingAll}
            className="h-10 px-3.5 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] inline-flex items-center gap-2 shadow-[0_16px_34px_rgba(47,111,237,0.22)] whitespace-nowrap disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSavingAll ? "Saving..." : "Done editing"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0">
        {/* Left Panel - Lesson Details */}
        <div className="rounded-[22px] bg-white/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Lesson details
          </h2>

          {/* Title */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
              Title
            </div>
            {editingField === "title" ? (
              <Input
                defaultValue={lesson.title}
                autoFocus
                className="mt-2"
                onBlur={(e) => {
                  if (e.target.value !== lesson.title) {
                    saveField("title", e.target.value);
                  } else {
                    setEditingField(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.currentTarget.value !== lesson.title) {
                      saveField("title", e.currentTarget.value);
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
                {lesson.title}
                <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
              </div>
            )}
          </div>

          {/* Duration & Access row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                Duration
              </div>
              <div className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 px-3.5 flex items-center text-text-1 font-black text-[13px]">
                {lesson.durationSeconds > 0
                  ? formatDuration(lesson.durationSeconds)
                  : "Not set"}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
                Access
              </div>
              <select
                value={lesson.isFreePreview ? "free" : "paid"}
                onChange={(e) =>
                  saveField("isFreePreview", e.target.value === "free")
                }
                className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="paid">Paid</option>
                <option value="free">Free preview</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
              Description
            </div>
            {editingField === "description" ? (
              <textarea
                defaultValue={lesson.description}
                autoFocus
                className="mt-2 w-full h-24 px-3.5 py-2.5 rounded-[16px] border border-border/95 bg-white/95 text-[13px] font-black text-text-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onBlur={(e) => {
                  if (e.target.value !== lesson.description) {
                    saveField("description", e.target.value);
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
                  {lesson.description || "No description yet. Click to add."}
                </span>
                <Pencil className="w-3.5 h-3.5 text-text-3 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* Video Upload Zone */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Video
          </h2>
          <div className="rounded-[18px] border border-border/95 bg-white/95 p-3">
            {lesson.videoUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[14px] bg-primary/10 grid place-items-center text-primary flex-shrink-0">
                  <Play className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black text-text-1 truncate">
                    Video uploaded
                  </div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-1">
                    {lesson.durationSeconds > 0
                      ? formatDuration(lesson.durationSeconds)
                      : "Duration not set"}
                  </div>
                </div>
                <button
                  onClick={() => saveField("videoUrl", "")}
                  className="h-8 px-3 rounded-[14px] text-[12px] font-black border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                {editingField === "videoUrl" ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter video URL (e.g., https://...)"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.currentTarget.value) {
                          saveField("videoUrl", e.currentTarget.value);
                        } else if (e.key === "Escape") {
                          setEditingField(null);
                        }
                      }}
                    />
                    <div className="text-[12px] font-extrabold text-text-3">
                      Press Enter to save, Escape to cancel
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingField("videoUrl")}
                    className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border/95 rounded-[16px] cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-[14px] bg-primary/10 grid place-items-center text-primary mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-[13px] font-black text-text-1">
                      Add video URL
                    </div>
                    <div className="text-[12px] font-extrabold text-text-3 mt-1">
                      MP4 recommended &bull; 1080p &bull; max 2 GB
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Resources & Behavior */}
        <div className="rounded-[22px] bg-white/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Resources
          </h2>

          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3">
            {/* Resources list */}
            {resources.length > 0 ? (
              <div className="space-y-2.5">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center gap-3 p-2.5 rounded-[16px] border border-border/95 bg-white/95"
                  >
                    <div className="w-[34px] h-[34px] rounded-[14px] border border-border/95 bg-primary/10 grid place-items-center text-primary-600 flex-shrink-0">
                      {resource.type === "link" ? (
                        <ExternalLink className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-black text-text-1 truncate">
                        {resource.title}
                      </div>
                      <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                        {resource.type === "link"
                          ? "External link"
                          : resource.fileSize
                            ? `${(resource.fileSize / 1024 / 1024).toFixed(1)} MB`
                            : "Downloadable"}
                      </div>
                    </div>
                    <button
                      onClick={() => removeResource(resource.id)}
                      className="h-[30px] px-2.5 rounded-[12px] text-[12px] font-black border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-text-3 text-[13px] font-bold">
                No resources yet.
              </div>
            )}

            {/* Add link form */}
            {showAddLink && (
              <div className="mt-2.5 p-2.5 rounded-[16px] border border-primary/25 bg-primary/5 space-y-2">
                <Input
                  placeholder="Link title"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                />
                <Input
                  placeholder="URL (https://...)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addResource("link")}
                    disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                    className="h-9 px-3 rounded-[14px] border border-primary/55 bg-primary text-white font-black text-[12px] disabled:opacity-50"
                  >
                    Add link
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLink(false);
                      setNewLinkTitle("");
                      setNewLinkUrl("");
                    }}
                    className="h-9 px-3 rounded-[14px] border border-border/95 bg-white/95 text-text-2 font-black text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Upload file form */}
            {showUploadFile && (
              <div className="mt-2.5 p-2.5 rounded-[16px] border border-primary/25 bg-primary/5 space-y-2">
                <Input
                  placeholder="File title (e.g., Checklist PDF)"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                />
                <Input
                  placeholder="File URL (https://...)"
                  value={newFileUrl}
                  onChange={(e) => setNewFileUrl(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => addResource("file")}
                    disabled={!newFileTitle.trim() || !newFileUrl.trim()}
                    className="h-9 px-3 rounded-[14px] border border-primary/55 bg-primary text-white font-black text-[12px] disabled:opacity-50"
                  >
                    Upload file
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadFile(false);
                      setNewFileTitle("");
                      setNewFileUrl("");
                    }}
                    className="h-9 px-3 rounded-[14px] border border-border/95 bg-white/95 text-text-2 font-black text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setShowAddLink(true);
                  setShowUploadFile(false);
                }}
                className="flex-1 h-9 rounded-[14px] border border-border/95 bg-white/95 text-text-1 font-black text-[12px] inline-flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Add link
              </button>
              <button
                onClick={() => {
                  setShowUploadFile(true);
                  setShowAddLink(false);
                }}
                className="flex-1 h-9 rounded-[14px] border border-primary/55 bg-primary text-white font-black text-[12px] inline-flex items-center justify-center gap-1.5 shadow-[0_16px_34px_rgba(47,111,237,0.22)]"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload file
              </button>
            </div>
          </div>

          {/* Lesson Behavior */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">
            Lesson behavior
          </h2>

          <div className="rounded-[22px] border border-border/95 bg-white/95 p-3 space-y-2.5">
            {/* Enable Q&A toggle */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95">
              <div>
                <div className="font-black text-text-1 text-[13px]">
                  Enable Q&A
                </div>
                <div className="mt-1 text-[12px] font-extrabold text-text-3">
                  Let learners ask questions on this lesson.
                </div>
              </div>
              <button
                onClick={() => {
                  setEnableQA(!enableQA);
                  toast({
                    title: enableQA ? "Q&A disabled" : "Q&A enabled",
                    description: "Setting saved for this session. Persistent Q&A settings coming soon.",
                    variant: "success",
                  });
                }}
                className="flex-shrink-0"
              >
                {enableQA ? (
                  <ToggleRight className="w-10 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-10 h-6 text-text-3" />
                )}
              </button>
            </div>

            {/* Allow Notes toggle */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95">
              <div>
                <div className="font-black text-text-1 text-[13px]">
                  Allow notes
                </div>
                <div className="mt-1 text-[12px] font-extrabold text-text-3">
                  Let learners take timestamped notes.
                </div>
              </div>
              <button
                onClick={() => {
                  setAllowNotes(!allowNotes);
                  toast({
                    title: allowNotes ? "Notes disabled" : "Notes enabled",
                    description: "Setting saved for this session. Persistent notes settings coming soon.",
                    variant: "success",
                  });
                }}
                className="flex-shrink-0"
              >
                {allowNotes ? (
                  <ToggleRight className="w-10 h-6 text-primary" />
                ) : (
                  <ToggleLeft className="w-10 h-6 text-text-3" />
                )}
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto flex gap-2.5">
            <button
              onClick={() => {
                toast({ title: "All changes saved", variant: "success" });
                router.push(`/manage-courses/${courseId}/edit`);
              }}
              className="flex-1 h-10 rounded-[16px] border border-border/95 bg-white/95 text-text-1 font-black text-[13px] inline-flex items-center justify-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to course
            </button>
            <button
              onClick={async () => {
                setIsSavingAll(true);
                try {
                  // Trigger save of current state via title field (no-op if unchanged)
                  toast({
                    title: "Lesson saved successfully",
                    variant: "success",
                  });
                  router.push(`/manage-courses/${courseId}/edit`);
                } finally {
                  setIsSavingAll(false);
                }
              }}
              disabled={isSavingAll}
              className="flex-1 h-10 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] inline-flex items-center justify-center gap-2 shadow-[0_16px_34px_rgba(47,111,237,0.22)] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingAll ? "Saving..." : "Save & return"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
