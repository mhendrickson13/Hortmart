import Image from "next/image";
import Link from "next/link";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pill } from "@/components/ui/pill";
import { Clock, Users, BookOpen } from "lucide-react";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    subtitle?: string | null;
    coverImage?: string | null;
    price: number;
    level: string;
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
  variant?: "catalog" | "enrolled";
}

export function CourseCard({ course, progress, variant = "catalog" }: CourseCardProps) {
  const hasProgress = progress && progress.progressPercent > 0;
  const isCompleted = progress?.progressPercent === 100;

  return (
    <Link href={variant === "enrolled" ? `/player/${course.id}` : `/course/${course.id}`}>
      <Card className="overflow-hidden hover:shadow-card-hover transition-shadow group">
        {/* Cover Image */}
        <div className="relative aspect-video overflow-hidden">
          {course.coverImage ? (
            <Image
              src={course.coverImage}
              alt={course.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
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
        </div>

        <div className="p-4">
          {/* Category & Level */}
          <div className="flex items-center gap-2 mb-2">
            {course.category && (
              <Pill size="sm">{course.category}</Pill>
            )}
            <Pill size="sm" variant="locked">
              {course.level.replace("_", " ")}
            </Pill>
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

          {/* Progress (enrolled only) */}
          {variant === "enrolled" && progress && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-caption text-text-3">
                  {isCompleted ? "Completed" : `${progress.completedLessons}/${progress.totalLessons} lessons`}
                </span>
                <span className="text-caption font-semibold text-primary">
                  {progress.progressPercent}%
                </span>
              </div>
              <Progress value={progress.progressPercent} />
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-caption text-text-3">
            {course.totalDuration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(course.totalDuration)}
              </span>
            )}
            {course.lessonsCount && (
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
