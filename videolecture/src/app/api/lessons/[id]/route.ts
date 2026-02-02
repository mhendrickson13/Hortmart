import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  durationSeconds: z.number().optional(),
  isLocked: z.boolean().optional(),
  isFreePreview: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lessonId = params.id;

    // Verify ownership through module -> course
    const existingLesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!existingLesson || existingLesson.module.course.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateLessonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const lesson = await db.lesson.update({
      where: { id: lessonId },
      data: validation.data,
    });

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Lesson update error:", error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lessonId = params.id;

    // Verify ownership
    const existingLesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!existingLesson || existingLesson.module.course.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    await db.lesson.delete({
      where: { id: lessonId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lesson delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}
