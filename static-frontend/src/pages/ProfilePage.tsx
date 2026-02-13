import { useQuery } from "@tanstack/react-query";
import { users as usersApi, analytics as analyticsApi } from "@/lib/api-client";
import type { User, LearnerStats, CreatorStats } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Shield,
} from "lucide-react";
import { getInitials, formatCurrency } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const isCreator = user?.role === "CREATOR" || user?.role === "ADMIN";

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user,
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const profile = (profileData?.user ?? user) as User | null;
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <>
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="w-20 h-20 shadow-soft-1 ring-2 ring-border">
            <AvatarImage src={profile?.image ?? undefined} />
            <AvatarFallback className="text-xl font-bold">
              {getInitials(profile?.name || "U")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-h2 font-bold text-text-1">
              {profile?.name || "User"}
            </h1>
            <p className="text-body-sm text-text-2">{profile?.email}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-caption text-text-3">
                <Shield className="w-3 h-3" />
                <span className="capitalize">
                  {profile?.role?.toLowerCase()}
                </span>
              </span>
              {joinDate && (
                <span className="inline-flex items-center gap-1 text-caption text-text-3">
                  <Calendar className="w-3 h-3" />
                  Joined {joinDate}
                </span>
              )}
            </div>
          </div>

          <Button asChild variant="secondary" size="sm">
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-1.5" />
              Settings
            </Link>
          </Button>
        </div>

        {profile?.bio && (
          <p className="mt-4 text-body-sm text-text-2 leading-relaxed border-t border-border pt-4">
            {profile.bio}
          </p>
        )}
      </Card>

      {/* Creator Stats */}
      {isCreator && creatorStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Layers}
            iconColor="text-primary"
            value={creatorStats.totalCourses}
            label="Courses"
          />
          <StatCard
            icon={Users}
            iconColor="text-accent"
            value={creatorStats.totalEnrollments}
            label="Students"
          />
          <StatCard
            icon={TrendingUp}
            iconColor="text-success"
            value={formatCurrency(creatorStats.totalRevenue)}
            label="Revenue"
          />
          <StatCard
            icon={Star}
            iconColor="text-warning"
            value={creatorStats.avgRating}
            label={`Avg Rating (${creatorStats.totalReviews})`}
          />
        </div>
      )}

      {/* Learner Stats */}
      {!isCreator && learnerStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={BookOpen}
            iconColor="text-primary"
            value={learnerStats.totalCourses}
            label="Enrolled"
          />
          <StatCard
            icon={Award}
            iconColor="text-success"
            value={learnerStats.completedCourses}
            label="Completed"
          />
          <StatCard
            icon={Clock}
            iconColor="text-warning"
            value={`${(learnerStats.totalWatchHours || 0).toFixed(1)}h`}
            label="Watch Time"
          />
          <StatCard
            icon={BookOpen}
            iconColor="text-accent"
            value={learnerStats.totalLessonsCompleted}
            label="Lessons Done"
          />
        </div>
      )}

      {/* Account Information */}
      <Card className="p-5">
        <h3 className="text-body font-bold text-text-1 mb-3">
          Account Information
        </h3>
        <div className="space-y-0.5">
          <InfoRow label="Email" value={profile?.email ?? ""} icon={Mail} />
          <InfoRow
            label="Role"
            value={profile?.role?.toLowerCase() ?? ""}
            capitalize
            icon={Shield}
          />
          <InfoRow
            label="Enrolled Courses"
            value={String(profile?._count?.enrollments ?? 0)}
            icon={BookOpen}
          />
          {isCreator && (
            <InfoRow
              label="Created Courses"
              value={String(profile?._count?.courses ?? 0)}
              icon={Layers}
            />
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button asChild variant="secondary" className="h-12 justify-start">
          <Link to="/my-courses">
            <BookOpen className="w-4 h-4 mr-2" />
            My Courses
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-12 justify-start">
          <Link to="/settings">
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </Link>
        </Button>
      </div>
    </>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function StatCard({
  icon: Icon,
  iconColor,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="p-4 text-center">
      <Icon className={`w-5 h-5 ${iconColor} mx-auto mb-2`} />
      <div className="text-h3 font-bold text-text-1">{value}</div>
      <div className="text-caption text-text-3">{label}</div>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
  capitalize = false,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-b-0">
      <span className="flex items-center gap-2 text-body-sm text-text-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-text-3" />}
        {label}
      </span>
      <span
        className={`text-body-sm font-medium text-text-1 ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
