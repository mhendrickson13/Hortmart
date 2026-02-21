import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { CoursePlayer } from "@/components/learner/course-player";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoredToken } from "@/lib/auth-context";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedLessonId = searchParams.get("lesson");
  const isPreview = searchParams.get("preview") === "true";
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const { data: courseData, isLoading } = useQuery({
    queryKey: ["course-player", id, isPreview ? "preview" : "progress"],
    queryFn: async () => {
      const authToken = token || getStoredToken();
      let endpoint: string;
      if (isPreview) {
        // Try admin preview first, fall back to free-preview for regular users
        const isAdmin = user?.role === 'ADMIN';
        endpoint = isAdmin
          ? `${API_URL}/courses/${id}/preview`
          : `${API_URL}/courses/${id}/free-preview`;
      } else {
        endpoint = `${API_URL}/courses/${id}/progress`;
      }
      const response = await fetch(endpoint, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!response.ok) return null;
      const result = await response.json();
      if (!result) return null;
      return {
        ...result,
        enrollmentId: result.enrollmentId || "",
        otherStudents: result.otherStudents || [],
        totalOtherStudents: result.totalOtherStudents || 0,
        isPreview: result.isPreview || false,
      };
    },
    enabled: !!id && !!token,
    gcTime: 0, // Don't cache — always fetch fresh progress data on return
  });

  // Derive the lesson to play — recomputed whenever requestedLessonId or courseData changes
  const resolvedData = (() => {
    if (!courseData) return null;
    const allLessons = (courseData.modules || []).flatMap((m: any) => m.lessons || []);
    let currentLessonId = courseData.currentLessonId;
    let initialTime = courseData.initialTime || 0;

    // If a specific lesson was requested via ?lesson= param, use it
    if (requestedLessonId) {
      const requestedLesson = allLessons.find((l: any) => l.id === requestedLessonId && !l.isLocked);
      if (requestedLesson) {
        currentLessonId = requestedLessonId;
        // Resume from saved position in that lesson
        initialTime = requestedLesson.progress?.lastWatchedTimestamp || 0;
      }
    }

    if (!currentLessonId) {
      const firstAvailable = allLessons.find((l: any) => !l.isLocked);
      currentLessonId = firstAvailable?.id;
      initialTime = firstAvailable?.progress?.lastWatchedTimestamp || 0;
    }

    return { currentLessonId, initialTime };
  })();

  // Redirect if not enrolled and not preview mode
  useEffect(() => {
    if (!isLoading && !isPreview && (!courseData || !resolvedData)) {
      navigate(`/course/${id}`, { replace: true });
    }
  }, [isLoading, isPreview, courseData, resolvedData, id, navigate]);

  if (isLoading || (!courseData || !resolvedData)) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-video rounded-2xl" />
        <div className="flex gap-4">
          <Skeleton className="h-48 flex-1 rounded-2xl" />
          <Skeleton className="h-48 w-80 rounded-2xl hidden lg:block" />
        </div>
      </div>
    );
  }

  return (
    <CoursePlayer
      key={resolvedData.currentLessonId}
      course={courseData}
      currentLessonId={resolvedData.currentLessonId}
      initialTime={resolvedData.initialTime}
      enrollmentId={courseData.enrollmentId}
      otherStudents={courseData.otherStudents}
      totalOtherStudents={courseData.totalOtherStudents}
      isPreview={courseData.isPreview || false}
    />
  );
}
