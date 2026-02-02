import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  position: z.number().optional(),
});

// GET a single module
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const moduleId = params.id;

    const module = await db.module.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          orderBy: { position: "asc" },
          include: {
            resources: true,
          },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error("Module fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 }
    );
  }
}

// UPDATE a module
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const moduleId = params.id;

    // Verify ownership through module -> course
    const existingModule = await db.module.findUnique({
      where: { id: moduleId },
      include: {
        course: true,
      },
    });

    if (!existingModule || existingModule.course.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateModuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const module = await db.module.update({
      where: { id: moduleId },
      data: validation.data,
    });

    return NextResponse.json({ module });
  } catch (error) {
    console.error("Module update error:", error);
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 }
    );
  }
}

// DELETE a module
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const moduleId = params.id;

    // Verify ownership
    const existingModule = await db.module.findUnique({
      where: { id: moduleId },
      include: {
        course: true,
      },
    });

    if (!existingModule || existingModule.course.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Delete module (will cascade delete lessons due to schema)
    await db.module.delete({
      where: { id: moduleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Module delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete module" },
      { status: 500 }
    );
  }
}
