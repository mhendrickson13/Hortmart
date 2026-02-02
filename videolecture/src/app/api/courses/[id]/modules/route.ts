import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const moduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  position: z.number().default(0),
});

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  position: z.number().optional(),
});

// GET all modules for a course
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;

    const modules = await db.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Module fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
}

// CREATE a new module
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
    const validation = moduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const module = await db.module.create({
      data: {
        ...validation.data,
        courseId,
      },
    });

    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    console.error("Module creation error:", error);
    return NextResponse.json(
      { error: "Failed to create module" },
      { status: 500 }
    );
  }
}
