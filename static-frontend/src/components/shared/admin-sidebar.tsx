import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  GraduationCap,
  BarChart3,
  Users,
  Settings,
  LogOut,
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

const navItemKeys = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "/manage-courses", icon: GraduationCap, labelKey: "nav.manageCourses" },
  { href: "/analytics", icon: BarChart3, labelKey: "nav.analytics" },
  { href: "/users", icon: Users, labelKey: "nav.users" },
  { href: "/settings", icon: Settings, labelKey: "nav.settings" },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-[260px] rounded-[22px] bg-white/85 dark:bg-card/85 border border-border/90 p-4 flex flex-col gap-3.5 transition-colors duration-200">
      {/* Brand - matches design */}
      <div className="flex items-center gap-2.5 p-2.5 rounded-[18px] bg-primary/10 border border-primary/14">
        <Logo href="/dashboard" subtitle="Creator Console" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 mt-0.5">
        {navItemKeys.map((item) => {
          const isActive = 
            pathname === item.href || 
            (item.href !== "/dashboard" && item.href !== "/settings" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "h-11 rounded-[16px] flex items-center gap-2.5 px-3 font-bold text-[13px] transition-all border border-transparent",
                isActive
                  ? "bg-primary text-white shadow-[0_16px_34px_rgba(47,111,237,0.28)]"
                  : "text-text-2 hover:bg-muted"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="h-10 rounded-[16px] flex items-center gap-2.5 px-3 font-bold text-[13px] text-text-2 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition-all border border-transparent"
      >
        <LogOut className="w-[18px] h-[18px]" />
        {t("nav.signOut")}
      </button>

      {/* Profile Card */}
      <div className="flex items-center gap-3 p-3 rounded-[18px] border border-border/95 bg-white/92 dark:bg-card/92">
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
