import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon" | "compact";
  size?: "sm" | "default" | "lg";
  href?: string;
  className?: string;
  subtitle?: string;
  showText?: boolean;
}

export function Logo({
  variant = "full",
  size = "default",
  href,
  className,
  subtitle,
  showText = true,
}: LogoProps) {
  const sizeClasses = {
    sm: { icon: "w-8 h-8", iconPx: 32, text: "text-sm", subtitle: "text-[10px]" },
    default: { icon: "w-10 h-10", iconPx: 40, text: "text-base", subtitle: "text-caption" },
    lg: { icon: "w-12 h-12", iconPx: 48, text: "text-lg", subtitle: "text-body-sm" },
  };

  const sizes = sizeClasses[size];
  const logoSrc = import.meta.env.BASE_URL + "logo.svg";

  const logoContent = (
    <>
      <div className={cn("rounded-xl flex items-center justify-center overflow-hidden", sizes.icon)}>
        <img src={logoSrc} alt="CXFlow LMS Logo" width={sizes.iconPx} height={sizes.iconPx} className="w-full h-full object-contain" />
      </div>
      {variant !== "icon" && showText && (
        <div className={variant === "compact" ? "hidden sm:block" : ""}>
          <div className={cn("font-bold text-text-1", sizes.text)}>CXFlow LMS</div>
          {subtitle && <div className={cn("text-text-3", sizes.subtitle)}>{subtitle}</div>}
        </div>
      )}
    </>
  );

  const containerClasses = cn("flex items-center gap-2.5", href && "hover:opacity-90 transition-opacity", className);

  if (href) {
    return <Link to={href} className={containerClasses}>{logoContent}</Link>;
  }

  return <div className={containerClasses}>{logoContent}</div>;
}

export function LogoIcon({ size = "default", href, className }: Omit<LogoProps, "variant" | "subtitle">) {
  return <Logo variant="icon" size={size} href={href} className={className} />;
}

export function LogoFull({ size = "default", href, className, subtitle }: Omit<LogoProps, "variant">) {
  return <Logo variant="full" size={size} href={href} className={className} subtitle={subtitle} />;
}
