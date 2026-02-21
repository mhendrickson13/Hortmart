import { Link } from "react-router-dom";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Clock,
  Play,
  Star,
  Users,
  BookOpen,
  CheckCircle,
} from "lucide-react";

interface MobileCourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    coverImage?: string | null;
    price: number;
    level?: string | null;
    creator?: {
      name?: string | null;
      image?: string | null;
    } | null;
    _count?: {
      enrollments?: number;
      reviews?: number;
    };
    avgRating?: number;
    totalDuration?: number;
    totalLessons?: number;
  };
  variant?: "default" | "enrolled" | "compact";
  progress?: {
    percent: number;
    completedLessons: number;
    totalLessons: number;
  };
  className?: string;
}

export function MobileCourseCard({
  course,
  variant = "default",
  progress,
  className,
}: MobileCourseCardProps) {
  const isEnrolled = variant === "enrolled" || !!progress;
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <Link 
        to={`/course/${course.id}`}
        className={cn("block", className)}
      >
        <div className="mobile-card-interactive flex gap-3">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 relative">
            {course.coverImage ? (
              <img
                src={course.coverImage}
                alt={course.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full gradient-primary" />
            )}
            {isEnrolled && progress && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Play className="w-6 h-6 text-white" fill="currentColor" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0 py-0.5">
            <h3 className="text-body-sm font-semibold text-text-1 truncate mb-1">
              {course.title}
            </h3>
            <p className="text-[11px] text-text-3 mb-2">{course.creator?.name || "Instructor"}</p>
            
            {progress ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-primary">
                  {progress.percent}%
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-text-3">
                {course.avgRating && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {course.avgRating.toFixed(1)}
                  </span>
                )}
                <span>{course.level?.replace("_", " ") || "All Levels"}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={`/course/${course.id}`}
      className={cn("block", className)}
    >
      <Card className="overflow-hidden active:scale-[0.98] transition-transform">
        {/* Cover Image */}
        <div className="relative aspect-video bg-muted">
          {course.coverImage ? (
            <img
              src={course.coverImage}
              alt={course.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full gradient-primary" />
          )}
          
          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {course.price === 0 && (
              <Pill size="sm" className="bg-success/90 text-white border-0">
                Free
              </Pill>
            )}
            {isEnrolled && progress?.percent === 100 && (
              <Pill size="sm" className="bg-success/90 text-white border-0">
                <CheckCircle className="w-3 h-3 mr-0.5" />
                Completed
              </Pill>
            )}
          </div>
          
          {/* Play button for enrolled courses */}
          {isEnrolled && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" />
              </span>
            </div>
          )}
          
          {/* Progress overlay for enrolled */}
          {isEnrolled && progress && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-3">
          {/* Title & Creator */}
          <div className="flex items-start gap-2 mb-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={course.creator?.image || undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(course.creator?.name || "C")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="text-body-sm font-semibold text-text-1 line-clamp-2 leading-snug">
                {course.title}
              </h3>
              <p className="text-[11px] text-text-3 mt-0.5">{course.creator?.name || "Instructor"}</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px] text-text-3">
            {course.avgRating !== undefined && course.avgRating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-text-2">{course.avgRating.toFixed(1)}</span>
                {course._count?.reviews && (
                  <span>({course._count.reviews})</span>
                )}
              </span>
            )}
            {course._count?.enrollments !== undefined && (
              <span className="flex items-center gap-0.5">
                <Users className="w-3.5 h-3.5" />
                {course._count.enrollments}
              </span>
            )}
            {course.totalLessons !== undefined && (
              <span className="flex items-center gap-0.5">
                <BookOpen className="w-3.5 h-3.5" />
                {course.totalLessons} lessons
              </span>
            )}
            {course.totalDuration !== undefined && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(course.totalDuration)}
              </span>
            )}
          </div>
          
          {/* Progress bar for enrolled */}
          {isEnrolled && progress && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-text-3">
                  {progress.completedLessons}/{progress.totalLessons} lessons
                </span>
                <span className="font-semibold text-primary">{progress.percent}% complete</span>
              </div>
              <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-600 rounded-full transition-all" 
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Price for non-enrolled */}
          {!isEnrolled && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
              <Pill size="sm">{course.level?.replace("_", " ") || "All Levels"}</Pill>
              <span className="text-body-sm font-bold text-text-1">
                {course.price === 0 ? "Free" : formatPrice(course.price)}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
