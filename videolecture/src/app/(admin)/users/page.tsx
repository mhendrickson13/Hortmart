import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Users, UserCheck, GraduationCap, Mail } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";

async function getUsersData(creatorId: string) {
  // Get all users who enrolled in creator's courses
  const courses = await db.course.findMany({
    where: { creatorId },
    select: { id: true },
  });

  const courseIds = courses.map((c) => c.id);

  // Get enrollments with user data
  const enrollments = await db.enrollment.findMany({
    where: {
      courseId: { in: courseIds },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      lessonProgress: {
        select: {
          completedAt: true,
          progressPercent: true,
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  // Aggregate user data
  const userMap = new Map<
    string,
    {
      user: typeof enrollments[0]["user"];
      enrolledCourses: Array<{
        courseId: string;
        courseTitle: string;
        progress: number;
        completed: boolean;
        enrolledAt: Date;
      }>;
      totalProgress: number;
      firstEnrolled: Date;
      lastActive: Date | null;
    }
  >();

  enrollments.forEach((enrollment) => {
    const userId = enrollment.user.id;
    const completedLessons = enrollment.lessonProgress.filter(
      (p) => p.completedAt !== null
    ).length;
    const totalLessons = enrollment.lessonProgress.length;
    const progress =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const completed = totalLessons > 0 && completedLessons === totalLessons;

    const existing = userMap.get(userId);
    if (existing) {
      existing.enrolledCourses.push({
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.title,
        progress,
        completed,
        enrolledAt: enrollment.enrolledAt,
      });
      existing.totalProgress = Math.round(
        existing.enrolledCourses.reduce((sum, c) => sum + c.progress, 0) /
          existing.enrolledCourses.length
      );
      if (
        enrollment.enrolledAt < existing.firstEnrolled
      ) {
        existing.firstEnrolled = enrollment.enrolledAt;
      }
    } else {
      userMap.set(userId, {
        user: enrollment.user,
        enrolledCourses: [
          {
            courseId: enrollment.course.id,
            courseTitle: enrollment.course.title,
            progress,
            completed,
            enrolledAt: enrollment.enrolledAt,
          },
        ],
        totalProgress: progress,
        firstEnrolled: enrollment.enrolledAt,
        lastActive: null,
      });
    }
  });

  const users = Array.from(userMap.values()).sort(
    (a, b) => b.firstEnrolled.getTime() - a.firstEnrolled.getTime()
  );

  const activeUsers = users.filter((u) => u.totalProgress > 0);
  const completedUsers = users.filter((u) =>
    u.enrolledCourses.some((c) => c.completed)
  );

  return {
    allUsers: users,
    activeUsers,
    completedUsers,
    totalCount: users.length,
    activeCount: activeUsers.length,
    completedCount: completedUsers.length,
  };
}

export default async function UsersPage() {
  const session = await auth();
  const data = await getUsersData(session!.user.id);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Users</h1>
          <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
            Manage learners enrolled in your courses
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64 lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <Input placeholder="Search users..." className="pl-10" />
          </div>
          <Button variant="secondary" size="icon" className="flex-shrink-0">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-h3 font-bold text-text-1">{data.totalCount}</div>
            <div className="text-caption text-text-3">Total Learners</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-success" />
          </div>
          <div>
            <div className="text-h3 font-bold text-text-1">{data.activeCount}</div>
            <div className="text-caption text-text-3">Active Learners</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="text-h3 font-bold text-text-1">{data.completedCount}</div>
            <div className="text-caption text-text-3">Course Completers</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1">
        <TabsList>
          <TabsTrigger value="all">
            All Users <span className="ml-1.5 text-text-3">({data.totalCount})</span>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active <span className="ml-1.5 text-text-3">({data.activeCount})</span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed <span className="ml-1.5 text-text-3">({data.completedCount})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <UserList users={data.allUsers} />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <UserList users={data.activeUsers} />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <UserList users={data.completedUsers} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function UserList({
  users,
}: {
  users: Array<{
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      role: string;
      createdAt: Date;
    };
    enrolledCourses: Array<{
      courseId: string;
      courseTitle: string;
      progress: number;
      completed: boolean;
      enrolledAt: Date;
    }>;
    totalProgress: number;
    firstEnrolled: Date;
  }>;
}) {
  if (users.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-h3 font-semibold text-text-1 mb-2">No users yet</h3>
        <p className="text-body-sm text-text-2">
          Users will appear here once they enroll in your courses.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {users.map(({ user, enrolledCourses, totalProgress, firstEnrolled }) => (
        <Card key={user.id} className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback>{getInitials(user.name || "U")}</AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-body-sm font-bold text-text-1">
                  {user.name || "Unnamed User"}
                </span>
                <Pill size="sm" variant="default">
                  {user.role}
                </Pill>
              </div>
              <div className="flex items-center gap-2 text-caption text-text-3 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
            </div>

            {/* Courses */}
            <div className="text-right">
              <div className="text-caption font-bold text-text-1">
                {enrolledCourses.length} course{enrolledCourses.length !== 1 ? "s" : ""}
              </div>
              <div className="text-caption text-text-3">
                {totalProgress}% avg. progress
              </div>
            </div>

            {/* Joined Date */}
            <div className="text-right min-w-[120px]">
              <div className="text-caption font-semibold text-text-2">Enrolled</div>
              <div className="text-caption text-text-3">{formatDate(firstEnrolled)}</div>
            </div>
          </div>

          {/* Enrolled Courses */}
          {enrolledCourses.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex flex-wrap gap-2">
                {enrolledCourses.map((course) => (
                  <div
                    key={course.courseId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-3 border border-border/50"
                  >
                    <span className="text-caption font-semibold text-text-1 truncate max-w-[200px]">
                      {course.courseTitle}
                    </span>
                    <Pill
                      size="sm"
                      variant={
                        course.completed
                          ? "completed"
                          : course.progress > 0
                          ? "in-progress"
                          : "locked"
                      }
                    >
                      {course.completed ? "Completed" : `${course.progress}%`}
                    </Pill>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
