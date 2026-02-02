import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const courseId = params.id;

    // Check if course exists and is published
    const course = await db.course.findUnique({
      where: { id: courseId, status: "PUBLISHED" },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.redirect(new URL(`/player/${courseId}`, request.url));
    }

    // Create enrollment (for free courses)
    // TODO: Add payment processing for paid courses
    if (course.price > 0) {
      return NextResponse.json(
        { error: "Payment required" },
        { status: 402 }
      );
    }

    await db.enrollment.create({
      data: {
        userId: session.user.id,
        courseId,
      },
    });

    return NextResponse.redirect(new URL(`/player/${courseId}`, request.url));
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json(
      { error: "Failed to enroll" },
      { status: 500 }
    );
  }
}
