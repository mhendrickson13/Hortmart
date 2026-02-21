import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { courses as coursesApi, users as usersApi } from "@/lib/api-client";
import { CourseCard } from "@/components/learner/course-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppPreferences } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";

function CourseSkeleton() {
  return (
    <div className="rounded-2xl border border-border/95 bg-white/92 dark:bg-card/92 shadow-card overflow-hidden">
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

/* ── Filter option row with checkbox ── */
function FilterOption({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3.5 py-[7px] text-[12.5px] font-bold text-left transition-colors hover:bg-primary/5",
        selected && "text-primary-600 bg-primary/[0.06]"
      )}
    >
      <span className={cn(
        "w-4 h-4 rounded-[5px] border-[1.5px] flex items-center justify-center transition-all flex-shrink-0",
        selected ? "border-primary bg-primary text-white" : "border-border"
      )}>
        {selected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function CoursesPage() {
  const { t } = useAppPreferences();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["published-courses"],
    queryFn: () => coursesApi.list({ status: "PUBLISHED", limit: 100 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["course-categories"],
    queryFn: () => coursesApi.getCategories(),
  });

  // Close filter dropdown on click outside
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const categories = categoriesData?.categories || [];
  const allCourses = data?.courses || [];

  // Fetch user enrollments to show progress on catalog cards
  const { data: enrollmentData } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => usersApi.getProfileEnrollments(),
    enabled: !!user,
  });

  // Build a map of courseId -> progress for enrolled courses
  const progressMap = useMemo(() => {
    const map: Record<string, { completedLessons: number; totalLessons: number; progressPercent: number }> = {};
    if (!enrollmentData?.enrollments) return map;
    for (const enrollment of enrollmentData.enrollments) {
      const course = (enrollment as any).course;
      if (!course?.id) continue;
      const modules = course.modules || [];
      const allLessons = modules.flatMap((m: any) => m.lessons || []);
      const totalLessons = allLessons.length;
      const lessonProgress = (enrollment as any).lessonProgress || [];
      const completedLessons = lessonProgress.filter((p: any) => p.completedAt !== null).length;
      map[course.id] = {
        completedLessons,
        totalLessons,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    }
    return map;
  }, [enrollmentData]);

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
  const activeFilterCount = [categoryFilter !== "all", levelFilter !== "all", priceFilter !== "all"].filter(Boolean).length;

  const clearAll = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setLevelFilter("all");
    setPriceFilter("all");
  };

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
      {/* ── Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] sm:text-h1 font-black tracking-[-0.25px] text-text-1">{t("courses.title")}</h1>
            <p className="text-[12px] font-extrabold text-text-3 mt-1">
              {isLoading ? "Loading..." : `${courses.length} course${courses.length !== 1 ? "s" : ""} available`}
            </p>
          </div>
        </div>

        {/* ── Search bar with Filter button ── */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-[46px] rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 flex items-center gap-2.5 px-3.5 shadow-[0_14px_28px_rgba(21,25,35,0.05)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)] focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Search className="w-4 h-4 text-text-3 flex-shrink-0" />
            <input
              type="text"
              placeholder={t("courses.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[13px] font-extrabold text-text-1 placeholder:text-text-3"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-text-3 hover:text-text-1 transition-colors p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter button + dropdown */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className={cn(
                "h-[34px] px-3 rounded-full border inline-flex items-center gap-2 text-[12px] font-black transition-all flex-shrink-0",
                filterOpen || activeFilterCount > 0
                  ? "border-primary/25 bg-primary/10 text-primary-600"
                  : "border-border/95 bg-white/95 dark:bg-card/95 text-text-2 hover:border-primary/20"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {t("common.filter")}
              {activeFilterCount > 0 && (
                <span className="w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* ── Filter Dropdown ── */}
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[280px] rounded-[18px] border border-border/95 bg-white dark:bg-card shadow-[0_18px_50px_rgba(21,25,35,0.14)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
                  <span className="text-[13px] font-black text-text-1">{t("common.filter")}</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAll} className="text-[11px] font-bold text-primary hover:underline">
                      Clear all
                    </button>
                  )}
                </div>

                {/* Category section */}
                {categories.length > 0 && (
                  <div className="mt-1">
                    <div className="px-3.5 py-1.5 text-[10px] font-black text-text-3 uppercase tracking-[0.5px]">Category</div>
                    <FilterOption selected={categoryFilter === "all"} label="All categories" onClick={() => setCategoryFilter("all")} />
                    {categories.map((cat) => (
                      <FilterOption key={cat} selected={categoryFilter === cat} label={cat} onClick={() => setCategoryFilter(cat)} />
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div className="mx-3.5 my-1 h-px bg-border/80" />

                {/* Level section */}
                <div>
                  <div className="px-3.5 py-1.5 text-[10px] font-black text-text-3 uppercase tracking-[0.5px]">Level</div>
                  <FilterOption selected={levelFilter === "all"} label={t("courses.allLevels")} onClick={() => setLevelFilter("all")} />
                  <FilterOption selected={levelFilter === "BEGINNER"} label={t("courses.beginner")} onClick={() => setLevelFilter("BEGINNER")} />
                  <FilterOption selected={levelFilter === "INTERMEDIATE"} label={t("courses.intermediate")} onClick={() => setLevelFilter("INTERMEDIATE")} />
                  <FilterOption selected={levelFilter === "ADVANCED"} label={t("courses.advanced")} onClick={() => setLevelFilter("ADVANCED")} />
                  <FilterOption selected={levelFilter === "ALL_LEVELS"} label={t("courses.allLevels")} onClick={() => setLevelFilter("ALL_LEVELS")} />
                </div>

                {/* Divider */}
                <div className="mx-3.5 my-1 h-px bg-border/80" />

                {/* Price section */}
                <div className="pb-2">
                  <div className="px-3.5 py-1.5 text-[10px] font-black text-text-3 uppercase tracking-[0.5px]">Price</div>
                  <FilterOption selected={priceFilter === "all"} label={t("courses.price")} onClick={() => setPriceFilter("all")} />
                  <FilterOption selected={priceFilter === "free"} label={t("courses.free")} onClick={() => setPriceFilter("free")} />
                  <FilterOption selected={priceFilter === "paid"} label="Paid" onClick={() => setPriceFilter("paid")} />
                </div>

                {/* Apply button */}
                <div className="px-3.5 pb-3 pt-1">
                  <button
                    onClick={() => setFilterOpen(false)}
                    className="w-full h-9 rounded-xl bg-primary text-white text-[12px] font-black shadow-[0_14px_28px_rgba(47,111,237,0.22)] hover:brightness-110 transition-all"
                  >
                    Show {courses.length} course{courses.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Active filter chips (shown below search when filters are active) ── */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryFilter !== "all" && (
              <span className="h-[26px] px-2.5 rounded-full bg-primary/10 border border-primary/15 inline-flex items-center gap-1.5 text-[11px] font-black text-primary-600">
                {categoryFilter}
                <button onClick={() => setCategoryFilter("all")} className="hover:text-primary/70"><X className="w-3 h-3" /></button>
              </span>
            )}
            {levelFilter !== "all" && (
              <span className="h-[26px] px-2.5 rounded-full bg-primary/10 border border-primary/15 inline-flex items-center gap-1.5 text-[11px] font-black text-primary-600">
                {levelFilter === "ALL_LEVELS" ? "All Levels" : levelFilter.charAt(0) + levelFilter.slice(1).toLowerCase()}
                <button onClick={() => setLevelFilter("all")} className="hover:text-primary/70"><X className="w-3 h-3" /></button>
              </span>
            )}
            {priceFilter !== "all" && (
              <span className="h-[26px] px-2.5 rounded-full bg-primary/10 border border-primary/15 inline-flex items-center gap-1.5 text-[11px] font-black text-primary-600">
                {priceFilter === "free" ? "Free" : "Paid"}
                <button onClick={() => setPriceFilter("all")} className="hover:text-primary/70"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={clearAll} className="text-[11px] font-bold text-text-3 hover:text-primary transition-colors ml-1">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Course Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {[...Array(6)].map((_, i) => <CourseSkeleton key={i} />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-h3 font-semibold text-text-1 mb-2">
              {hasFilters ? t("common.noResults") : t("common.noResults")}
            </h3>
            <p className="text-body-sm text-text-2 mb-4">
              {hasFilters ? "Try adjusting your filters or search terms" : "Check back soon for new courses!"}
            </p>
            {hasFilters && (
              <button onClick={clearAll} className="h-9 px-4 rounded-xl border border-primary/55 bg-primary text-white font-black text-[12px]">
                Clear all filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {courses.map((course) => <CourseCard key={course.id} course={course} variant={progressMap[course.id] ? "enrolled" : "catalog"} progress={progressMap[course.id]} />)}
        </div>
      )}
    </>
  );
}
