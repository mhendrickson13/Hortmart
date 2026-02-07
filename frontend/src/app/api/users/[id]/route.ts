import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    const [userRes, enrollmentsRes] = await Promise.all([
      fetch(`${API_URL}/users/${id}`, { headers, cache: "no-store" }),
      fetch(`${API_URL}/users/${id}/enrollments`, { headers, cache: "no-store" }),
    ]);

    if (!userRes.ok) {
      if (userRes.status === 404) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (userRes.status === 403) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const err = await userRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { error?: string }).error || "Failed to fetch user" },
        { status: userRes.status }
      );
    }

    const userPayload = await userRes.json();
    const user = (userPayload as { user: Record<string, unknown> }).user;

    let enrollments: Array<{
      id: string;
      courseId: string;
      courseTitle: string;
      coursePrice: number;
      enrolledAt: string;
      totalLessons: number;
      completedLessons: number;
      progressPercent: number;
      lastActivityAt: string | null;
      isCompleted: boolean;
    }> = [];

    if (enrollmentsRes.ok) {
      const enrollmentsPayload = await enrollmentsRes.json();
      const raw = (enrollmentsPayload as { enrollments: Array<Record<string, unknown>> })
        .enrollments;
      enrollments = raw.map((e) => ({
        id: String(e.id),
        courseId: String(e.courseId),
        courseTitle: String(e.courseTitle),
        coursePrice: Number(e.coursePrice ?? 0),
        enrolledAt:
          typeof e.enrolledAt === "string"
            ? e.enrolledAt
            : (e.enrolledAt as Date)?.toISOString?.() ?? "",
        totalLessons: Number(e.totalLessons ?? 0),
        completedLessons: Number(e.completedLessons ?? 0),
        progressPercent: Number(e.progressPercent ?? e.progress ?? 0),
        lastActivityAt:
          e.lastActivityAt != null ? String(e.lastActivityAt) : null,
        isCompleted: Boolean(e.isCompleted),
      }));
    }

    const completedCourses = enrollments.filter((e) => e.isCompleted).length;
    const lifetimeSpend = enrollments.reduce((sum, e) => sum + e.coursePrice, 0);
    const avgProgress =
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + e.progressPercent, 0) /
              enrollments.length
          )
        : 0;
    const lastPurchaseAt =
      enrollments.length > 0
        ? (() => {
            let best = enrollments[0].enrolledAt;
            let bestTime = new Date(best).getTime();
            for (const e of enrollments) {
              const t = new Date(e.enrolledAt).getTime();
              if (t > bestTime) {
                bestTime = t;
                best = e.enrolledAt;
              }
            }
            return best;
          })()
        : null;

    const kpis = {
      lifetimeSpend,
      avgProgress,
      lastPurchaseAt,
      completedCourses,
    };

    return NextResponse.json({
      user: {
        ...user,
        emailVerified: (user as { emailVerified?: string | null }).emailVerified ?? null,
        lastActiveAt: (user as { lastActiveAt?: string | null }).lastActiveAt ?? null,
      },
      enrollments,
      kpis,
    });
  } catch (error) {
    console.error("User detail API error:", error);
    return NextResponse.json(
      { error: "Failed to load user details" },
      { status: 500 }
    );
  }
}
