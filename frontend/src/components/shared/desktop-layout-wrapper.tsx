"use client";

import { useState, useEffect } from "react";
import { DesktopHeader } from "./desktop-header";
import { LeftRail } from "./left-rail";
import { DesktopSearchDialog } from "./desktop-search-dialog";

interface DesktopLayoutWrapperProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    image?: string | null;
    role?: string;
  };
  variant?: "learner" | "admin";
  includeLeftRail?: boolean;
  showHeader?: boolean;
}

export function DesktopLayoutWrapper({ 
  children, 
  user, 
  variant = "learner",
  includeLeftRail = false,
  showHeader = true
}: DesktopLayoutWrapperProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Admin pages have their own headers with search/actions per client design
  const shouldShowHeader = showHeader && variant !== "admin";

  return (
    <>
      {includeLeftRail && (
        <LeftRail 
          user={user} 
          variant={variant} 
          onSearchClick={() => setIsSearchOpen(true)} 
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Desktop Header with Search & Notifications - only for learner variant */}
        {shouldShowHeader && (
          <DesktopHeader 
            user={user} 
            variant={variant} 
            onSearchClick={() => setIsSearchOpen(true)}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col gap-3.5 overflow-auto">
          {children}
        </main>
      </div>

      {/* Search Dialog - controlled at this level */}
      <DesktopSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        variant={variant}
      />
    </>
  );
}
