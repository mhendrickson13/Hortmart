"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Bookmark,
  Settings,
  LayoutDashboard,
  BarChart3,
  Users,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { LogoIcon } from "@/components/shared/logo";

interface LeftRailProps {
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
}

const learnerNavItems = [
  { href: "/courses", icon: GraduationCap, label: "Courses" },
  { href: "/my-courses", icon: Bookmark, label: "My Courses" },
];

const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/manage-courses", icon: GraduationCap, label: "Courses" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/users", icon: Users, label: "Users" },
];

export function LeftRail({ user, variant = "learner" }: LeftRailProps) {
  const pathname = usePathname();
  const navItems = variant === "admin" ? adminNavItems : learnerNavItems;

  return (
    <aside className="w-[84px] rounded-2xl bg-white/85 border border-border/90 p-3.5 flex flex-col items-center gap-3">
      {/* Logo */}
      <div className="mb-1.5">
        <LogoIcon href={variant === "admin" ? "/dashboard" : "/courses"} />
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-1.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                isActive
                  ? "bg-primary text-white shadow-primary"
                  : "text-text-2 hover:bg-surface-3"
              )}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Profile */}
      <Link
        href="/profile"
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
          pathname.startsWith("/profile")
            ? "bg-primary text-white shadow-primary"
            : "text-text-2 hover:bg-surface-3"
        )}
        title="Profile"
      >
        <User className="w-5 h-5" />
      </Link>

      {/* Settings */}
      <Link
        href="/settings"
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
          pathname.startsWith("/settings")
            ? "bg-primary text-white shadow-primary"
            : "text-text-2 hover:bg-surface-3"
        )}
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </Link>

      {/* User Avatar - Links to Profile */}
      <Link
        href="/profile"
        className="group"
        title="View Profile"
      >
        <Avatar className="w-11 h-11 border-2 border-border/90 group-hover:border-primary/50 transition-colors">
          <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
          <AvatarFallback>{getInitials(user?.name || "U")}</AvatarFallback>
        </Avatar>
      </Link>
    </aside>
  );
}
