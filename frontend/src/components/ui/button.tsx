import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "btn-primary",
        secondary:
          "btn-secondary",
        ghost:
          "bg-transparent text-primary hover:bg-primary/10 active:bg-primary/15",
        outline:
          "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-[#ffffff]",
        danger:
          "btn-danger",
        success:
          "bg-success text-[#ffffff] hover:brightness-110 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "h-7 px-2.5 text-caption rounded-lg",
        sm: "h-8 px-3 text-caption",
        default: "h-10 px-4 text-body-sm",
        lg: "h-12 px-6 text-body",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
