import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lessons as lessonsApi, apiClient, uploads as uploadsApi, video as videoApi } from "@/lib/api-client";
import { VideoPlayer } from "@/components/learner/video-player";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Pencil,
  Play,
  FileText,
  ExternalLink,
  Link2,
  Save,
  Send,
  Loader2,
  Film,
} from "lucide-react";

// ── Types ──

interface ResourceData {
  id: string;
  title: string;
  type: string;
  url: string;
  fileSize: number | null;
}

interface LessonData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  hlsUrl?: string | null;
  videoStatus?: string | null;
  durationSeconds: number;
  position: number;
  isLocked: boolean;
  isFreePreview: boolean;
  qaEnabled: boolean;
  notesEnabled: boolean;
  moduleId: string;
  resources: ResourceData[];
  module?: {
    id: string;
    title: string;
    course?: {
      id: string;
      title: string;
    };
  };
}

// ── Page ──

export default function LessonEditPage() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => lessonsApi.get(lessonId!),
    enabled: !!lessonId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const raw: any = data?.lesson || data;
  if (!raw) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4">
        <p className="text-text-2 text-body">Lesson not found.</p>
        <Link to={`/manage-courses/${courseId}/edit`} className="text-primary font-bold text-body-sm">
          Back to course
        </Link>
      </div>
    );
  }

  const lesson: LessonData = {
    id: raw.id,
    title: raw.title || "",
    description: raw.description || "",
    videoUrl: raw.videoUrl || "",
    hlsUrl: raw.hlsUrl || null,
    videoStatus: raw.videoStatus || null,
    durationSeconds: raw.durationSeconds || 0,
    position: raw.position ?? 0,
    isLocked: raw.isLocked ?? false,
    isFreePreview: raw.isFreePreview ?? false,
    qaEnabled: raw.qaEnabled ?? true,
    notesEnabled: raw.notesEnabled ?? true,
    moduleId: raw.moduleId || "",
    resources: raw.resources || [],
    module: raw.module,
  };

  const courseName = lesson.module?.course?.title || "Course";
  const moduleName = lesson.module?.title || "Module";

  return (
    <LessonEditor
      key={dataUpdatedAt}
      lesson={lesson}
      courseName={courseName}
      courseId={courseId || ""}
      moduleName={moduleName}
      onNavigateBack={() => {
        // Invalidate course query so EditCoursePage gets fresh data
        queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      }}
    />
  );
}

// ── Lesson Editor ──

function LessonEditor({
  lesson: initialLesson,
  courseName,
  courseId,
  moduleName,
  onNavigateBack,
}: {
  lesson: LessonData;
  courseName: string;
  courseId: string;
  moduleName: string;
  onNavigateBack?: () => void;
}) {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(initialLesson);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Sync state when initialLesson changes (e.g. query refetch)
  useEffect(() => {
    setLesson(initialLesson);
    setResources(initialLesson.resources);
  }, [initialLesson.id]);

  // Resources
  const [resources, setResources] = useState<ResourceData[]>(initialLesson.resources);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");

  // Video upload
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Video encoding status
  const [encodingStatus, setEncodingStatus] = useState<'none' | 'encoding' | 'ready' | 'error'>('none');
  const [encodingProgress, setEncodingProgress] = useState(0);
  const encodingPollRef = useRef<ReturnType<typeof setInterval>>();

  // Poll encoding status when encoding is in progress
  useEffect(() => {
    if (encodingStatus !== 'encoding') {
      if (encodingPollRef.current) clearInterval(encodingPollRef.current);
      return;
    }
    const poll = async () => {
      try {
        const status = await videoApi.getStatus(lesson.id);
        setEncodingStatus(status.videoStatus);
        setEncodingProgress(status.jobProgress ?? 0);
        if (status.videoStatus === 'ready' || status.videoStatus === 'error') {
          if (encodingPollRef.current) clearInterval(encodingPollRef.current);
          if (status.videoStatus === 'ready') {
            toast({ title: "Video encoded!", description: "HLS streaming is now available.", variant: "success" });
          } else {
            toast({ title: "Encoding failed", description: status.errorMessage || "Please try again.", variant: "error" });
          }
        }
      } catch { /* ignore poll errors */ }
    };
    poll(); // immediate first check
    encodingPollRef.current = setInterval(poll, 8000);
    return () => { if (encodingPollRef.current) clearInterval(encodingPollRef.current); };
  }, [encodingStatus, lesson.id]);

  // Check initial encoding status on mount
  useEffect(() => {
    (async () => {
      try {
        const status = await videoApi.getStatus(lesson.id);
        setEncodingStatus(status.videoStatus);
        setEncodingProgress(status.jobProgress ?? 0);
      } catch { /* no encoding info available */ }
    })();
  }, [lesson.id]);

  // Resource file upload
  const [uploadingResource, setUploadingResource] = useState(false);
  const resourceInputRef = useRef<HTMLInputElement>(null);

  // Video preview
  const { token } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSigning, setPreviewSigning] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (encodingStatus === 'ready') {
      setLoadingPreview(true);
      videoApi.getSignedUrl(lesson.id, token || undefined)
        .then((data) => {
          setPreviewUrl(data.signedManifestUrl);
          setPreviewSigning(data.signingParams);
        })
        .catch(() => { /* signed URL not available */ })
        .finally(() => setLoadingPreview(false));
    } else if (lesson.videoUrl && encodingStatus !== 'encoding') {
      setPreviewUrl(lesson.videoUrl);
      setPreviewSigning(null);
    } else {
      setPreviewUrl(null);
      setPreviewSigning(null);
    }
  }, [encodingStatus, lesson.id, lesson.videoUrl, token]);

  const [isSavingAll, setIsSavingAll] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // ─── Auto-detect video duration ───
  const detectDuration = useCallback(
    async (source: File | string) => {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        const durationPromise = new Promise<number>((resolve) => {
          video.onloadedmetadata = () => {
            const secs = Math.round(video.duration);
            if (source instanceof File) URL.revokeObjectURL(video.src);
            resolve(isFinite(secs) && secs > 0 ? secs : 0);
          };
          video.onerror = () => resolve(0);
          setTimeout(() => resolve(0), 10000); // timeout fallback
        });
        video.src = source instanceof File ? URL.createObjectURL(source) : source;
        const seconds = await durationPromise;
        if (seconds > 0) {
          // Save duration to backend
          const result = await apiClient.lessons.update(lesson.id, { durationSeconds: seconds } as any);
          const updated: any = (result as any).lesson || result;
          setLesson((l) => ({ ...l, ...updated }));
          setLastSaved(new Date());
        }
      } catch {
        // Non-critical: don't break the upload flow
      }
    },
    [lesson.id]
  );

  const saveField = useCallback(
    async (field: string, value: string | number | boolean) => {
      setSaving(true);
      try {
        const result = await apiClient.lessons.update(lesson.id, { [field]: value } as any);
        const updated: any = (result as any).lesson || result;
        setLesson((l) => ({ ...l, ...updated }));
        setLastSaved(new Date());
        toast({ title: "Saved", variant: "success" });
        // Auto-detect duration when a video URL is set
        if (field === "videoUrl" && typeof value === "string" && value) {
          detectDuration(value);
        }
      } catch {
        toast({ title: "Failed to save", variant: "error" });
      } finally {
        setSaving(false);
        setEditingField(null);
      }
    },
    [lesson.id, detectDuration]
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
      const resource: any = (result as any).resource || result;
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

  // ─── Video upload ───
  const handleVideoUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        toast({ title: "Please select a video file", variant: "error" });
        return;
      }
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast({ title: "Video must be under 2GB", variant: "error" });
        return;
      }
      setUploadingVideo(true);
      setVideoUploadProgress(10);
      try {
        // Auto-detect duration from the local file (no CORS issue)
        const durationDetect = detectDuration(file);
        setVideoUploadProgress(30);
        const fileUrl = await uploadsApi.uploadFile(file, "video");
        setVideoUploadProgress(80);
        const result = await apiClient.lessons.update(lesson.id, { videoUrl: fileUrl } as any);
        const updated: any = (result as any).lesson || result;
        setLesson((l) => ({ ...l, ...updated }));
        setVideoUploadProgress(100);
        setLastSaved(new Date());
        toast({ title: "Video uploaded", variant: "success" });
        // Backend auto-triggers encoding — start polling
        setEncodingStatus('encoding');
        setEncodingProgress(0);
        // Wait for duration detection (runs in parallel)
        await durationDetect;
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message || "Try again", variant: "error" });
      } finally {
        setUploadingVideo(false);
        setVideoUploadProgress(0);
      }
    },
    [lesson.id]
  );

  const handleVideoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingVideo(false);
      const file = e.dataTransfer.files[0];
      if (file) handleVideoUpload(file);
    },
    [handleVideoUpload]
  );

  const handleVideoFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleVideoUpload(file);
      e.target.value = "";
    },
    [handleVideoUpload]
  );

  // ─── Resource file upload ───
  const handleResourceFileUpload = useCallback(
    async (file: File) => {
      setUploadingResource(true);
      try {
        const fileType = file.type.startsWith("video/") ? "video" as const : "document" as const;
        const fileUrl = await uploadsApi.uploadFile(file, fileType);
        // Create the resource on the backend
        const result = await apiClient.lessons.createResource(lesson.id, {
          title: file.name,
          type: fileType === "video" ? "video" : "pdf",
          url: fileUrl,
        });
        const resource: any = (result as any).resource || result;
        setResources((prev) => [...prev, resource as ResourceData]);
        toast({ title: "Resource uploaded", variant: "success" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message || "Try again", variant: "error" });
      } finally {
        setUploadingResource(false);
      }
    },
    [lesson.id]
  );

  const handleResourceFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleResourceFileUpload(file);
      e.target.value = "";
    },
    [handleResourceFileUpload]
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const lastSavedText = lastSaved
    ? (() => {
        const mins = Math.round((Date.now() - lastSaved.getTime()) / 60000);
        if (mins < 1) return "Auto-saved just now";
        return `Auto-saved ${mins} min ago`;
      })()
    : "Not saved yet";

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/manage-courses/${courseId}/edit`}
            onClick={() => onNavigateBack?.()}
            className="w-10 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 grid place-items-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[20px] font-black text-text-1 tracking-tight">Lesson editor</h1>
            <div className="mt-1 text-[12px] font-extrabold text-text-3 truncate">
              {courseName} &rarr; {moduleName} &rarr; Lesson {lesson.position + 1}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="h-[26px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-warning/14 text-amber-700 border border-warning/22">
              {lesson.isFreePreview ? "FREE PREVIEW" : (lesson.videoUrl || lesson.hlsUrl || lesson.videoStatus === 'ready') ? "READY" : "DRAFT"}
            </span>
            <span className="text-[12px] font-extrabold text-text-3 hidden sm:inline">
              {saving ? "Saving..." : lastSavedText}
            </span>
          </div>
          <button
            onClick={async () => {
              setIsSavingAll(true);
              try {
                if (!lesson.videoUrl && !lesson.hlsUrl && lesson.videoStatus !== 'ready') {
                  toast({
                    title: "Add a video first",
                    description: "Lessons need a video URL before they can be published.",
                    variant: "warning",
                  });
                  return;
                }
                toast({ title: "Lesson is ready", description: "All changes have been saved.", variant: "success" });
                onNavigateBack?.();
                navigate(`/manage-courses/${courseId}/edit`);
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
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 flex-1 min-h-0 mt-3">
        {/* Left Panel - Lesson Details */}
        <div className="rounded-[22px] bg-white/92 dark:bg-card/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Lesson details</h2>

          {/* Title */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Title</div>
            {editingField === "title" ? (
              <Input
                defaultValue={lesson.title}
                autoFocus
                className="mt-2"
                onBlur={(e) => {
                  if (e.target.value !== lesson.title) saveField("title", e.target.value);
                  else setEditingField(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.currentTarget.value !== lesson.title) saveField("title", e.currentTarget.value);
                    else setEditingField(null);
                  } else if (e.key === "Escape") setEditingField(null);
                }}
              />
            ) : (
              <div
                className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setEditingField("title")}
              >
                {lesson.title}
                <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
              </div>
            )}
          </div>

          {/* Duration & Access */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Duration</div>
              {editingField === "durationSeconds" ? (
                <Input
                  type="number"
                  min="0"
                  defaultValue={lesson.durationSeconds}
                  autoFocus
                  className="mt-2"
                  placeholder="Duration in seconds"
                  onBlur={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    if (v !== lesson.durationSeconds) saveField("durationSeconds", v);
                    else setEditingField(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseInt(e.currentTarget.value) || 0;
                      if (v !== lesson.durationSeconds) saveField("durationSeconds", v);
                      else setEditingField(null);
                    } else if (e.key === "Escape") setEditingField(null);
                  }}
                />
              ) : (
                <div
                  className="mt-2 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 px-3.5 flex items-center text-text-1 font-black text-[13px] cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setEditingField("durationSeconds")}
                >
                  {lesson.durationSeconds > 0 ? formatDuration(lesson.durationSeconds) : "Not set"}
                  <Pencil className="w-3.5 h-3.5 ml-auto text-text-3" />
                </div>
              )}
            </div>
            <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
              <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Access</div>
              <select
                value={lesson.isFreePreview ? "free" : "paid"}
                onChange={(e) => saveField("isFreePreview", e.target.value === "free")}
                className="mt-2 w-full h-10 px-3 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-[13px] font-black text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="paid">Paid</option>
                <option value="free">Free preview</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            <div className="text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">Description</div>
            {editingField === "description" ? (
              <textarea
                defaultValue={lesson.description}
                autoFocus
                className="mt-2 w-full h-24 px-3.5 py-2.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-[13px] font-black text-text-1 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onBlur={(e) => {
                  if (e.target.value !== lesson.description) saveField("description", e.target.value);
                  else setEditingField(null);
                }}
              />
            ) : (
              <div
                className="mt-2 text-[13px] font-black text-text-1 cursor-pointer hover:text-primary transition-colors min-h-[40px] flex items-start gap-2"
                onClick={() => setEditingField("description")}
              >
                <span className="flex-1">{lesson.description || "No description yet. Click to add."}</span>
                <Pencil className="w-3.5 h-3.5 text-text-3 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* Video Upload Zone */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Video</h2>
          {/* Hidden video file input */}
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileSelect} />
          <div className="rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            {uploadingVideo ? (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-primary/40 rounded-[16px] bg-primary/5">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <div className="text-[13px] font-black text-text-1">Uploading video...</div>
                <div className="text-[12px] font-extrabold text-text-3 mt-1">This may take a while for large files</div>
                <div className="mt-3 w-48 h-1.5 bg-border/50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${videoUploadProgress}%` }} />
                </div>
              </div>
            ) : (lesson.videoUrl || lesson.hlsUrl || lesson.videoStatus === 'ready' || lesson.videoStatus === 'encoding') ? (
              <div>
                {/* Video Preview Player */}
                {previewUrl && !loadingPreview && (
                  <div className="mb-3 rounded-[14px] overflow-hidden bg-black aspect-video">
                    <VideoPlayer
                      src={previewUrl}
                      signingParams={previewSigning}
                      className="w-full h-full"
                    />
                  </div>
                )}
                {loadingPreview && (
                  <div className="mb-3 rounded-[14px] overflow-hidden bg-black/90 aspect-video flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {encodingStatus === 'encoding' && (
                    <div className="w-12 h-12 rounded-[14px] grid place-items-center flex-shrink-0 bg-amber-50 text-amber-600">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  {encodingStatus === 'error' && (
                    <div className="w-12 h-12 rounded-[14px] grid place-items-center flex-shrink-0 bg-red-50 text-red-500">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                  {encodingStatus !== 'encoding' && encodingStatus !== 'error' && (
                    <div className="w-12 h-12 rounded-[14px] grid place-items-center flex-shrink-0 bg-success/10 text-green-600">
                      <Film className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-black ${
                      encodingStatus === 'encoding' ? 'text-amber-700' :
                      encodingStatus === 'ready' ? 'text-green-700' :
                      encodingStatus === 'error' ? 'text-red-600' :
                      'text-green-700'
                    }`}>
                      {encodingStatus === 'encoding' ? `Encoding to HLS... ${encodingProgress}%` :
                       encodingStatus === 'ready' ? 'Video ready \u2022 HLS streaming' :
                       encodingStatus === 'error' ? 'Encoding failed' :
                       'Video uploaded'}
                    </div>
                    <div className="text-[12px] font-extrabold text-text-3 mt-1 truncate">
                      {lesson.durationSeconds > 0 ? formatDuration(lesson.durationSeconds) : "Duration not set"}
                      {" \u2022 "}
                      {lesson.videoUrl ? (
                        <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View source video
                        </a>
                      ) : lesson.hlsUrl ? (
                        <span className="text-green-600">HLS encoded</span>
                      ) : null}
                    </div>
                    {encodingStatus === 'encoding' && (
                      <div className="mt-1.5 w-full h-1.5 bg-border/50 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, encodingProgress)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {encodingStatus === 'error' && (
                      <button
                        onClick={async () => {
                          try {
                            await videoApi.encode(lesson.id);
                            setEncodingStatus('encoding');
                            setEncodingProgress(0);
                            toast({ title: "Re-encoding started", variant: "success" });
                          } catch (err: any) {
                            toast({ title: "Failed to start encoding", description: err.message, variant: "error" });
                          }
                        }}
                        className="h-8 px-3 rounded-[14px] text-[12px] font-black border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="h-8 px-3 rounded-[14px] text-[12px] font-black border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => saveField("videoUrl", "")}
                      className="h-8 px-3 rounded-[14px] text-[12px] font-black border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div
                  onClick={() => videoInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingVideo(true); }}
                  onDragLeave={() => setIsDraggingVideo(false)}
                  onDrop={handleVideoDrop}
                  className={`flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-[16px] cursor-pointer transition-colors ${isDraggingVideo ? "border-primary bg-primary/5" : "border-border/95 hover:border-primary/40"}`}
                >
                  <div className="w-14 h-14 rounded-[14px] bg-primary/10 grid place-items-center text-primary mb-3">
                    <Film className="w-7 h-7" />
                  </div>
                  <div className="text-[14px] font-black text-text-1">Click to upload or drag & drop</div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-1">
                    MP4, WebM, MOV &bull; Max 2GB &bull; 1080p recommended
                  </div>
                </div>
                {/* Also allow URL input */}
                <div className="mt-2.5">
                  {editingField === "videoUrl" ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Or paste a video URL (e.g., https://...)"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value) saveField("videoUrl", e.currentTarget.value);
                          else if (e.key === "Escape") setEditingField(null);
                        }}
                        onBlur={(e) => { if (e.target.value) saveField("videoUrl", e.target.value); else setEditingField(null); }}
                      />
                    </div>
                  ) : (
                    <button onClick={() => setEditingField("videoUrl")} className="text-[12px] font-black text-primary hover:underline">
                      Or paste a video URL
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Resources & Behavior */}
        <div className="rounded-[22px] bg-white/92 dark:bg-card/92 border border-border/95 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)] p-3.5 min-w-0 flex flex-col gap-3 overflow-auto">
          <h2 className="text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Resources</h2>

          <div className="rounded-[22px] border border-border/95 bg-white/95 dark:bg-card/95 p-3">
            {/* Resources list */}
            {resources.length > 0 ? (
              <div className="space-y-2.5">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-3 p-2.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95">
                    <div className="w-[34px] h-[34px] rounded-[14px] border border-border/95 bg-primary/10 grid place-items-center text-primary-600 flex-shrink-0">
                      {resource.type === "link" ? <ExternalLink className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-black text-text-1 truncate">{resource.title}</div>
                      <div className="text-[12px] font-extrabold text-text-3 mt-0.5">
                        {resource.type === "link" ? (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                            External link
                          </a>
                        ) : resource.fileSize ? (
                          `${(resource.fileSize / 1024 / 1024).toFixed(1)} MB`
                        ) : (
                          "Downloadable"
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeResource(resource.id)}
                      className="h-[30px] px-2.5 rounded-[12px] text-[12px] font-black border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-text-3 text-[13px] font-bold">No resources yet.</div>
            )}

            {/* Add link form */}
            {showAddLink && (
              <div className="mt-2.5 p-2.5 rounded-[16px] border border-primary/25 bg-primary/5 space-y-2">
                <Input placeholder="Link title" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} />
                <Input placeholder="URL (https://...)" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} />
                <div className="flex gap-2">
                  <button
                    onClick={() => addResource("link")}
                    disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                    className="h-9 px-3 rounded-[14px] border border-primary/55 bg-primary text-white font-black text-[12px] disabled:opacity-50"
                  >
                    Add link
                  </button>
                  <button
                    onClick={() => { setShowAddLink(false); setNewLinkTitle(""); setNewLinkUrl(""); }}
                    className="h-9 px-3 rounded-[14px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-2 font-black text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Uploading indicator */}
            {uploadingResource && (
              <div className="mt-2.5 flex items-center gap-2 p-2.5 rounded-[16px] border border-primary/25 bg-primary/5">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-[12px] font-black text-text-1">Uploading file...</span>
              </div>
            )}

            {/* Hidden resource file input */}
            <input ref={resourceInputRef} type="file" className="hidden" onChange={handleResourceFileSelect} />

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => resourceInputRef.current?.click()}
                disabled={uploadingResource}
                className="flex-1 h-9 rounded-[14px] border border-primary/55 bg-primary text-white font-black text-[12px] inline-flex items-center justify-center gap-1.5 shadow-[0_16px_34px_rgba(47,111,237,0.22)] disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload file
              </button>
              <button
                onClick={() => { setShowAddLink(true); }}
                className="flex-1 h-9 rounded-[14px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[12px] inline-flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Add link
              </button>
            </div>
          </div>

          {/* Lesson Features */}
          <h2 className="mt-1.5 text-[12px] font-black text-text-3 uppercase tracking-[0.3px]">Lesson features</h2>

          <div className="rounded-[22px] border border-border/95 bg-white/95 dark:bg-card/95 p-3 space-y-2.5">
            <button
              type="button"
              onClick={() => saveField("qaEnabled", !lesson.qaEnabled)}
              className="w-full flex items-center gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${lesson.qaEnabled ? 'bg-primary justify-end' : 'bg-border justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
              <div className="text-left">
                <div className="font-black text-text-1 text-[13px]">Q&A enabled</div>
                <div className="mt-0.5 text-[12px] font-extrabold text-text-3">Learners can ask questions on this lesson.</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => saveField("notesEnabled", !lesson.notesEnabled)}
              className="w-full flex items-center gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${lesson.notesEnabled ? 'bg-primary justify-end' : 'bg-border justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
              <div className="text-left">
                <div className="font-black text-text-1 text-[13px]">Notes enabled</div>
                <div className="mt-0.5 text-[12px] font-extrabold text-text-3">Learners can take timestamped notes.</div>
              </div>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto flex gap-2.5">
            <button
              onClick={() => {
                toast({ title: "All changes saved", variant: "success" });
                onNavigateBack?.();
                navigate(`/manage-courses/${courseId}/edit`);
              }}
              className="flex-1 h-10 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center justify-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to course
            </button>
            <button
              onClick={async () => {
                setIsSavingAll(true);
                try {
                  toast({ title: "Lesson saved successfully", variant: "success" });
                  onNavigateBack?.();
                  navigate(`/manage-courses/${courseId}/edit`);
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
