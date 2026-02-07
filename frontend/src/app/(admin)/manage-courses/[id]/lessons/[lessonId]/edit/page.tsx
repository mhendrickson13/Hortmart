import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { LessonEditor } from "./lesson-editor";

interface LessonData {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  position: number;
  isLocked: boolean;
  isFreePreview: boolean;
  moduleId: string;
  resources: Array<{
    id: string;
    title: string;
    type: string;
    url: string;
    fileSize: number | null;
  }>;
  module: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
      creatorId: string;
      status: string;
    };
  };
}

async function getLessonData(
  lessonId: string
): Promise<LessonData | null> {
  try {
    const data = await serverApi.lessons.get(lessonId);
    return data as unknown as LessonData;
  } catch {
    return null;
  }
}

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user) notFound();

  const { id: courseId, lessonId } = await params;
  const lesson = await getLessonData(lessonId);

  if (!lesson) notFound();

  return (
    <LessonEditor
      lesson={{
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || "",
        videoUrl: lesson.videoUrl || "",
        durationSeconds: lesson.durationSeconds,
        position: lesson.position,
        isLocked: lesson.isLocked,
        isFreePreview: lesson.isFreePreview,
        moduleId: lesson.moduleId,
        resources: lesson.resources || [],
      }}
      courseName={lesson.module?.course?.title || "Course"}
      courseId={courseId}
      moduleName={lesson.module?.title || "Module"}
      moduleId={lesson.moduleId}
    />
  );
}
