import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const level = searchParams.get("level");
    const priceRange = searchParams.get("priceRange");
    const sort = searchParams.get("sort") || "newest";

    // Build where clause
    const where: Record<string, unknown> = {
      status: "PUBLISHED",
    };

    // Search in title and description
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { subtitle: { contains: query } },
      ];
    }

    // Category filter
    if (category && category !== "all") {
      where.category = category;
    }

    // Level filter
    if (level && level !== "all") {
      where.level = level;
    }

    // Price filter
    if (priceRange === "free") {
      where.price = 0;
    } else if (priceRange === "paid") {
      where.price = { gt: 0 };
    }

    // Build orderBy
    let orderBy: Record<string, string> = { publishedAt: "desc" };
    switch (sort) {
      case "popular":
        orderBy = { enrollments: { _count: "desc" } };
        break;
      case "price-low":
        orderBy = { price: "asc" };
        break;
      case "price-high":
        orderBy = { price: "desc" };
        break;
      case "newest":
      default:
        orderBy = { publishedAt: "desc" };
    }

    const courses = await db.course.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        modules: {
          include: {
            lessons: {
              select: {
                id: true,
                durationSeconds: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
      },
      orderBy,
    });

    // Transform data
    const transformedCourses = courses.map((course) => {
      const allLessons = course.modules.flatMap((m) => m.lessons);
      return {
        ...course,
        totalDuration: allLessons.reduce((sum, l) => sum + l.durationSeconds, 0),
        lessonsCount: allLessons.length,
        modules: undefined, // Remove modules from response
      };
    });

    // Get unique categories for filter
    const categories = await db.course.findMany({
      where: { status: "PUBLISHED" },
      select: { category: true },
      distinct: ["category"],
    });

    const uniqueCategories = categories
      .map((c) => c.category)
      .filter((c): c is string => c !== null);

    return NextResponse.json({
      courses: transformedCourses,
      filters: {
        categories: uniqueCategories,
        levels: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"],
      },
      total: transformedCourses.length,
    });
  } catch (error) {
    console.error("Course search error:", error);
    return NextResponse.json(
      { error: "Failed to search courses" },
      { status: 500 }
    );
  }
}
