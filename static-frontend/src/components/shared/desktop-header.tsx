import { useLocation } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DesktopNotificationsPopover } from "./desktop-notifications-popover";
import { notifications as notificationsApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Search, Bell, HelpCircle } from "lucide-react";

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

  // Fetch real unread count
  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!authUser,
    refetchInterval: 60000, // Poll every 60 seconds
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count ?? 0;

  // Get page title based on pathname
  const getPageTitle = () => {
    if (pathname === "/courses") return "Explore Courses";
    if (pathname.startsWith("/my-courses")) return "My Learning";
    if (pathname.startsWith("/profile")) return "Profile";
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/dashboard")) return "Dashboard";
    if (pathname.startsWith("/manage-courses")) return "Manage Courses";
    if (pathname.startsWith("/analytics")) return "Analytics";
    if (pathname.startsWith("/users")) return "User Management";
    if (pathname.startsWith("/player")) return "Course Player";
    if (pathname.startsWith("/course/")) return "Course Details";
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
            <span className="text-text-3 font-normal flex-1 text-left">Search...</span>
            <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-text-3">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Help & Support */}
          <div className="relative">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setIsHelpOpen(!isHelpOpen)}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            
            {/* Help Dropdown */}
            {isHelpOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsHelpOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-lg py-2 z-50 animate-fade-in-up">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-text-1 hover:bg-muted transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-text-2" />
                    Help Center
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-text-1 hover:bg-muted transition-colors"
                  >
                    <svg className="w-4 h-4 text-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Documentation
                  </a>
                  <div className="border-t border-border my-1" />
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-text-1 hover:bg-muted transition-colors"
                  >
                    <svg className="w-4 h-4 text-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Privacy Policy
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsHelpOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-text-1 hover:bg-muted transition-colors"
                  >
                    <svg className="w-4 h-4 text-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Terms of Service
                  </a>
                </div>
              </>
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
