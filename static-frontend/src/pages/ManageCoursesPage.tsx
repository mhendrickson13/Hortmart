import { useQuery } from "@tanstack/react-query";
import { courses as coursesApi } from "@/lib/api-client";
import { CoursesList } from "@/components/admin/courses-list";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageCoursesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-courses"],
    queryFn: () => coursesApi.list({ mine: "true" }),
  });

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </>
    );
  }

  const coursesList = data?.courses || [];

  return (
    <>
      <AdminPageHeader
        title="Manage Courses"
      />
      <CoursesList courses={coursesList as any} />
    </>
  );
}
