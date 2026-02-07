import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverApi, Course, Module, Lesson, Resource } from "@/lib/server-api";
import { CourseEditor } from "./course-editor";

interface CourseWithModules extends Course {
  modules: Array<Module & {
    lessons: Array<Lesson & {
      resources?: Resource[];
    }>;
  }>;
}

async function getCourse(id: string): Promise<CourseWithModules | null> {
  try {
    const course = await serverApi.courses.get(id);
    return course as CourseWithModules;
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return null;
  }
}

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    notFound();
  }

  const { id } = await params;
  const course = await getCourse(id);

  if (!course) {
    notFound();
  }

  // Transform course to match editor expected format
  const editorCourse = {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    status: course.status,
    price: course.price,
    level: course.level || "BEGINNER",
    category: course.category,
    language: course.language || "en",
    modules: (course.modules || []).map((module) => ({
      id: module.id,
      title: module.title,
      position: module.position ?? module.order ?? 0,
      lessons: (module.lessons || []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        durationSeconds: lesson.durationSeconds,
        isLocked: lesson.isLocked ?? false,
        isFreePreview: lesson.isFreePreview ?? lesson.isFree ?? false,
        position: lesson.position ?? lesson.order ?? 0,
      })),
    })),
  };

  return <CourseEditor course={editorCourse} />;
}
