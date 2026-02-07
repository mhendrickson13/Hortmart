import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { serverApi, User, CreatorStats, LearnerStats, Enrollment } from "@/lib/server-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  Mail,
  Calendar,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Edit,
  Award,
  Star,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react";
import { MobileProfileSettings } from "@/components/shared/mobile-profile-settings";

async function getCreatorStats(): Promise<CreatorStats> {
  try {
    return await serverApi.profile.getCreatorStats();
  } catch (error) {
    console.error("Failed to fetch creator stats:", error);
    return {
      totalCourses: 0,
      publishedCourses: 0,
      totalEnrollments: 0,
      totalRevenue: 0,
      totalReviews: 0,
      avgRating: "0.0",
    };
  }
}

async function getLearnerStats(): Promise<LearnerStats> {
  try {
    return await serverApi.profile.getLearnerStats();
  } catch (error) {
    console.error("Failed to fetch learner stats:", error);
    return {
      totalCourses: 0,
      completedCourses: 0,
      inProgressCourses: 0,
      totalLessonsCompleted: 0,
      totalWatchHours: 0,
      enrollments: [],
    };
  }
}

async function getUserData(): Promise<User | null> {
  try {
    return await serverApi.users.getProfile();
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return null;
  }
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await getUserData();
  const isCreator = user?.role === "ADMIN" || user?.role === "CREATOR";

  // Render Creator/Admin Profile
  if (isCreator) {
    const stats = await getCreatorStats();

    return (
      <>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Profile</h1>
            <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
              Your creator profile and stats
            </p>
          </div>
          <Button asChild variant="secondary" size="sm" className="self-start sm:self-auto sm:size-default">
            <Link href="/settings">
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit Settings</span>
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
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="text-h2">
                      {getInitials(user?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href="/settings"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-primary hover:bg-primary-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-h2 font-bold text-text-1">
                      {user?.name || "Creator"}
                    </h2>
                    <Pill variant="published">
                      {user?.role === "ADMIN" ? "Admin" : "Creator"}
                    </Pill>
                  </div>
                  
                  <div className="space-y-2 text-body-sm text-text-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-text-3" />
                      {user?.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-3" />
                      Member since {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
                    </div>
                  </div>
                  
                  {user?.bio && (
                    <p className="mt-4 text-body-sm text-text-2">{user.bio}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.totalCourses}</div>
                    <div className="text-caption text-text-3">Total Courses</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.totalEnrollments}</div>
                    <div className="text-caption text-text-3">Total Students</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{formatCurrency(stats.totalRevenue)}</div>
                    <div className="text-caption text-text-3">Total Revenue</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.avgRating}</div>
                    <div className="text-caption text-text-3">Avg Rating</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.publishedCourses}</div>
                    <div className="text-caption text-text-3">Published</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.totalReviews}</div>
                    <div className="text-caption text-text-3">Reviews</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card className="p-4">
              <h3 className="text-body font-bold text-text-1 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button asChild className="w-full justify-start" variant="secondary">
                  <Link href="/manage-courses/new">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Create New Course
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="secondary">
                  <Link href="/analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="secondary">
                  <Link href="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Account Info */}
            <Card className="p-4">
              <h3 className="text-body font-bold text-text-1 mb-3">Account Information</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-3">Account Type</span>
                  <Pill size="sm" variant="published">
                    {user?.role === "ADMIN" ? "Administrator" : "Creator"}
                  </Pill>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-3">Email Verified</span>
                  <Pill size="sm" variant="completed">Verified</Pill>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-3">Account Status</span>
                  <Pill size="sm" variant="completed">Active</Pill>
                </div>
              </div>
            </Card>

            {/* Help */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="text-body font-bold text-text-1 mb-2">Need Help?</h3>
              <p className="text-caption text-text-2 mb-3">
                Check our creator resources or contact support for assistance.
              </p>
              <Button variant="ghost" size="sm" className="w-full">
                View Help Center
              </Button>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Render Learner Profile
  const stats = await getLearnerStats();

  return (
    <>
      {/* Mobile Layout - Profile Only (separate from settings) */}
      <div className="lg:hidden -mx-4 -my-4">
        <MobileProfileSettings 
          user={{
            id: user?.id,
            name: user?.name,
            email: user?.email,
            image: user?.image,
            role: user?.role,
            createdAt: user?.createdAt,
            bio: user?.bio,
          }}
          stats={stats}
        />
      </div>

      {/* Desktop Layout - Full Profile View */}
      <div className="hidden lg:contents">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-h2 sm:text-h1 font-bold text-text-1">My Profile</h1>
            <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
              Your learning journey and progress
            </p>
          </div>
          <Button asChild variant="secondary" size="sm" className="self-start sm:self-auto sm:size-default">
            <Link href="/settings">
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit Settings</span>
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
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="text-h2">
                      {getInitials(user?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <Link
                    href="/settings"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-primary hover:bg-primary-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-h2 font-bold text-text-1">
                      {user?.name || "Learner"}
                    </h2>
                    <Pill variant="default">Learner</Pill>
                  </div>
                  
                  <div className="space-y-2 text-body-sm text-text-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-text-3" />
                      {user?.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-3" />
                      Member since {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
                    </div>
                  </div>
                  
                  {user?.bio && (
                    <p className="mt-4 text-body-sm text-text-2">{user.bio}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.totalCourses}</div>
                    <div className="text-caption text-text-3">Enrolled Courses</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.completedCourses}</div>
                    <div className="text-caption text-text-3">Completed</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.inProgressCourses}</div>
                    <div className="text-caption text-text-3">In Progress</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.totalLessonsCompleted}</div>
                    <div className="text-caption text-text-3">Lessons Done</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">{stats.totalWatchHours}h</div>
                    <div className="text-caption text-text-3">Watch Time</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="text-h3 font-bold text-text-1">
                      {stats.totalCourses > 0 
                        ? Math.round((stats.completedCourses / stats.totalCourses) * 100) 
                        : 0}%
                    </div>
                    <div className="text-caption text-text-3">Completion Rate</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Courses */}
            <Card className="p-4">
              <h3 className="text-body font-bold text-text-1 mb-4">Recent Activity</h3>
              {stats.enrollments.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 mx-auto text-text-3 mb-3" />
                  <p className="text-body-sm text-text-2">
                    You haven&apos;t enrolled in any courses yet.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/courses">Browse Courses</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.enrollments.slice(0, 3).map((enrollment: Enrollment) => {
                    const course = enrollment.course;
                    if (!course) return null;
                    
                    return (
                      <Link
                        key={enrollment.id}
                        href={`/player/${course.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl border border-border/95 bg-white/95 hover:bg-surface-3 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl gradient-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-body-sm font-semibold text-text-1 truncate">
                            {course.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={0} className="h-1.5 flex-1" />
                            <span className="text-caption text-text-3">0%</span>
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
              <h3 className="text-body font-bold text-text-1 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button asChild className="w-full justify-start" variant="secondary">
                  <Link href="/courses">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse Courses
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="secondary">
                  <Link href="/my-courses">
                    <Target className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="secondary">
                  <Link href="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Account Settings
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Learning Streak */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="text-body font-bold text-text-1 mb-2">Learning Streak</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-h3 font-bold text-primary">7</span>
                </div>
                <div>
                  <div className="text-body-sm font-semibold text-text-1">Days</div>
                  <div className="text-caption text-text-3">Keep it up!</div>
                </div>
              </div>
              <div className="flex gap-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                      i < 5 ? "bg-primary text-white" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </Card>

            {/* Account Status */}
            <Card className="p-4">
              <h3 className="text-body font-bold text-text-1 mb-3">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-3">Account Type</span>
                  <Pill size="sm" variant="default">Free</Pill>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-caption text-text-3">Email Verified</span>
                  <Pill size="sm" variant="completed">Verified</Pill>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
