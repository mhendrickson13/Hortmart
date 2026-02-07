import { auth } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { UsersList } from "@/components/admin/users-list";

interface UserData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: "LEARNER" | "CREATOR" | "ADMIN";
    createdAt: string;
  };
  enrolledCount: number;
  completedCoursesCount: number;
  lastActive: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function getUsersData() {
  try {
    const usersResult = await serverApi.users.list({ limit: 100 });
    const users = usersResult.data || [];

    const allUsers: UserData[] = users.map((user) => ({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
      },
      enrolledCount: user._count?.enrollments ?? 0,
      completedCoursesCount: user.completedCoursesCount ?? 0,
      lastActive: user.lastActiveAt ?? null,
    }));

    const now = Date.now();
    const activeUsers = allUsers.filter((u) => {
      if (!u.lastActive) return false;
      const t = new Date(u.lastActive).getTime();
      return now - t <= SEVEN_DAYS_MS;
    });
    const completedUsers = allUsers.filter((u) => u.completedCoursesCount > 0);

    return {
      allUsers,
      activeUsers,
      completedUsers,
      totalCount: allUsers.length,
      activeCount: activeUsers.length,
      completedCount: completedUsers.length,
    };
  } catch (error) {
    console.error("Failed to fetch users data:", error);
    return {
      allUsers: [],
      activeUsers: [],
      completedUsers: [],
      totalCount: 0,
      activeCount: 0,
      completedCount: 0,
    };
  }
}

export default async function UsersPage() {
  const session = await auth();
  const data = await getUsersData();

  return <UsersList {...data} />;
}
