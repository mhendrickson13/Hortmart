import { Link } from "react-router-dom";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pill } from "@/components/ui/pill";
import { Clock, Users, BookOpen, Play, CheckCircle2 } from "lucide-react";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    subtitle?: string | null;
    coverImage?: string | null;
    price: number;
    level?: string | null;
    category?: string | null;
    creator?: {
      name?: string | null;
    };
    _count?: {
      enrollments: number;
    };
    totalDuration?: number;
    lessonsCount?: number;
  };
  progress?: {
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
  };
  variant?: "catalog" | "enrolled" | "featured";
}

export function CourseCard({ course, progress, variant = "catalog" }: CourseCardProps) {
  const isCompleted = progress?.progressPercent === 100;
  const levelDisplay = course.level?.replace("_", " ") || "All Levels";

  // Featured variant - horizontal card for "Continue Learning"
  if (variant === "featured") {
    return (
      <Link to={`/player/${course.id}`}>
        <Card className="overflow-hidden hover:shadow-card-hover transition-all group">
          <div className="flex flex-col sm:flex-row">
            {/* Cover Image */}
            <div className="relative w-full sm:w-48 md:w-56 aspect-video sm:aspect-auto sm:h-auto flex-shrink-0 overflow-hidden">
              {course.coverImage ? (
                <img
                  src={course.coverImage}
                  alt={course.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full min-h-[120px] gradient-primary" />
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-5 h-5 text-primary ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div>
                {/* Category & Level */}
                <div className="flex items-center gap-2 mb-2">
                  {course.category && (
                    <Pill size="sm">{course.category}</Pill>
                  )}
                  <Pill size="sm" variant="locked">{levelDisplay}</Pill>
                </div>

                {/* Title */}
                <h3 className="text-body font-semibold text-text-1 mb-1 line-clamp-1">
                  {course.title}
                </h3>

                {/* Instructor */}
                {course.creator?.name && (
                  <p className="text-caption text-text-3 mb-3">
                    {course.creator.name}
                  </p>
                )}
              </div>

              {/* Progress */}
              {progress && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-caption text-text-3">
                      {progress.completedLessons}/{progress.totalLessons} lessons
                    </span>
                    <span className="text-caption font-semibold text-primary">
                      {progress.progressPercent}%
                    </span>
                  </div>
                  <Progress value={progress.progressPercent} />
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-caption text-text-3 mt-3">
                {course.totalDuration !== undefined && course.totalDuration > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(course.totalDuration)}
                  </span>
                )}
                {course.lessonsCount !== undefined && course.lessonsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {course.lessonsCount} lessons
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // Default and enrolled variants - vertical card
  return (
    <Link to={variant === "enrolled" ? `/player/${course.id}` : `/course/${course.id}`}>
      <Card className={cn(
        "overflow-hidden hover:shadow-card-hover transition-all group h-full flex flex-col",
        isCompleted && "ring-2 ring-success/30"
      )}>
        {/* Cover Image */}
        <div className="relative aspect-video overflow-hidden flex-shrink-0">
          {course.coverImage ? (
            <img
              src={course.coverImage}
              alt={course.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full gradient-primary" />
          )}

          {/* Price Badge (catalog only) */}
          {variant === "catalog" && (
            <div className="absolute top-3 right-3">
              <div className="px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-caption font-bold text-text-1">
                {course.price === 0 ? "Free" : formatPrice(course.price)}
              </div>
            </div>
          )}

          {/* Completed Badge */}
          {isCompleted && (
            <div className="absolute top-3 left-3">
              <div className="px-2.5 py-1 rounded-lg bg-success/90 backdrop-blur-sm text-caption font-bold text-white flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </div>
            </div>
          )}

          {/* Play overlay for enrolled */}
          {variant === "enrolled" && !isCompleted && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
          {/* Category & Level */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {course.category && (
              <Pill size="sm">{course.category}</Pill>
            )}
            <Pill size="sm" variant="locked">{levelDisplay}</Pill>
          </div>

          {/* Title */}
          <h3 className="text-body font-semibold text-text-1 mb-1 line-clamp-2">
            {course.title}
          </h3>

          {/* Instructor */}
          {course.creator?.name && (
            <p className="text-caption text-text-3 mb-3">
              {course.creator.name}
            </p>
          )}

          {/* Spacer to push content to bottom */}
          <div className="flex-1" />

          {/* Progress (enrolled only) */}
          {variant === "enrolled" && progress && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-caption text-text-3">
                  {isCompleted ? "Completed" : `${progress.completedLessons}/${progress.totalLessons} lessons`}
                </span>
                <span className={cn(
                  "text-caption font-semibold",
                  isCompleted ? "text-success" : "text-primary"
                )}>
                  {progress.progressPercent}%
                </span>
              </div>
              <Progress value={progress.progressPercent} className={isCompleted ? "[&>div]:bg-success" : ""} />
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-caption text-text-3">
            {course.totalDuration !== undefined && course.totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(course.totalDuration)}
              </span>
            )}
            {course.lessonsCount !== undefined && course.lessonsCount > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {course.lessonsCount} lessons
              </span>
            )}
            {course._count?.enrollments !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {course._count.enrollments}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
