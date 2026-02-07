import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import { getInitials } from "@/lib/utils";
import {
  Settings,
  BookOpen,
  Award,
  Clock,
  Target,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface LessonProgress {
  progressPercent: number;
  completedAt: string | null;
}

interface Course {
  id: string;
  title: string;
  thumbnail?: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  course?: Course;
  lessonProgress?: LessonProgress[];
}

interface MobileProfileProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    createdAt?: Date | string;
    bio?: string | null;
  };
  stats?: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalLessonsCompleted: number;
    totalWatchHours: number;
    enrollments: Enrollment[];
  };
}

export function MobileProfileSettings({ user, stats }: MobileProfileProps) {
  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).getFullYear()
    : new Date().getFullYear();

  const defaultStats = stats || {
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    totalLessonsCompleted: 0,
    totalWatchHours: 0,
    enrollments: [],
  };

  const completionRate = defaultStats.totalCourses > 0 
    ? Math.round((defaultStats.completedCourses / defaultStats.totalCourses) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-[18px] pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-black tracking-tight text-text-1">Profile</h1>
          <Link
            href="/settings"
            className="w-10 h-10 rounded-2xl border border-border/95 bg-white/95 dark:bg-card/95 flex items-center justify-center text-text-2 shadow-[0_14px_28px_rgba(21,25,35,0.05)] hover:bg-muted transition-colors"
            title="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </Link>
        </div>

        {/* Profile Card */}
        <Card className="mt-3 p-4 rounded-[26px] bg-white/95 dark:bg-card/95 border-border/95 shadow-[0_18px_44px_rgba(21,25,35,0.08)]">
          <div className="flex gap-3.5 items-center">
            <Avatar className="w-[60px] h-[60px] rounded-[20px] border border-border/95">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="rounded-[20px] bg-gradient-to-br from-primary/18 to-accent/14 text-text-1 font-black text-lg">
                {getInitials(user?.name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-black text-[15px] text-text-1 truncate">
                {user?.name || "User"}
              </div>
              <div className="mt-1 text-xs font-extrabold text-text-3 truncate">
                {user?.email}
              </div>
              <div className="mt-2.5 flex gap-2 flex-wrap">
                <Pill size="sm" variant="default" className="h-[22px] px-2.5 text-[11px] font-black">
                  {user?.role === "ADMIN" ? "Admin" : user?.role === "CREATOR" ? "Creator" : "Learner"}
                </Pill>
                <Pill size="sm" variant="default" className="h-[22px] px-2.5 text-[11px] font-black">
                  Since {memberSince}
                </Pill>
              </div>
            </div>
          </div>
          {user?.bio && (
            <p className="mt-3 pt-3 border-t border-border/50 text-xs font-medium text-text-2 line-clamp-2">
              {user.bio}
            </p>
          )}
        </Card>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto px-4 pb-[18px]" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(21,25,35,0.22) transparent' }}>
        
        {/* Stats Grid */}
        <div className="mt-3 mb-2.5 px-0.5">
          <span className="text-xs font-black text-text-3 uppercase tracking-wider">Learning Stats</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="p-3.5 rounded-[18px] bg-white/95 dark:bg-card/95 border-border/95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-[18px] h-[18px] text-primary" />
              </div>
              <div>
                <div className="text-lg font-black text-text-1">{defaultStats.totalCourses}</div>
                <div className="text-[11px] font-extrabold text-text-3">Enrolled</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3.5 rounded-[18px] bg-white/95 dark:bg-card/95 border-border/95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                <Award className="w-[18px] h-[18px] text-success" />
              </div>
              <div>
                <div className="text-lg font-black text-text-1">{defaultStats.completedCourses}</div>
                <div className="text-[11px] font-extrabold text-text-3">Completed</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3.5 rounded-[18px] bg-white/95 dark:bg-card/95 border-border/95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-[18px] h-[18px] text-warning" />
              </div>
              <div>
                <div className="text-lg font-black text-text-1">{defaultStats.inProgressCourses}</div>
                <div className="text-[11px] font-extrabold text-text-3">In Progress</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3.5 rounded-[18px] bg-white/95 dark:bg-card/95 border-border/95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-[18px] h-[18px] text-accent" />
              </div>
              <div>
                <div className="text-lg font-black text-text-1">{defaultStats.totalWatchHours}h</div>
                <div className="text-[11px] font-extrabold text-text-3">Watch Time</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Progress Overview */}
        <Card className="mt-3 p-4 rounded-[22px] bg-white/95 dark:bg-card/95 border-border/95">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-black text-text-1">Overall Progress</span>
            <span className="text-[13px] font-black text-primary">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[11px] font-extrabold text-text-3">{defaultStats.totalLessonsCompleted} lessons completed</span>
            <span className="text-[11px] font-extrabold text-text-3">{defaultStats.completedCourses}/{defaultStats.totalCourses} courses</span>
          </div>
        </Card>

        {/* Continue Learning */}
        {defaultStats.enrollments.length > 0 && (
          <>
            <div className="mt-4 mb-2.5 flex items-end justify-between px-0.5">
              <span className="text-xs font-black text-text-3 uppercase tracking-wider">Continue Learning</span>
              <Link href="/my-courses" className="text-xs font-black text-primary-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-2.5">
              {defaultStats.enrollments.slice(0, 3).map((enrollment) => {
                if (!enrollment.course) return null;
                // Calculate progress from lessonProgress
                const progress = enrollment.lessonProgress?.length 
                  ? Math.round(enrollment.lessonProgress.reduce((sum, lp) => sum + lp.progressPercent, 0) / enrollment.lessonProgress.length)
                  : 0;
                return (
                  <Link
                    key={enrollment.id}
                    href={`/player/${enrollment.course.id}`}
                    className="flex items-center gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 hover:bg-muted transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex-shrink-0 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-black text-text-1 truncate">
                        {enrollment.course.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-[11px] font-extrabold text-text-3">{progress}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-3 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {defaultStats.enrollments.length === 0 && (
          <Card className="mt-4 p-6 rounded-[22px] bg-white/95 dark:bg-card/95 border-border/95 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-[15px] font-black text-text-1 mb-1">No courses yet</h3>
            <p className="text-xs font-medium text-text-3 mb-4">
              Start your learning journey today
            </p>
            <Button asChild className="w-full">
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2.5">
          <Button asChild variant="secondary" className="flex-1 h-11 rounded-full font-black text-[13px]">
            <Link href="/courses">
              <Target className="w-4 h-4 mr-2" />
              Browse
            </Link>
          </Button>
          <Button asChild className="flex-1 h-11 rounded-full font-black text-[13px]">
            <Link href="/my-courses">
              <BookOpen className="w-4 h-4 mr-2" />
              My Courses
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
