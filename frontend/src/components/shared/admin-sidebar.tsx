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

// Matches client_designs/admin_dashboard_desktop.html exactly
const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/manage-courses", icon: GraduationCap, label: "Courses" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] rounded-[22px] bg-white/85 border border-border/90 p-4 flex flex-col gap-3.5 transition-colors duration-200">
      {/* Brand - matches design */}
      <div className="flex items-center gap-2.5 p-2.5 rounded-[18px] bg-primary/10 border border-primary/14">
        <Logo href="/dashboard" subtitle="Creator Console" />
      </div>

      {/* Navigation - matches design: no section labels, just 5 items */}
      <nav className="flex flex-col gap-1.5 mt-0.5">
        {navItems.map((item) => {
          const isActive = 
            pathname === item.href || 
            (item.href !== "/dashboard" && item.href !== "/settings" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "h-11 rounded-[16px] flex items-center gap-2.5 px-3 font-bold text-[13px] transition-all border border-transparent",
                isActive
                  ? "bg-primary text-white shadow-[0_16px_34px_rgba(47,111,237,0.28)]"
                  : "text-text-2 hover:bg-muted"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Profile Card - matches design: no chevron, simple layout */}
      <div className="flex items-center gap-3 p-3 rounded-[18px] border border-border/95 bg-white/92">
        <Avatar className="w-10 h-10 rounded-[16px] border border-border/95">
          <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
          <AvatarFallback className="rounded-[16px] bg-[rgba(21,25,35,0.04)]">
            {getInitials(user?.name || "U")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-black text-[13px] text-text-1 truncate">
            {user?.name || "Creator Account"}
          </div>
          <div className="font-bold text-[12px] text-text-3 mt-1">
            {user?.role === "ADMIN" ? "Admin" : "Owner"}
          </div>
        </div>
      </div>
    </aside>
  );
}
