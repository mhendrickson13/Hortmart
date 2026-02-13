import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode; // For action buttons
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-h2 sm:text-h1 font-bold text-text-1 truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
