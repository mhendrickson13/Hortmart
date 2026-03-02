import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Bell, Search, Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MobileHeaderProps {
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
  onMenuOpen?: () => void;
  onSearchOpen?: () => void;
  onNotificationsOpen?: () => void;
  showSearch?: boolean;
  title?: string;
  notificationCount?: number;
}

export function MobileHeader({ 
  user, 
  variant = "learner",
  onMenuOpen,
  onSearchOpen,
  onNotificationsOpen,
  showSearch = false,
  title,
  notificationCount = 0,
}: MobileHeaderProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  
  // Get page title based on pathname
  const getPageTitle = () => {
    if (title) return title;
    
    if (pathname === "/courses") return t("mobileHeader.explore");
    if (pathname.startsWith("/my-courses")) return t("nav.myCourses");
    if (pathname.startsWith("/profile")) return t("nav.profile");
    if (pathname.startsWith("/settings")) return t("nav.settings");
    if (pathname.startsWith("/dashboard")) return t("nav.dashboard");
    if (pathname.startsWith("/manage-courses")) return t("nav.courses");
    if (pathname.startsWith("/analytics")) return t("nav.analytics");
    if (pathname.startsWith("/users")) return t("nav.users");
    if (pathname.startsWith("/player")) return t("mobileHeader.nowPlaying");
    if (pathname.startsWith("/course/")) return t("mobileHeader.courseDetails");
    return variant === "admin" ? t("mobileHeader.creator") : t("mobileHeader.appName");
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("mobileHeader.goodMorning");
    if (hour < 17) return t("mobileHeader.goodAfternoon");
    return t("mobileHeader.goodEvening");
  };

  // Show avatar greeting on these learner pages (Home, My Courses, Profile, Settings, Course Details)
  const showAvatarGreeting = 
    pathname === "/courses" || 
    pathname === "/my-courses" || 
    pathname.startsWith("/my-courses") ||
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/course/");

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/90 dark:bg-card/90 backdrop-blur-xl border-b border-border/30" />
      
      <div className="relative flex items-center justify-between h-14 px-4">
        {/* Left section */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showAvatarGreeting ? (
            // Show greeting with avatar on main learner pages
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/profile" className="flex-shrink-0">
                <Avatar className="w-9 h-9 ring-2 ring-primary/20 ring-offset-1 ring-offset-white dark:ring-offset-card">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || t("settings.user")} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(user?.name || t("settings.user"))}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] text-text-3 font-medium leading-tight">{greeting()},</p>
                <h1 className="text-sm font-bold text-text-1 truncate leading-tight">
                  {user?.name || t("mobileHeader.welcome")}
                </h1>
              </div>
            </div>
          ) : (
            // Other pages - show page title
            <div className="flex items-center gap-2.5">
              <Logo 
                href={variant === "admin" ? "/dashboard" : "/courses"} 
                size="sm"
                showText={false}
              />
              <div className="h-5 w-px bg-border/50" />
              <h1 className="text-sm font-bold text-text-1 truncate">{getPageTitle()}</h1>
            </div>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1">
          {showSearch && (
            <button 
              type="button"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-text-2 hover:bg-muted active:scale-95 transition-all touch-manipulation"
              onClick={onSearchOpen}
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          
          <button 
            type="button"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-2 hover:bg-muted active:scale-95 transition-all relative touch-manipulation"
            onClick={onNotificationsOpen}
          >
            <Bell className="w-5 h-5" />
            {/* Notification badge */}
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-danger rounded-full flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              </span>
            )}
          </button>

          <button 
            type="button"
            onClick={onMenuOpen}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-2 hover:bg-muted active:scale-95 transition-all touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
