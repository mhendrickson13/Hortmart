import { Suspense } from "react";
import { db } from "@/lib/db";
import { CourseCard } from "@/components/learner/course-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { CoursesSearch } from "./courses-search";

async function getCourses(searchParams: {
  q?: string;
  category?: string;
  level?: string;
  priceRange?: string;
}) {
  const where: Record<string, unknown> = {
    status: "PUBLISHED",
  };

  // Search query
  if (searchParams.q) {
    where.OR = [
      { title: { contains: searchParams.q } },
      { description: { contains: searchParams.q } },
      { subtitle: { contains: searchParams.q } },
    ];
  }

  // Category filter
  if (searchParams.category && searchParams.category !== "all") {
    where.category = searchParams.category;
  }

  // Level filter
  if (searchParams.level && searchParams.level !== "all") {
    where.level = searchParams.level;
  }

  // Price filter
  if (searchParams.priceRange === "free") {
    where.price = 0;
  } else if (searchParams.priceRange === "paid") {
    where.price = { gt: 0 };
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
    orderBy: {
      publishedAt: "desc",
    },
  });

  return courses.map((course) => {
    const allLessons = course.modules.flatMap((m) => m.lessons);
    return {
      ...course,
      totalDuration: allLessons.reduce((sum, l) => sum + l.durationSeconds, 0),
      lessonsCount: allLessons.length,
    };
  });
}

async function getCategories() {
  const categories = await db.course.findMany({
    where: { status: "PUBLISHED" },
    select: { category: true },
    distinct: ["category"],
  });
  return categories.map((c) => c.category).filter((c): c is string => c !== null);
}

function CourseSkeleton() {
  return (
    <div className="rounded-2xl border border-border/95 bg-white/92 shadow-card overflow-hidden">
      <Skeleton className="aspect-video" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; level?: string; priceRange?: string };
}) {
  const [courses, categories] = await Promise.all([
    getCourses(searchParams),
    getCategories(),
  ]);

  const hasFilters = searchParams.q || searchParams.category || searchParams.level || searchParams.priceRange;

  return (
    <>
      {/* Header with Search */}
      <CoursesSearch 
        totalCourses={courses.length} 
        categories={categories}
        currentFilters={searchParams}
      />

      {/* Course Grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <CourseSkeleton key={i} />
            ))}
          </div>
        }
      >
        {courses.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-h3 font-semibold text-text-1 mb-2">
                {hasFilters ? "No courses match your search" : "No courses found"}
              </h3>
              <p className="text-body-sm text-text-2">
                {hasFilters 
                  ? "Try adjusting your filters or search terms"
                  : "Check back soon for new courses!"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} variant="catalog" />
            ))}
          </div>
        )}
      </Suspense>
    </>
  );
}
