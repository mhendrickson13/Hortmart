import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const lessonSchema = z.object({
  moduleId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  durationSeconds: z.number().default(0),
  position: z.number().default(0),
  isLocked: z.boolean().default(false),
  isFreePreview: z.boolean().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseId = params.id;

    // Verify course ownership
    const course = await db.course.findFirst({
      where: { id: courseId, creatorId: session.user.id },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = lessonSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    // Verify module belongs to course
    const module = await db.module.findFirst({
      where: { id: validation.data.moduleId, courseId },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const lesson = await db.lesson.create({
      data: validation.data,
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error("Lesson creation error:", error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}
