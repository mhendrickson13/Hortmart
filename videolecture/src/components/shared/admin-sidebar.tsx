"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  BarChart3,
  Users,
  Settings,
  User,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

interface AdminSidebarProps {
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
}

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/manage-courses", icon: GraduationCap, label: "Courses" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/users", icon: Users, label: "Users" },
];

const bottomNavItems = [
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] rounded-2xl bg-white/85 border border-border/90 p-4 flex flex-col gap-3.5">
      {/* Brand */}
      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/15">
        <Logo href="/dashboard" subtitle="Creator Console" />
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1.5 mt-0.5">
        <div className="text-overline text-text-3 uppercase px-3 mb-1">Main Menu</div>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "h-11 rounded-xl flex items-center gap-2.5 px-3 font-semibold text-caption transition-all",
                isActive
                  ? "bg-primary text-white shadow-primary"
                  : "text-text-2 hover:bg-surface-3"
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Bottom Navigation */}
      <nav className="flex flex-col gap-1.5 border-t border-border/50 pt-3">
        <div className="text-overline text-text-3 uppercase px-3 mb-1">Account</div>
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "h-11 rounded-xl flex items-center gap-2.5 px-3 font-semibold text-caption transition-all",
                isActive
                  ? "bg-primary text-white shadow-primary"
                  : "text-text-2 hover:bg-surface-3"
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <Link
        href="/profile"
        className="flex items-center gap-3 p-3 rounded-xl border border-border/95 bg-white/92 hover:bg-surface-3 hover:border-primary/30 transition-all group"
      >
        <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
          <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
          <AvatarFallback>{getInitials(user?.name || "U")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-caption text-text-1 truncate">
            {user?.name || "Creator Account"}
          </div>
          <div className="text-caption text-text-3">
            {user?.role === "ADMIN" ? "Admin" : "Creator"}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-3 group-hover:text-primary transition-colors" />
      </Link>
    </aside>
  );
}
