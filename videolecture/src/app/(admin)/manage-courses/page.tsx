import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseRow } from "@/components/admin/course-row";
import { Search, Plus, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function getCreatorCourses(creatorId: string) {
  return db.course.findMany({
    where: { creatorId },
    include: {
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function AdminCoursesPage() {
  const session = await auth();
  const courses = await getCreatorCourses(session!.user.id);

  const draftCourses = courses.filter((c) => c.status === "DRAFT");
  const publishedCourses = courses.filter((c) => c.status === "PUBLISHED");
  const archivedCourses = courses.filter((c) => c.status === "ARCHIVED");

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Courses</h1>
            <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
              Manage your courses and curriculum
            </p>
          </div>
          <Button asChild className="self-start sm:self-auto">
            <Link href="/manage-courses/new">
              <Plus className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Create course</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <Input placeholder="Search courses..." className="pl-10" />
          </div>
          <Button variant="secondary" size="icon" className="flex-shrink-0">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1">
        <TabsList>
          <TabsTrigger value="all">
            All <span className="ml-1.5 text-text-3">({courses.length})</span>
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
          {courses.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={{
                    ...course,
                    revenue: course.price * course._count.enrollments,
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="draft" className="mt-4">
          {draftCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-body-sm text-text-2">No draft courses</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {draftCourses.map((course) => (
                <CourseRow key={course.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-4">
          {publishedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-body-sm text-text-2">No published courses</p>
            </Card>
          ) : (
            <div className="space-y-2">
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
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-body-sm text-text-2">No archived courses</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {archivedCourses.map((course) => (
                <CourseRow key={course.id} course={course} />
              ))}
            </div>
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
