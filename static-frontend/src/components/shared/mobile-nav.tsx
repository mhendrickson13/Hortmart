import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import {
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
  ChevronRight,
  HelpCircle,
  Shield,
} from "lucide-react";

interface MobileNavProps {
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
  isOpen?: boolean;
  onClose?: () => void;
}

const learnerNavItems = [
  { href: "/courses", icon: Home, label: "Explore Courses", description: "Discover new courses" },
  { href: "/my-courses", icon: Bookmark, label: "My Learning", description: "Continue learning" },
];

const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", description: "Overview & stats" },
  { href: "/manage-courses", icon: GraduationCap, label: "Manage Courses", description: "Create & edit courses" },
  { href: "/analytics", icon: BarChart3, label: "Analytics", description: "Track performance" },
  { href: "/users", icon: Users, label: "Users", description: "Manage users" },
];

const accountItems = [
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav({ user, variant = "learner", isOpen: externalIsOpen, onClose }: MobileNavProps) {
  const { pathname } = useLocation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { t } = useTranslation();
  const navItems = variant === "admin" ? adminNavItems : learnerNavItems;
  const drawerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);

  // Use external or internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Ensure portal only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (onClose) {
        onClose();
      } else {
        setInternalIsOpen(false);
      }
    }, 200);
  }, [onClose]);

  const { logout } = useAuth();
  const navTo = useNavigate();

  const handleSignOut = () => {
    logout();
    navTo("/login");
  };

  // Close menu when pathname changes
  useEffect(() => {
    if (isOpen) {
      handleClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Touch handlers for swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    if (diff > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentXRef.current - startXRef.current;
    if (diff > 100) {
      handleClose();
    } else if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
    startXRef.current = 0;
    currentXRef.current = 0;
  };

  const menuContent = isOpen ? (
    <div 
      className={cn(
        "fixed inset-0 lg:hidden transition-opacity duration-200",
        isClosing ? "opacity-0" : "opacity-100"
      )}
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          "absolute right-0 top-0 h-full w-[85%] max-w-[320px] flex flex-col transition-transform duration-200 ease-out",
          "bg-white dark:bg-card shadow-2xl",
          isClosing ? "translate-x-full" : "translate-x-0 animate-slide-in-right"
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Logo 
            href={variant === "admin" ? "/dashboard" : "/courses"} 
            size="sm"
            subtitle={variant === "admin" ? "Creator" : undefined}
          />
          <button 
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-text-2 hover:bg-muted/80 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        {user && (
          <Link 
            to="/profile"
            onClick={handleClose}
            className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 flex items-center gap-3 hover:from-primary/10 hover:to-primary/15 active:scale-[0.98] transition-all"
          >
            <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-card shadow-lg">
              <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
              <AvatarFallback className="bg-primary text-white font-bold">
                {getInitials(user.name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text-1 truncate">{user.name || "User"}</p>
              <p className="text-caption text-text-3">
                {user.role === "ADMIN" ? t("roles.admin") : user.role === "CREATOR" ? t("roles.creator") : t("roles.learner")}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-3 flex-shrink-0" />
          </Link>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {/* Main Navigation */}
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wider mb-2 px-1">
              {variant === "admin" ? "Creator Tools" : t("nav.home")}
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={handleClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98]",
                      isActive
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "text-text-1 hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      isActive ? "bg-white/20" : "bg-muted"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{item.label}</p>
                      <p className={cn(
                        "text-[11px]",
                        isActive ? "text-white/70" : "text-text-3"
                      )}>
                        {item.description}
                      </p>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Account Section */}
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wider mb-2 px-1">
              Account
            </p>
            <nav className="space-y-1">
              {accountItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={handleClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98]",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-1 hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-5 h-5 text-text-2 flex-shrink-0" />
                    <span className="font-medium text-body-sm flex-1">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-text-3 flex-shrink-0" />
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Support Section */}
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-text-3 uppercase tracking-wider mb-2 px-1">
              Support
            </p>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  window.open("mailto:support@cxflow.io", "_blank");
                  handleClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-text-2 hover:bg-muted transition-all active:scale-[0.98]"
              >
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-body-sm text-left">Help & Support</span>
              </button>
              <a
                href="https://cxflow.io/privacy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-text-2 hover:bg-muted transition-all active:scale-[0.98]"
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-body-sm text-left">Privacy Policy</span>
              </a>
              <a
                href="https://cxflow.io/terms"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-text-2 hover:bg-muted transition-all active:scale-[0.98]"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-body-sm text-left">Terms of Service</span>
              </a>
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-danger/10 text-danger font-semibold hover:bg-danger/15 active:scale-[0.98] transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Trigger button (only if not controlled externally) */}
      {externalIsOpen === undefined && (
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setInternalIsOpen(true)}
          className="lg:hidden"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      )}

      {/* Render menu in portal at document body level */}
      {mounted && menuContent && createPortal(menuContent, document.body)}
    </>
  );
}
