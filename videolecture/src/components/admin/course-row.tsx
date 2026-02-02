import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Eye, BarChart3 } from "lucide-react";

interface CourseRowProps {
  course: {
    id: string;
    title: string;
    status: string;
    price: number;
    _count?: {
      enrollments: number;
    };
    revenue?: number;
    revenueChange?: number;
  };
}

export function CourseRow({ course }: CourseRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/95 bg-white/95">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl gradient-primary flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-caption font-bold text-text-1 truncate max-w-sm">
            {course.title}
          </div>
          <div className="text-caption text-text-3 mt-0.5">
            {course._count?.enrollments || 0} learners
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Pill variant={course.status === "PUBLISHED" ? "published" : "draft"}>
          {course.status}
        </Pill>
        
        <div className="text-right min-w-[100px]">
          <div className="text-caption font-bold text-text-1">
            {course.revenue ? formatPrice(course.revenue) : formatPrice(course.price)}
          </div>
          {course.revenueChange !== undefined && (
            <div className="text-[11px] text-green-600 font-semibold">
              +{course.revenueChange}%
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button asChild variant="secondary" size="icon-sm">
            <Link href={`/manage-courses/${course.id}/edit`}>
              <Edit className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="icon-sm">
            <Link href={`/course/${course.id}`} target="_blank">
              <Eye className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
