import { Suspense } from "react";
import { serverApi, Course } from "@/lib/server-api";
import { CourseCard } from "@/components/learner/course-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { CoursesSearch } from "./courses-search";

interface SearchParams {
  q?: string;
  category?: string;
  level?: string;
  priceRange?: string;
}

async function getCourses(searchParams: SearchParams) {
  try {
    const result = await serverApi.courses.list({
      status: "PUBLISHED",
      q: searchParams.q,
      category: searchParams.category !== "all" ? searchParams.category : undefined,
      level: searchParams.level !== "all" ? searchParams.level : undefined,
      priceRange: searchParams.priceRange !== "all" ? searchParams.priceRange : undefined,
    });

    return (result.data || []).map((course) => ({
      ...course,
      level: course.level || "ALL_LEVELS",
      totalDuration: course.totalDuration || 0,
      lessonsCount: course.lessonsCount || 0,
    }));
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return [];
  }
}

async function getCategories(): Promise<string[]> {
  try {
    const result = await serverApi.courses.getCategories();
    return result.categories || [];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
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
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const [courses, categories] = await Promise.all([
    getCourses(resolvedParams),
    getCategories(),
  ]);

  const hasFilters = resolvedParams.q || resolvedParams.category || resolvedParams.level || resolvedParams.priceRange;

  return (
    <>
      {/* Header with Search */}
      <CoursesSearch 
        totalCourses={courses.length} 
        categories={categories}
        currentFilters={resolvedParams}
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
