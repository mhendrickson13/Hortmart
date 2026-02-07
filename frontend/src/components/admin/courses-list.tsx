"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseRow, CourseRowHeader } from "@/components/admin/course-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Filter, Check, Upload, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toaster";

function handleComingSoon(feature: string) {
  toast({
    title: `${feature} coming soon`,
    description: `${feature} functionality is under development.`,
    variant: "info",
  });
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
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "enrollments">("newest");
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    try {
      await apiClient.courses.update(id, { status: "DRAFT" } as never);
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status: "DRAFT" } : c)));
      toast({ title: "Course restored as draft", variant: "success" });
      router.refresh();
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
      router.refresh();
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
  }, [courses, searchQuery, sortBy, levelFilter]);

  const draftCourses = filteredCourses.filter((c) => c.status === "DRAFT");
  const publishedCourses = filteredCourses.filter((c) => c.status === "PUBLISHED");
  const archivedCourses = filteredCourses.filter((c) => c.status === "ARCHIVED");

  return (
    <>
      {/* Header - matches client_designs/admin_courses_list_desktop.html */}
      <div className="flex items-center justify-between gap-3 h-14 flex-shrink-0">
        <h1 className="text-[22px] font-black tracking-tight text-text-1">
          Courses
        </h1>
        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="hidden sm:flex h-10 w-[380px] rounded-[16px] border border-border/95 bg-white/95 items-center gap-2.5 px-3.5 text-text-3 font-bold text-[13px]">
            <Search className="w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-text-3 text-text-1"
            />
          </div>
          
          {/* Date range button */}
          <Button
            variant="secondary"
            onClick={() => handleComingSoon("Date range")}
            className="h-10 rounded-[16px] px-3.5 gap-2 font-bold text-[13px] border border-border/95 bg-white/95"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Date range</span>
          </Button>

          {/* Sort / Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="h-10 rounded-[16px] px-3.5 gap-2 font-bold text-[13px] border border-border/95 bg-white/95">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Sort: Last updated</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {[
                { value: "newest", label: "Last updated" },
                { value: "oldest", label: "Oldest first" },
                { value: "title", label: "Title A-Z" },
                { value: "enrollments", label: "Most enrollments" },
              ].map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value as typeof sortBy)}
                  className={cn(sortBy === option.value && "bg-primary/10")}
                >
                  {option.label}
                  {sortBy === option.value && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by level</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setLevelFilter(null)}
                className={cn(!levelFilter && "bg-primary/10")}
              >
                All levels
                {!levelFilter && <Check className="w-4 h-4 ml-auto" />}
              </DropdownMenuItem>
              {["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={cn(levelFilter === level && "bg-primary/10")}
                >
                  {level.replace("_", " ")}
                  {levelFilter === level && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import Button */}
          <Button
            variant="secondary"
            onClick={() => handleComingSoon("Import")}
            className="h-10 rounded-[16px] px-3.5 gap-2 font-black text-[13px] border border-border/95 bg-white/95"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          
          {/* Create Course Button */}
          <Button asChild className="h-10 rounded-[16px] px-3.5 gap-2 font-black text-[13px] shadow-[0_16px_34px_rgba(47,111,237,0.24)]">
            <Link href="/manage-courses/new">
              <Plus className="w-4 h-4" />
              Create course
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
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
          <Link href="/manage-courses/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Create course
          </Link>
        </Button>
      </div>
    </div>
  );
}
