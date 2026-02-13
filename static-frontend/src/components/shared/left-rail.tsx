import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  GraduationCap,
  Search,
  User,
} from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";

interface LeftRailProps {
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
  onSearchClick?: () => void;
}

const learnerNavItems = [
  { href: "/courses", icon: Home, label: "Home" },
  { href: "/my-courses", icon: GraduationCap, label: "My Courses" },
];

export function LeftRail({ user, variant = "learner", onSearchClick }: LeftRailProps) {
  const { pathname } = useLocation();
  const navItems = learnerNavItems;

  return (
    <aside className="w-16 rounded-2xl bg-white/92 dark:bg-card/92 border border-border/95 p-3.5 flex flex-col items-center gap-2.5 transition-colors duration-200">
      {/* Logo */}
      <div className="mb-1">
        <LogoIcon href="/courses" size="sm" />
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/courses" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all border",
                isActive
                  ? "bg-primary text-white shadow-[0_14px_28px_rgba(47,111,237,0.22)] border-primary/55"
                  : "text-text-2 hover:bg-muted border-transparent"
              )}
              title={item.label}
            >
              <item.icon className="w-[18px] h-[18px]" />
            </Link>
          );
        })}
        
        {/* Search Button */}
        <button
          onClick={onSearchClick}
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all border border-transparent text-text-2 hover:bg-muted"
          title="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
      </nav>

      <div className="flex-1" />

      {/* Profile - matches design with profile icon at bottom */}
      <Link
        to="/profile"
        className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center transition-all border",
          pathname.startsWith("/profile") || pathname.startsWith("/settings")
            ? "bg-primary text-white shadow-[0_14px_28px_rgba(47,111,237,0.22)] border-primary/55"
            : "text-text-2 hover:bg-muted border-transparent"
        )}
        title="Profile"
      >
        <User className="w-[18px] h-[18px]" />
      </Link>
    </aside>
  );
}
