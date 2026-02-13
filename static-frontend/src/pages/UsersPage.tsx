import { useQuery } from "@tanstack/react-query";
import { users as usersApi } from "@/lib/api-client";
import { UsersList } from "@/components/admin/users-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => usersApi.list({ limit: 100 }),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
        <p className="text-text-2 text-body font-bold">Failed to load users</p>
        <p className="text-text-3 text-body-sm">{(error as any)?.message || "Something went wrong"}</p>
        <button onClick={() => refetch()} className="h-10 px-4 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px]">Try again</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const allUsers = (data?.users || []).map((user: any) => ({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role as "LEARNER" | "CREATOR" | "ADMIN",
      createdAt: user.createdAt,
      blockedAt: user.blockedAt ?? null,
    },
    enrolledCount: user._count?.enrollments ?? 0,
    completedCoursesCount: user.completedCoursesCount ?? 0,
    lastActive: user.lastActiveAt ?? null,
  }));

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const activeUsers = allUsers.filter((u: any) => {
    if (!u.lastActive) return false;
    return now - new Date(u.lastActive).getTime() <= SEVEN_DAYS_MS;
  });
  const completedUsers = allUsers.filter((u: any) => u.completedCoursesCount > 0);

  return (
    <UsersList
      allUsers={allUsers}
      activeUsers={activeUsers}
      completedUsers={completedUsers}
      totalCount={allUsers.length}
      activeCount={activeUsers.length}
      completedCount={completedUsers.length}
      onRefresh={() => refetch()}
    />
  );
}
