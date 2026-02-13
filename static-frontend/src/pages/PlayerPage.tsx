import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { CoursePlayer } from "@/components/learner/course-player";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoredToken } from "@/lib/auth-context";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["course-player", id],
    queryFn: async () => {
      const authToken = token || getStoredToken();
      const response = await fetch(`${API_URL}/courses/${id}/progress`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!response.ok) return null;
      const courseData = await response.json();

      if (!courseData) return null;

      const allLessons = (courseData.modules || []).flatMap((m: any) => m.lessons || []);

      let currentLessonId = courseData.currentLessonId;
      let initialTime = courseData.initialTime || 0;

      if (!currentLessonId) {
        const firstAvailable = allLessons.find((l: any) => !l.isLocked);
        currentLessonId = firstAvailable?.id;
        initialTime = 0;
      }

      return {
        ...courseData,
        currentLessonId,
        initialTime,
        enrollmentId: courseData.enrollmentId || "",
        otherStudents: courseData.otherStudents || [],
        totalOtherStudents: courseData.totalOtherStudents || 0,
      };
    },
    enabled: !!id && !!token,
  });

  if (isLoading) {
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

  if (!data) {
    // Not enrolled or error - redirect to course overview
    navigate(`/course/${id}`, { replace: true });
    return null;
  }

  return (
    <CoursePlayer
      course={data}
      currentLessonId={data.currentLessonId}
      initialTime={data.initialTime}
      enrollmentId={data.enrollmentId}
      otherStudents={data.otherStudents}
      totalOtherStudents={data.totalOtherStudents}
    />
  );
}
