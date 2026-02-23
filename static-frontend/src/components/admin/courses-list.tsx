import { useNavigate } from "react-router-dom";
import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseRow, CourseRowHeader } from "@/components/admin/course-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Check, ChevronDown, X, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toaster";

/* ── Constants ──────────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "newest", label: "Last updated" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A → Z" },
  { value: "enrollments", label: "Most enrollments" },
] as const;

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "ALL_LEVELS", label: "All Levels" },
] as const;

const PRICE_OPTIONS = [
  { value: "all", label: "Any price" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
] as const;

type SortValue = typeof SORT_OPTIONS[number]["value"];
type PriceFilter = typeof PRICE_OPTIONS[number]["value"];

/* ── Inline Dropdown (stays open, click-outside to close) ──── */
function FilterDropdown({ trigger, children, align = "left" }: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((p) => !p)} className="cursor-pointer">{trigger}</div>
      {open && (
        <div className={cn(
          "absolute top-full mt-1.5 z-50 min-w-[180px] rounded-[14px] border border-border/95 bg-white dark:bg-card shadow-[0_14px_40px_rgba(21,25,35,0.12)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.4)] py-1.5 animate-in fade-in-0 zoom-in-95 duration-150",
          align === "right" ? "right-0" : "left-0"
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

function FilterOption({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-bold text-left transition-colors hover:bg-primary/5",
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

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  price: number;
  status: string;
  level: string;
  updatedAt: Date;
  _count: {
    enrollments: number;
  };
}

interface CoursesListProps {
  courses: Course[];
}

export function CoursesList({ courses: initialCourses }: CoursesListProps) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState(initialCourses);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("newest");
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Last updated";
  const levelLabel = LEVEL_OPTIONS.find((o) => o.value === levelFilter)?.label;
  const hasActiveFilters = levelFilter !== null || priceFilter !== "all";

  const clearAllFilters = () => {
    setLevelFilter(null);
    setPriceFilter("all");
    setSearchQuery("");
  };

  const handleRestore = async (id: string) => {
    try {
      await apiClient.courses.update(id, { status: "DRAFT" } as never);
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status: "DRAFT" } : c)));
      toast({ title: "Course restored as draft", variant: "success" });
      navigate(0);
    } catch {
      toast({ title: "Failed to restore course", variant: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    const course = courses.find((c) => c.id === id);
    if (!course || !window.confirm(`Permanently delete "${course.title}"? This cannot be undone.`)) return;
    try {
      await apiClient.courses.delete(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Course deleted", variant: "success" });
      navigate(0);
    } catch {
      toast({ title: "Failed to delete course", variant: "error" });
    }
  };

  const filteredCourses = useMemo(() => {
    let result = courses;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((course) =>
        course.title.toLowerCase().includes(query) ||
        course.subtitle?.toLowerCase().includes(query)
      );
    }

    // Level filter
    if (levelFilter) {
      result = result.filter((course) => course.level === levelFilter);
    }

    // Price filter
    if (priceFilter === "free") {
      result = result.filter((course) => course.price === 0);
    } else if (priceFilter === "paid") {
      result = result.filter((course) => course.price > 0);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "oldest":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "enrollments":
          return b._count.enrollments - a._count.enrollments;
        default:
          return 0;
      }
    });

    return result;
  }, [courses, searchQuery, sortBy, levelFilter, priceFilter]);

  const draftCourses = filteredCourses.filter((c) => c.status === "DRAFT");
  const publishedCourses = filteredCourses.filter((c) => c.status === "PUBLISHED");
  const archivedCourses = filteredCourses.filter((c) => c.status === "ARCHIVED");

  return (
    <>
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 h-14 flex-shrink-0">
        <h1 className="text-[22px] font-black tracking-tight text-text-1">
          Courses
        </h1>
        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="hidden sm:flex h-10 w-[340px] rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 items-center gap-2.5 px-3.5 text-text-3 font-bold text-[13px] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Search className="w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-text-3 text-text-1"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-text-3 hover:text-text-1 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Create Course Button */}
          <Button asChild className="h-10 rounded-[16px] px-3.5 gap-2 font-black text-[13px] shadow-[0_16px_34px_rgba(47,111,237,0.24)]">
            <Link to="/manage-courses/new">
              <Plus className="w-4 h-4" />
              Create course
            </Link>
          </Button>
        </div>
      </div>

      {/* ─── Filter bar ─── */}
      <div className="flex flex-wrap items-center gap-2.5 py-1">
        {/* Sort Dropdown */}
        <FilterDropdown
          trigger={
            <div className="h-9 rounded-[12px] border border-border/95 bg-white/95 dark:bg-card/95 px-3 inline-flex items-center gap-2 text-[12px] font-bold text-text-1 hover:border-primary/30 hover:bg-primary/[0.03] transition-all select-none">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-3" />
              <span className="hidden sm:inline text-text-3">Sort:</span>
              <span className="font-black">{sortLabel}</span>
              <ChevronDown className="w-3 h-3 text-text-3" />
            </div>
          }
        >
          <div className="px-3 py-1.5 text-[10px] font-black text-text-3 uppercase tracking-[0.5px]">Sort by</div>
          {SORT_OPTIONS.map((option) => (
            <FilterOption
              key={option.value}
              selected={sortBy === option.value}
              label={option.label}
              onClick={() => setSortBy(option.value)}
            />
          ))}
        </FilterDropdown>

        {/* Level Filter Dropdown */}
        <FilterDropdown
          trigger={
            <div className={cn(
              "h-9 rounded-[12px] border px-3 inline-flex items-center gap-2 text-[12px] font-bold transition-all select-none",
              levelFilter
                ? "border-primary/30 bg-primary/[0.06] text-primary-600 hover:bg-primary/10"
                : "border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:border-primary/30 hover:bg-primary/[0.03]"
            )}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="font-black">{levelLabel ?? "Level"}</span>
              <ChevronDown className="w-3 h-3 text-text-3" />
            </div>
          }
        >
          <div className="px-3 py-1.5 text-[10px] font-black text-text-3 uppercase tracking-[0.5px]">Level</div>
          <FilterOption
            selected={levelFilter === null}
            label="All levels"
            onClick={() => setLevelFilter(null)}
          />
          {LEVEL_OPTIONS.map((option) => (
            <FilterOption
              key={option.value}
              selected={levelFilter === option.value}
              label={option.label}
              onClick={() => setLevelFilter(option.value)}
            />
          ))}
        </FilterDropdown>

        {/* Price Filter Dropdown */}
        <FilterDropdown
          trigger={
            <div className={cn(
              "h-9 rounded-[12px] border px-3 inline-flex items-center gap-2 text-[12px] font-bold transition-all select-none",
              priceFilter !== "all"
                ? "border-primary/30 bg-primary/[0.06] text-primary-600 hover:bg-primary/10"
                : "border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:border-primary/30 hover:bg-primary/[0.03]"
            )}>
              <span className="font-black">{PRICE_OPTIONS.find((o) => o.value === priceFilter)?.label ?? "Price"}</span>
              <ChevronDown className="w-3 h-3 text-text-3" />
            </div>
          }
        >
          <div className="px-3 py-1.5 text-[10px] font-black text-text-3 uppercase tracking-[0.5px]">Price</div>
          {PRICE_OPTIONS.map((option) => (
            <FilterOption
              key={option.value}
              selected={priceFilter === option.value}
              label={option.label}
              onClick={() => setPriceFilter(option.value)}
            />
          ))}
        </FilterDropdown>

        {/* Active filter chips + Clear all */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 ml-1">
            <div className="w-px h-5 bg-border/80 mx-1" />
            {levelFilter && (
              <span className="h-[26px] px-2.5 rounded-full bg-primary/10 border border-primary/15 inline-flex items-center gap-1.5 text-[11px] font-black text-primary-600">
                {levelLabel}
                <button onClick={() => setLevelFilter(null)} className="hover:text-primary-600/70 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {priceFilter !== "all" && (
              <span className="h-[26px] px-2.5 rounded-full bg-primary/10 border border-primary/15 inline-flex items-center gap-1.5 text-[11px] font-black text-primary-600">
                {priceFilter === "free" ? "Free" : "Paid"}
                <button onClick={() => setPriceFilter("all")} className="hover:text-primary-600/70 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[11px] font-bold text-text-3 hover:text-primary transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Result count (right-aligned) */}
        <div className="ml-auto text-[11px] font-bold text-text-3">
          {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="all" className="flex-1">
        <TabsList>
          <TabsTrigger value="all">
            All <span className="ml-1.5 text-text-3">({filteredCourses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft <span className="ml-1.5 text-text-3">({draftCourses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="published">
            Published <span className="ml-1.5 text-text-3">({publishedCourses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived <span className="ml-1.5 text-text-3">({archivedCourses.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {filteredCourses.length === 0 ? (
            searchQuery ? (
              <Card className="p-8 text-center">
                <p className="text-body-sm text-text-2">
                  No courses found matching &quot;{searchQuery}&quot;
                </p>
              </Card>
            ) : (
              <EmptyState />
            )
          ) : (
            <Card className="p-3 sm:p-4">
              <CourseRowHeader />
              <div className="space-y-2 mt-2">
                {filteredCourses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={{
                      ...course,
                      revenue: course.price * course._count.enrollments,
                    }}
                    onRestore={handleRestore}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="draft" className="mt-4">
          {draftCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-body-sm text-text-2">
                {searchQuery ? `No draft courses matching "${searchQuery}"` : "No draft courses"}
              </p>
            </Card>
          ) : (
            <Card className="p-3 sm:p-4">
              <CourseRowHeader />
              <div className="space-y-2 mt-2">
                {draftCourses.map((course) => (
                  <CourseRow key={course.id} course={course} />
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-4">
          {publishedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-body-sm text-text-2">
                {searchQuery ? `No published courses matching "${searchQuery}"` : "No published courses"}
              </p>
            </Card>
          ) : (
            <Card className="p-3 sm:p-4">
              <CourseRowHeader />
              <div className="space-y-2 mt-2">
                {publishedCourses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={{
                      ...course,
                      revenue: course.price * course._count.enrollments,
                    }}
                  />
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-body-sm text-text-2">
                {searchQuery ? `No archived courses matching "${searchQuery}"` : "No archived courses"}
              </p>
            </Card>
          ) : (
            <Card className="p-3 sm:p-4">
              <CourseRowHeader />
              <div className="space-y-2 mt-2">
                {archivedCourses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    onRestore={handleRestore}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
          <Plus className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-h3 font-semibold text-text-1 mb-2">
          Create your first course
        </h3>
        <p className="text-body-sm text-text-2 mb-4 max-w-sm">
          Share your knowledge with the world. Create engaging video courses and
          build your audience.
        </p>
        <Button asChild>
          <Link to="/manage-courses/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Create course
          </Link>
        </Button>
      </div>
    </div>
  );
}
