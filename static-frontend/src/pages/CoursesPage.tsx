import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { courses as coursesApi } from "@/lib/api-client";
import { CourseCard } from "@/components/learner/course-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function CourseSkeleton() {
  return (
    <div className="rounded-2xl border border-border/95 bg-white/92 shadow-card overflow-hidden">
      <Skeleton className="aspect-video" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-20" /></div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-4"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" /></div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["published-courses"],
    queryFn: () => coursesApi.list({ status: "PUBLISHED", limit: 100 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["course-categories"],
    queryFn: () => coursesApi.getCategories(),
  });

  const categories = categoriesData?.categories || [];
  const allCourses = data?.courses || [];

  // Apply filters
  let courses = allCourses;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    courses = courses.filter((c) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }
  if (categoryFilter !== "all") {
    courses = courses.filter((c) => c.category === categoryFilter);
  }
  if (levelFilter !== "all") {
    courses = courses.filter((c) => c.level === levelFilter);
  }
  if (priceFilter === "free") {
    courses = courses.filter((c) => c.price === 0);
  } else if (priceFilter === "paid") {
    courses = courses.filter((c) => c.price > 0);
  }

  const hasFilters = searchQuery || categoryFilter !== "all" || levelFilter !== "all" || priceFilter !== "all";

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
        <p className="text-text-2 text-body font-bold">Failed to load courses</p>
        <button onClick={() => refetch()} className="h-10 px-4 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px]">Try again</button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Explore Courses</h1>
            <p className="text-body-sm text-text-2 mt-0.5">{courses.length} courses available</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <Input placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="ALL_LEVELS">All Levels</option>
          </select>
          <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">Any Price</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setLevelFilter("all"); setPriceFilter("all"); }}
              className="h-9 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-primary hover:bg-primary/5 transition-colors">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CourseSkeleton key={i} />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-h3 font-semibold text-text-1 mb-2">
              {hasFilters ? "No courses match your search" : "No courses found"}
            </h3>
            <p className="text-body-sm text-text-2">
              {hasFilters ? "Try adjusting your filters or search terms" : "Check back soon for new courses!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => <CourseCard key={course.id} course={course} variant="catalog" />)}
        </div>
      )}
    </>
  );
}
