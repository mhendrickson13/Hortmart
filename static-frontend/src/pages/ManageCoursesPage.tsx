import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { courses as coursesApi } from "@/lib/api-client";
import { CoursesList } from "@/components/admin/courses-list";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageCoursesPage() {
  const { t } = useTranslation();
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
        title={t("nav.manageCourses")}
      />
      <CoursesList courses={coursesList as any} />
    </>
  );
}
