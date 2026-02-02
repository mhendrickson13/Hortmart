import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const progressSchema = z.object({
  enrollmentId: z.string(),
  progressPercent: z.number().min(0).max(100),
  lastWatchedTimestamp: z.number().optional(),
  completed: z.boolean().optional(),
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

    const body = await request.json();
    const validation = progressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { enrollmentId, progressPercent, lastWatchedTimestamp, completed } =
      validation.data;
    const lessonId = params.id;

    // Verify enrollment belongs to user
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment || enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upsert progress
    const progress = await db.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId,
          lessonId,
        },
      },
      update: {
        progressPercent: Math.max(progressPercent, 0),
        lastWatchedTimestamp: lastWatchedTimestamp ?? undefined,
        lastWatchedAt: new Date(),
        ...(completed && { completedAt: new Date() }),
      },
      create: {
        enrollmentId,
        lessonId,
        progressPercent,
        lastWatchedTimestamp: lastWatchedTimestamp ?? 0,
        lastWatchedAt: new Date(),
        ...(completed && { completedAt: new Date() }),
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Progress update error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lessonId = params.id;
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Enrollment ID required" },
        { status: 400 }
      );
    }

    const progress = await db.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId,
          lessonId,
        },
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
