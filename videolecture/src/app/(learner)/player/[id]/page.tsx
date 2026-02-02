import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CoursePlayer } from "./course-player";

async function getCourseWithProgress(courseId: string, userId: string) {
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
    include: {
      course: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          modules: {
            orderBy: { position: "asc" },
            include: {
              lessons: {
                orderBy: { position: "asc" },
                include: {
                  resources: true,
                },
              },
            },
          },
        },
      },
      lessonProgress: true,
    },
  });

  if (!enrollment) return null;

  // Transform to include progress in lessons
  const modulesWithProgress = enrollment.course.modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => ({
      ...lesson,
      progress: enrollment.lessonProgress.find(
        (p) => p.lessonId === lesson.id
      ) || null,
    })),
  }));

  // Find last played lesson or first available
  const allLessons = modulesWithProgress.flatMap((m) => m.lessons);
  const lastProgress = enrollment.lessonProgress
    .filter((p) => p.lastWatchedAt)
    .sort((a, b) => 
      new Date(b.lastWatchedAt!).getTime() - new Date(a.lastWatchedAt!).getTime()
    )[0];

  let currentLessonId = lastProgress?.lessonId;
  let initialTime = lastProgress?.lastWatchedTimestamp || 0;

  // If no progress, start with first available lesson
  if (!currentLessonId) {
    const firstAvailable = allLessons.find((l) => !l.isLocked);
    currentLessonId = firstAvailable?.id;
    initialTime = 0;
  }

  return {
    ...enrollment.course,
    modules: modulesWithProgress,
    currentLessonId,
    initialTime,
    enrollmentId: enrollment.id,
  };
}

export default async function PlayerPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const courseData = await getCourseWithProgress(params.id, session.user.id);

  if (!courseData) {
    // Not enrolled, redirect to course overview
    redirect(`/course/${params.id}`);
  }

  return (
    <CoursePlayer
      course={courseData}
      currentLessonId={courseData.currentLessonId}
      initialTime={courseData.initialTime}
      enrollmentId={courseData.enrollmentId}
    />
  );
}
