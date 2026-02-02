import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseEditor } from "./course-editor";

async function getCourse(id: string, creatorId: string) {
  return db.course.findFirst({
    where: { id, creatorId },
    include: {
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
  });
}

export default async function EditCoursePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user) {
    notFound();
  }

  const course = await getCourse(params.id, session.user.id);

  if (!course) {
    notFound();
  }

  return <CourseEditor course={course} />;
}
