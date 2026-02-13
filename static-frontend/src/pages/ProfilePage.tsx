import { useQuery } from "@tanstack/react-query";
import { users as usersApi, analytics as analyticsApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Settings, BookOpen, Award, Clock, Users, Star, TrendingUp, Layers, Flame } from "lucide-react";
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
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  const profile: any = profileData?.user || user;
  const joinDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  return (
    <>
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="w-20 h-20 shadow-soft-1">
            <AvatarImage src={profile?.image || undefined} />
            <AvatarFallback className="text-xl">{getInitials(profile?.name || "U")}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-h2 font-bold text-text-1">{profile?.name || "User"}</h1>
            <p className="text-body-sm text-text-2">{profile?.email}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-caption text-text-3 capitalize">{profile?.role?.toLowerCase()}</span>
              {joinDate && <span className="text-caption text-text-3">Joined {joinDate}</span>}
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/settings"><Settings className="w-4 h-4 mr-1" />Settings</Link>
          </Button>
        </div>
        {profile?.bio && <p className="mt-4 text-body-sm text-text-2 leading-relaxed">{profile.bio}</p>}
      </Card>

      {/* Creator Stats */}
      {isCreator && creatorStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <Layers className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-h3 font-bold text-text-1">{creatorStats.totalCourses}</div>
            <div className="text-caption text-text-3">Courses</div>
          </Card>
          <Card className="p-4 text-center">
            <Users className="w-5 h-5 text-accent mx-auto mb-2" />
            <div className="text-h3 font-bold text-text-1">{creatorStats.totalEnrollments}</div>
            <div className="text-caption text-text-3">Students</div>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-success mx-auto mb-2" />
            <div className="text-h3 font-bold text-text-1">{formatCurrency(creatorStats.totalRevenue)}</div>
            <div className="text-caption text-text-3">Revenue</div>
          </Card>
          <Card className="p-4 text-center">
            <Star className="w-5 h-5 text-warning mx-auto mb-2" />
            <div className="text-h3 font-bold text-text-1">{creatorStats.avgRating}</div>
            <div className="text-caption text-text-3">Avg Rating ({creatorStats.totalReviews})</div>
          </Card>
        </div>
      )}

      {/* Learner Stats */}
      {!isCreator && learnerStats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <BookOpen className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-h3 font-bold text-text-1">{learnerStats.totalCourses}</div>
              <div className="text-caption text-text-3">Enrolled</div>
            </Card>
            <Card className="p-4 text-center">
              <Award className="w-5 h-5 text-success mx-auto mb-2" />
              <div className="text-h3 font-bold text-text-1">{learnerStats.completedCourses}</div>
              <div className="text-caption text-text-3">Completed</div>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="w-5 h-5 text-warning mx-auto mb-2" />
              <div className="text-h3 font-bold text-text-1">{(learnerStats.totalWatchHours || 0).toFixed(1)}h</div>
              <div className="text-caption text-text-3">Watch Time</div>
            </Card>
            <Card className="p-4 text-center">
              <BookOpen className="w-5 h-5 text-accent mx-auto mb-2" />
              <div className="text-h3 font-bold text-text-1">{learnerStats.totalLessonsCompleted}</div>
              <div className="text-caption text-text-3">Lessons Done</div>
            </Card>
          </div>

          {/* Learning Streak (visual placeholder, real data would need backend) */}
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Flame className="w-5 h-5 text-warning" /></div>
              <div>
                <h3 className="text-body font-bold text-text-1">Learning Streak</h3>
                <p className="text-caption text-text-3">Keep learning every day!</p>
              </div>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={`flex-1 h-8 rounded-lg ${i < 3 ? "bg-success/20" : "bg-border/40"}`} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-text-3">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </Card>
        </>
      )}

      {/* Account Info */}
      <Card className="p-5">
        <h3 className="text-body font-bold text-text-1 mb-3">Account Information</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-body-sm text-text-2">Email</span>
            <span className="text-body-sm font-medium text-text-1">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-body-sm text-text-2">Role</span>
            <span className="text-body-sm font-medium text-text-1 capitalize">{profile?.role?.toLowerCase()}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-body-sm text-text-2">Enrolled Courses</span>
            <span className="text-body-sm font-medium text-text-1">{profile?._count?.enrollments ?? 0}</span>
          </div>
          {isCreator && (
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-body-sm text-text-2">Created Courses</span>
              <span className="text-body-sm font-medium text-text-1">{profile?._count?.courses ?? 0}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button asChild variant="secondary" className="h-12 justify-start">
          <Link to="/my-courses"><BookOpen className="w-4 h-4 mr-2" />My Courses</Link>
        </Button>
        <Button asChild variant="secondary" className="h-12 justify-start">
          <Link to="/settings"><Settings className="w-4 h-4 mr-2" />Account Settings</Link>
        </Button>
      </div>
    </>
  );
}
