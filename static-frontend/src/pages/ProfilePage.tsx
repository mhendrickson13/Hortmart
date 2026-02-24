import { useQuery } from "@tanstack/react-query";
import {
  users as usersApi,
  analytics as analyticsApi,
} from "@/lib/api-client";
import { useTranslation } from "react-i18next";
import type {
  User,
  LearnerStats,
  CreatorStats,
  EnrollmentWithProgress,
} from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import {
  Settings,
  BookOpen,
  Award,
  Clock,
  Users,
  Star,
  TrendingUp,
  Layers,
  Calendar,
  Mail,
  Edit,
  Target,
  BarChart3,
  LogOut,
} from "lucide-react";
import { getInitials, formatCurrency, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const isCreator = user?.role === "CREATOR" || user?.role === "ADMIN";

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user,
    staleTime: 10 * 60_000,
  });

  const { data: learnerStats } = useQuery({
    queryKey: ["learner-stats"],
    queryFn: () => analyticsApi.getLearnerStats(),
    enabled: !!user && !isCreator,
  });

  const { data: creatorStats } = useQuery({
    queryKey: ["creator-stats"],
    queryFn: () => analyticsApi.getCreatorStats(),
    enabled: !!user && isCreator,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const profile = (profileData?.user ?? user) as User | null;

  /* ──── Creator / Admin Profile ──── */
  if (isCreator && creatorStats) {
    return (
      <>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-h2 sm:text-h1 font-bold text-text-1">{t("nav.profile")}</h1>
            <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
              Your creator profile and stats
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/settings">
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("common.edit")} {t("nav.settings")}</span>
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 sm:gap-4 flex-1">
          {/* Main Content */}
          <div className="space-y-4">
            {/* Profile Card */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile?.image ?? undefined} />
                    <AvatarFallback className="text-h2">
                      {getInitials(profile?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    to="/settings"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-h2 font-bold text-text-1">
                      {profile?.name || "Creator"}
                    </h2>
                    <Pill variant="published">
                      {profile?.role === "ADMIN" ? "Admin" : "Creator"}
                    </Pill>
                  </div>

                  <div className="space-y-2 text-body-sm text-text-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-text-3" />
                      {profile?.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-3" />
                      Member since{" "}
                      {profile?.createdAt
                        ? formatDate(profile.createdAt)
                        : "N/A"}
                    </div>
                  </div>

                  {profile?.bio && (
                    <p className="mt-4 text-body-sm text-text-2">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                icon={BookOpen}
                bgColor="bg-primary/10"
                iconColor="text-primary"
                value={creatorStats.totalCourses}
                label="Total Courses"
              />
              <StatCard
                icon={Users}
                bgColor="bg-success/10"
                iconColor="text-success"
                value={creatorStats.totalEnrollments}
                label="Total Students"
              />
              <StatCard
                icon={TrendingUp}
                bgColor="bg-warning/10"
                iconColor="text-warning"
                value={formatCurrency(creatorStats.totalRevenue)}
                label="Total Revenue"
              />
              <StatCard
                icon={Star}
                bgColor="bg-accent/10"
                iconColor="text-accent"
                value={creatorStats.avgRating}
                label="Avg Rating"
              />
              <StatCard
                icon={Award}
                bgColor="bg-primary/10"
                iconColor="text-primary"
                value={creatorStats.publishedCourses}
                label="Published"
              />
              <StatCard
                icon={BarChart3}
                bgColor="bg-success/10"
                iconColor="text-success"
                value={creatorStats.totalReviews}
                label="Reviews"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card className="p-4">
              <h3 className="text-body font-bold text-text-1 mb-3">
                {t("dashboard.quickActions")}
              </h3>
              <div className="space-y-2">
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="secondary"
                >
                  <Link to="/manage-courses/new">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t("dashboard.createNewCourse")}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="secondary"
                >
                  <Link to="/analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t("dashboard.viewAnalytics")}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="secondary"
                >
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    {t("nav.settings")}
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Account Info */}
            <Card className="p-4">
              <h3 className="text-body font-bold text-text-1 mb-3">
                Account Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-3">Account Type</span>
                  <Pill size="sm" variant="published">
                    {profile?.role === "ADMIN" ? "Administrator" : "Creator"}
                  </Pill>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-3">
                    Member Since
                  </span>
                  <span className="text-caption font-medium text-text-1">
                    {profile?.createdAt
                      ? new Date(profile.createdAt as string).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                      : "—"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Help */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="text-body font-bold text-text-1 mb-2">
                Need Help?
              </h3>
              <p className="text-caption text-text-2 mb-3">
                Check our creator resources or contact support for assistance.
              </p>
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <a href="mailto:support@cxflow.io">Contact Support</a>
              </Button>
            </Card>
          </div>
        </div>
      </>
    );
  }

  /* ──── Learner Profile ──── */
  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">
            {t("nav.profile")}
          </h1>
          <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
            Your learning journey and progress
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 sm:gap-4 flex-1">
        {/* Main Content */}
        <div className="space-y-4">
          {/* Profile Card */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.image ?? undefined} />
                  <AvatarFallback className="text-h2">
                    {getInitials(profile?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <Link
                  to="/settings"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-h2 font-bold text-text-1">
                    {profile?.name || "Learner"}
                  </h2>
                  <Pill variant="default">Learner</Pill>
                </div>

                <div className="space-y-2 text-body-sm text-text-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-text-3" />
                    {profile?.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-text-3" />
                    Member since{" "}
                    {profile?.createdAt
                      ? formatDate(profile.createdAt)
                      : "N/A"}
                  </div>
                </div>

                {profile?.bio && (
                  <p className="mt-4 text-body-sm text-text-2">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard
              icon={BookOpen}
              bgColor="bg-primary/10"
              iconColor="text-primary"
              value={learnerStats?.totalCourses ?? 0}
              label="Enrolled Courses"
            />
            <StatCard
              icon={Award}
              bgColor="bg-success/10"
              iconColor="text-success"
              value={learnerStats?.completedCourses ?? 0}
              label="Completed"
            />
            <StatCard
              icon={TrendingUp}
              bgColor="bg-warning/10"
              iconColor="text-warning"
              value={learnerStats?.inProgressCourses ?? 0}
              label="In Progress"
            />
            <StatCard
              icon={Target}
              bgColor="bg-accent/10"
              iconColor="text-accent"
              value={learnerStats?.totalLessonsCompleted ?? 0}
              label="Lessons Done"
            />
            <StatCard
              icon={Clock}
              bgColor="bg-primary/10"
              iconColor="text-primary"
              value={`${(learnerStats?.totalWatchHours ?? 0).toFixed(1)}h`}
              label="Watch Time"
            />
            <StatCard
              icon={Star}
              bgColor="bg-success/10"
              iconColor="text-success"
              value={`${
                (learnerStats?.totalCourses ?? 0) > 0
                  ? Math.round(
                      ((learnerStats?.completedCourses ?? 0) /
                        (learnerStats?.totalCourses ?? 1)) *
                        100
                    )
                  : 0
              }%`}
              label="Completion Rate"
            />
          </div>

          {/* Recent Activity */}
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-4">
              Recent Activity
            </h3>
            {!learnerStats?.enrollments?.length ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-text-3 mb-3" />
                <p className="text-body-sm text-text-2">
                  You haven't enrolled in any courses yet.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/courses">Browse Courses</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {learnerStats.enrollments
                  .slice(0, 3)
                  .map((enrollment: EnrollmentWithProgress) => {
                    const course = enrollment.course;
                    if (!course) return null;
                    return (
                      <Link
                        key={enrollment.id}
                        to={`/player/${course.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl border border-border/95 bg-white/95 dark:bg-card/95 hover:bg-surface-3 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl gradient-primary flex-shrink-0 overflow-hidden">
                          {course.coverImage && (
                            <img
                              src={course.coverImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-body-sm font-semibold text-text-1 truncate">
                            {course.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress
                              value={enrollment.progress ?? 0}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-caption text-text-3">
                              {enrollment.progress ?? 0}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-3">
              {t("dashboard.quickActions")}
            </h3>
            <div className="space-y-2">
              <Button
                asChild
                className="w-full justify-start"
                variant="secondary"
              >
                <Link to="/courses">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t("nav.courses")}
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="secondary"
              >
                <Link to="/my-courses">
                  <Target className="w-4 h-4 mr-2" />
                  {t("courses.continueLearning")}
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="secondary"
              >
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  {t("nav.settings")}
                </Link>
              </Button>
              <Button
                className="w-full justify-start text-danger hover:text-danger"
                variant="secondary"
                onClick={() => { logout(); window.location.href = "/login"; }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </Card>

          {/* Account Info */}
          <Card className="p-4">
            <h3 className="text-body font-bold text-text-1 mb-3">
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-3">Account Type</span>
                <Pill size="sm" variant="published">
                  Learner
                </Pill>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-3">Member Since</span>
                <span className="text-caption font-medium text-text-1">
                  {profile?.createdAt
                    ? new Date(profile.createdAt as string).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                    : "—"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function StatCard({
  icon: Icon,
  bgColor,
  iconColor,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <div className="text-h3 font-bold text-text-1">{value}</div>
          <div className="text-caption text-text-3">{label}</div>
        </div>
      </div>
    </Card>
  );
}
