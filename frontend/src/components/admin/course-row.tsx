import Link from "next/link";
import { cn, formatPrice, formatRelativeTime } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Edit, RotateCcw, Trash2 } from "lucide-react";

interface CourseRowProps {
  course: {
    id: string;
    title: string;
    status: string;
    price: number;
    updatedAt?: Date;
    _count?: {
      enrollments: number;
    };
    revenue?: number;
    revenueChange?: number;
  };
  variant?: "default" | "compact";
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CourseRow({ course, variant = "default", onRestore, onDelete }: CourseRowProps) {
  const isPublished = course.status === "PUBLISHED";
  const isDraft = course.status === "DRAFT";
  const isArchived = course.status === "ARCHIVED";

  const statusVariant = isPublished ? "published" : isDraft ? "draft" : "default";
  const enrollmentCount = course._count?.enrollments || 0;

  if (variant === "compact") {
    // Compact variant for dashboard top courses - matches client_designs/admin_dashboard_desktop.html .row
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95">
        {/* Left: Thumbnail + Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[38px] h-[38px] rounded-[14px] border border-border/95 bg-gradient-to-br from-primary/28 to-accent/18 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-black text-text-1 truncate max-w-[360px]">
              {course.title}
            </div>
            <div className="text-[12px] font-extrabold text-text-3 mt-1">
              {enrollmentCount.toLocaleString()} learners
            </div>
          </div>
        </div>
        
        {/* Right: Revenue + Delta badge */}
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <span className="text-[13px] font-black text-text-1">
            {course.revenue ? formatPrice(course.revenue) : formatPrice(course.price)}
          </span>
          {course.revenueChange !== undefined && (
            <span className="h-[22px] px-2.5 rounded-full inline-flex items-center text-[11px] font-black tracking-[0.2px] bg-success/14 text-green-700 border border-success/22">
              +{course.revenueChange}%
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default table-style variant - matches client_designs/admin_courses_list_desktop.html .tr
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] sm:grid-cols-[1.6fr_0.6fr_0.6fr_0.6fr_0.6fr] gap-2.5 items-center p-3 rounded-[18px] border border-border/95 bg-white/95 mt-2.5 first:mt-0">
      {/* Course Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-[42px] h-[42px] rounded-[16px] border border-border/95 bg-gradient-to-br from-primary/26 to-accent/16 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-[13px] font-black text-text-1 truncate">
            {course.title}
          </div>
          <div className="text-[12px] font-extrabold text-text-3 mt-1">
            {course.updatedAt 
              ? `Updated ${formatRelativeTime(course.updatedAt)}`
              : `${enrollmentCount.toLocaleString()} learners`
            }
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="hidden sm:block">
        <Pill variant={statusVariant}>
          {course.status}
        </Pill>
      </div>

      {/* Price */}
      <div className="hidden sm:block">
        <span className={cn(
          "font-black",
          isArchived ? "text-text-3 font-extrabold text-[12px]" : "text-text-1"
        )}>
          {isArchived ? "—" : formatPrice(course.price)}
        </span>
      </div>

      {/* Students */}
      <div className="hidden sm:block">
        <span className={cn(
          "font-black",
          (isDraft || isArchived) ? "text-text-3 font-extrabold text-[12px]" : "text-text-1"
        )}>
          {(isDraft || isArchived) ? "—" : enrollmentCount.toLocaleString()}
        </span>
      </div>

      {/* Actions - using .mini button style from design */}
      <div className="flex items-center gap-2 justify-end">
        {isPublished && (
          <>
            <Link 
              href={`/manage-courses/${course.id}/edit`}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-primary/10 border border-primary/14 text-primary-600 hover:bg-primary/15 transition-colors"
            >
              Edit
            </Link>
            <Link 
              href={`/manage-courses/${course.id}/analytics`}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-white/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
            >
              Analytics
            </Link>
            <Link 
              href={`/manage-courses/${course.id}/edit`}
              className="sm:hidden h-8 w-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </>
        )}
        {isDraft && (
          <>
            <Link 
              href={`/manage-courses/${course.id}/edit`}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-primary/10 border border-primary/14 text-primary-600 hover:bg-primary/15 transition-colors"
            >
              Continue
            </Link>
            <Link 
              href={`/course/${course.id}`}
              target="_blank"
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-white/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
            >
              Preview
            </Link>
            <Link 
              href={`/manage-courses/${course.id}/edit`}
              className="sm:hidden h-8 w-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary"
            >
              <Edit className="w-4 h-4" />
            </Link>
          </>
        )}
        {isArchived && (
          <>
            <button 
              onClick={() => onRestore?.(course.id)}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center gap-1.5 text-[12px] font-black bg-white/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
            <button 
              onClick={() => onDelete?.(course.id)}
              className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center gap-1.5 text-[12px] font-black bg-white/95 border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <button 
              onClick={() => onRestore?.(course.id)}
              className="sm:hidden h-8 w-8 rounded-xl flex items-center justify-center bg-muted text-text-2"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Table header component for courses list - matches .thead
export function CourseRowHeader() {
  return (
    <div className="hidden sm:grid grid-cols-[1.6fr_0.6fr_0.6fr_0.6fr_0.6fr] gap-2.5 items-center px-3 py-2.5 text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
      <div>Course</div>
      <div>Status</div>
      <div>Price</div>
      <div>Students</div>
      <div className="text-right">Actions</div>
    </div>
  );
}
