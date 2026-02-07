import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { CoursesList } from "@/components/admin/courses-list";

async function getAdminCourses(isAdmin: boolean) {
  try {
    if (isAdmin) {
      const result = await serverApi.courses.list({ limit: 100 });
      return result.data || [];
    }
    const result = await serverApi.courses.getMyCourses();
    return result.data || [];
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return [];
  }
}

export default async function AdminCoursesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const courses = await getAdminCourses(isAdmin);

  // Transform to match CoursesList expected shape (updatedAt, coverImage, _count)
  const coursesWithCount = courses.map((course) => ({
    ...course,
    coverImage: course.coverImage ?? null,
    updatedAt: new Date(course.updatedAt ?? course.createdAt),
    _count: {
      enrollments: course._count?.enrollments ?? 0,
    },
  }));

  return (
    <CoursesList
      courses={coursesWithCount as Parameters<typeof CoursesList>[0]["courses"]}
    />
  );
}
