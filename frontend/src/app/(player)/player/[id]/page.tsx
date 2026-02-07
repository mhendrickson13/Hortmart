import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { CoursePlayer } from "./course-player";

async function getCourseWithProgress(courseId: string) {
  try {
    const courseData = await serverApi.player.getCourseWithProgress(courseId);
    
    if (!courseData) return null;

    // Transform to expected format
    const allLessons = courseData.modules.flatMap((m) => m.lessons);
    
    // Find current lesson if not set
    let currentLessonId = courseData.currentLessonId;
    let initialTime = courseData.initialTime || 0;
    
    if (!currentLessonId) {
      const firstAvailable = allLessons.find((l) => !l.isLocked);
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
  } catch (error) {
    console.error("Failed to fetch course progress:", error);
    return null;
  }
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const courseData = await getCourseWithProgress(id);

  if (!courseData) {
    // Not enrolled, redirect to course overview
    redirect(`/course/${id}`);
  }

  return (
    <CoursePlayer
      course={courseData}
      currentLessonId={courseData.currentLessonId}
      initialTime={courseData.initialTime}
      enrollmentId={courseData.enrollmentId}
      otherStudents={courseData.otherStudents}
      totalOtherStudents={courseData.totalOtherStudents}
    />
  );
}
