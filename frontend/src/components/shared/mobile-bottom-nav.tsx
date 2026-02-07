"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  GraduationCap,
  Search,
  User,
  LayoutDashboard,
  BarChart3,
  Users,
} from "lucide-react";

interface MobileBottomNavProps {
  variant?: "learner" | "admin";
  onSearchClick?: () => void;
}

// Matches design: Home, My Courses, Search, Profile
const learnerNavItems = [
  { href: "/courses", icon: Home, label: "Home", isButton: false },
  { href: "/my-courses", icon: GraduationCap, label: "My Courses", isButton: false },
  { href: "#search", icon: Search, label: "Search", isButton: true },
  { href: "/profile", icon: User, label: "Profile", isButton: false },
];

const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", isButton: false },
  { href: "/manage-courses", icon: GraduationCap, label: "Courses", isButton: false },
  { href: "/analytics", icon: BarChart3, label: "Analytics", isButton: false },
  { href: "/users", icon: Users, label: "Users", isButton: false },
];

export function MobileBottomNav({ variant = "learner", onSearchClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const navItems = variant === "admin" ? adminNavItems : learnerNavItems;

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur-xl border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around h-14 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && item.href !== "/courses" && pathname.startsWith(item.href));
          
          // Special case for /courses - only exact match
          const isCoursesActive = item.href === "/courses" && pathname === "/courses";
          // Profile is also active when on settings page
          const isProfileActive = item.href === "/profile" && (pathname.startsWith("/profile") || pathname.startsWith("/settings"));
          const finalActive = item.href === "/courses" ? isCoursesActive : 
                             item.href === "/profile" ? isProfileActive : isActive;
          
          // Handle search button
          if (item.isButton) {
            return (
              <button
                key={item.href}
                onClick={onSearchClick}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 gap-0.5 py-1.5 relative transition-all duration-200 touch-manipulation",
                  "active:scale-95 active:opacity-70",
                  "text-text-3"
                )}
              >
                <span className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200">
                  <item.icon className="w-5 h-5 transition-all" />
                </span>
                <span className="text-[9px] font-semibold transition-all leading-tight text-text-3">
                  {item.label}
                </span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 py-1.5 relative transition-all duration-200 touch-manipulation",
                "active:scale-95 active:opacity-70",
                finalActive ? "text-primary" : "text-text-3"
              )}
            >
              {/* Active indicator */}
              {finalActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              
              {/* Icon container */}
              <span className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200",
                finalActive 
                  ? "bg-primary/10" 
                  : ""
              )}>
                <item.icon className={cn(
                  "w-5 h-5 transition-all",
                  finalActive && "text-primary"
                )} />
              </span>
              
              {/* Label */}
              <span className={cn(
                "text-[9px] font-semibold transition-all leading-tight",
                finalActive ? "text-primary" : "text-text-3"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
