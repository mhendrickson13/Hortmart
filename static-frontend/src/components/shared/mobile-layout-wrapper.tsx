import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileHeader } from "./mobile-header";
import { MobileNav } from "./mobile-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileSearchSheet } from "./mobile-search-sheet";
import { MobileNotificationsSheet } from "./mobile-notifications-sheet";
import { notifications as notificationsApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
  hideBottomNav?: boolean;
}

export function MobileLayoutWrapper({ 
  children, 
  user, 
  variant = "learner",
  hideBottomNav = false,
}: MobileLayoutWrapperProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { user: authUser } = useAuth();

  // Fetch unread count — shared queryKey with desktop header; React Query deduplicates
  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!authUser,
    staleTime: 60_000,           // fresh for 60s
    refetchInterval: 60_000,     // poll every 60s (was 30s)
    refetchOnWindowFocus: true,
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <div className="lg:hidden min-h-screen flex flex-col">
      {/* Mobile Header */}
      <MobileHeader 
        user={user} 
        variant={variant}
        onMenuOpen={() => setIsMenuOpen(true)}
        onSearchOpen={() => setIsSearchOpen(true)}
        onNotificationsOpen={() => setIsNotificationsOpen(true)}
        showSearch={false}
        notificationCount={unreadCount}
      />
      
      {/* Mobile Navigation Drawer */}
      <MobileNav 
        user={user} 
        variant={variant}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
      
      {/* Mobile Search Sheet */}
      <MobileSearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        variant={variant}
      />
      
      {/* Mobile Notifications Sheet */}
      <MobileNotificationsSheet
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      
      {/* Main Content - Fixed overflow issues */}
      <main 
        className="flex-1 pt-14 px-4 overflow-x-hidden overflow-y-auto"
        style={{ 
          paddingBottom: hideBottomNav ? '1rem' : 'calc(4rem + env(safe-area-inset-bottom, 0px))',
          minHeight: '100vh'
        }}
      >
        <div className="flex flex-col gap-4 py-4">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation */}
      {!hideBottomNav && (
        <MobileBottomNav 
          variant={variant} 
          onSearchClick={() => setIsSearchOpen(true)}
        />
      )}
    </div>
  );
}
