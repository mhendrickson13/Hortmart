import { useLocation, Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DesktopNotificationsPopover } from "./desktop-notifications-popover";
import { notifications as notificationsApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useAppPreferences } from "@/lib/theme-context";
import { Search, Bell, HelpCircle, Shield, FileText } from "lucide-react";

interface DesktopHeaderProps {
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
  onSearchClick?: () => void;
}

export function DesktopHeader({ user, variant = "learner", onSearchClick }: DesktopHeaderProps) {
  const { pathname } = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { user: authUser } = useAuth();
  const { t } = useAppPreferences();
  const helpRef = useRef<HTMLDivElement>(null);

  // Close help dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch real unread count
  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!authUser,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count ?? 0;

  // Get page title based on pathname
  const getPageTitle = () => {
    if (pathname === "/courses") return t("courses.title");
    if (pathname.startsWith("/my-courses")) return t("nav.myCourses");
    if (pathname.startsWith("/profile")) return t("nav.profile");
    if (pathname.startsWith("/settings")) return t("nav.settings");
    if (pathname.startsWith("/dashboard")) return t("dashboard.title");
    if (pathname.startsWith("/manage-courses")) return t("nav.manageCourses");
    if (pathname.startsWith("/analytics")) return t("analytics.title");
    if (pathname.startsWith("/users")) return t("users.title");
    if (pathname.startsWith("/player")) return t("player.courseContent");
    if (pathname.startsWith("/course/")) return t("courses.title");
    return variant === "admin" ? "Creator Console" : "VideoLecture";
  };

  return (
    <>
      <header className="h-14 flex items-center justify-between gap-4 mb-4">
        {/* Left - Page Title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <h1 className="text-h3 font-bold text-text-1">{getPageTitle()}</h1>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3 pr-1">
          {/* Search Button - Wide */}
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 px-4 w-[280px] justify-start"
            onClick={onSearchClick}
          >
            <Search className="w-4 h-4 text-text-3" />
            <span className="text-text-3 font-normal flex-1 text-left">{t("common.search")}...</span>
            <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-text-3">
              <span className="text-xs">{typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl+'}</span>K
            </kbd>
          </Button>

          {/* Help & Support */}
          <div className="relative" ref={helpRef}>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setIsHelpOpen(!isHelpOpen)}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            
            {/* Help Dropdown */}
            {isHelpOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-lg py-2 z-50 animate-fade-in-up">
                <a
                  href="mailto:support@cxflow.io"
                  onClick={() => setIsHelpOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-text-1 hover:bg-muted transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-text-2" />
                  Help Center
                </a>
                <div className="border-t border-border my-1" />
                <Link
                  to="/settings?tab=legal"
                  onClick={() => setIsHelpOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-text-1 hover:bg-muted transition-colors"
                >
                  <Shield className="w-4 h-4 text-text-2" />
                  Privacy Policy
                </Link>
                <Link
                  to="/settings?tab=legal"
                  onClick={() => setIsHelpOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-text-1 hover:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4 text-text-2" />
                  Terms of Service
                </Link>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative mr-1">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <Bell className="w-4 h-4" />
            </Button>
            {/* Badge - only show when there are unread notifications */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-danger rounded-full flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
              </span>
            )}
            
            <DesktopNotificationsPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>
        </div>
      </header>
    </>
  );
}
