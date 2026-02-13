import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex items-center rounded-pill px-2.5 py-0.5 text-overline font-bold border whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary-100 text-primary-600 border-primary/20",
        primary: "bg-primary-100 text-primary-600 border-primary/20",
        success: "bg-success/15 text-green-700 dark:text-green-400 border-success/20",
        warning: "bg-warning/15 text-amber-700 dark:text-amber-400 border-warning/20",
        error: "bg-danger/15 text-red-700 dark:text-red-400 border-danger/20",
        info: "bg-accent/15 text-accent border-accent/20",
        completed: "bg-success/15 text-green-700 dark:text-green-400 border-success/20",
        "now-watching": "pill-now-watching shadow-sm",
        locked: "bg-text-3/10 text-text-2 border-text-3/10",
        draft: "bg-warning/15 text-amber-700 dark:text-amber-400 border-warning/20",
        published: "bg-success/15 text-green-700 dark:text-green-400 border-success/20",
        "in-progress": "bg-primary-100 text-primary-600 border-primary/20",
      },
      size: {
        sm: "h-5 text-[10px]",
        default: "h-6 text-overline",
        lg: "h-7 text-caption",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {}

const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(pillVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Pill.displayName = "Pill";

export { Pill, pillVariants };
