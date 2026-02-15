import { MobileLayoutWrapper } from "@/components/shared/mobile-layout-wrapper";
import { DesktopLayoutWrapper } from "@/components/shared/desktop-layout-wrapper";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout for pages that are accessible to both authenticated and unauthenticated users.
 * Shows the learner layout with optional user info.
 */
export function PublicLearnerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  // Wait for auth check to complete to avoid flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:block fixed inset-7 rounded-4xl glass shadow-soft-1">
        <div className="flex gap-5 p-4.5 h-full overflow-hidden">
          <DesktopLayoutWrapper user={user ? { name: user.name, image: user.image, role: user.role } : undefined} variant="learner" includeLeftRail>
            {children}
          </DesktopLayoutWrapper>
        </div>
      </div>
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileLayoutWrapper user={user ? { name: user.name, image: user.image, role: user.role } : undefined} variant="learner">
          {children}
        </MobileLayoutWrapper>
      </div>
    </div>
  );
}
