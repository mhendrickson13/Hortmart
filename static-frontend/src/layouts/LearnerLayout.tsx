import { MobileLayoutWrapper } from "@/components/shared/mobile-layout-wrapper";
import { DesktopLayoutWrapper } from "@/components/shared/desktop-layout-wrapper";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "./ProtectedRoute";

export function LearnerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
}
