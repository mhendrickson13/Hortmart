"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import {
  Menu,
  X,
  GraduationCap,
  Bookmark,
  Settings,
  LogOut,
  LayoutDashboard,
  BarChart3,
  Users,
  Home,
  User,
} from "lucide-react";

interface MobileNavProps {
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
}

const learnerNavItems = [
  { href: "/courses", icon: Home, label: "Courses" },
  { href: "/my-courses", icon: Bookmark, label: "My Courses" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/manage-courses", icon: GraduationCap, label: "Courses" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav({ user, variant = "learner" }: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navItems = variant === "admin" ? adminNavItems : learnerNavItems;

  // Ensure portal only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  // Close menu when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const menuContent = isOpen ? (
    <div 
      className="fixed inset-0 bg-black/60 lg:hidden"
      style={{ zIndex: 9999 }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="absolute right-0 top-0 h-full w-72 p-4 shadow-2xl flex flex-col animate-slide-in-right"
        style={{ backgroundColor: '#ffffff', zIndex: 10000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-4">
          <Logo 
            href={variant === "admin" ? "/dashboard" : "/courses"} 
            size="sm"
            subtitle={variant === "admin" ? "Creator" : undefined}
          />
          <Button variant="secondary" size="icon-sm" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* User Info */}
        {user && (
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-surface-3 border border-border/50">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback>{getInitials(user.name || "U")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold text-text-1 truncate">{user.name || "User"}</div>
              <div className="text-caption text-text-3">
                {user.role === "ADMIN" ? "Admin" : user.role === "CREATOR" ? "Creator" : "Learner"}
              </div>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
                  isActive
                    ? "bg-primary text-white shadow-primary"
                    : "text-text-2 hover:bg-surface-3"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        {user && (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-colors font-medium mt-4"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        )}

        {/* Sign In (if no user) */}
        {!user && (
          <Link
            href="/login"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold mt-4"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button variant="secondary" size="icon" onClick={() => setIsOpen(true)}>
        <Menu className="w-5 h-5" />
      </Button>

      {/* Render menu in portal at document body level */}
      {mounted && menuContent && createPortal(menuContent, document.body)}
    </>
  );
}
