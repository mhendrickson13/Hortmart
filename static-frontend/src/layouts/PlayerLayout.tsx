import { LeftRail } from "@/components/shared/left-rail";
import { DesktopLayoutWrapper } from "@/components/shared/desktop-layout-wrapper";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "./ProtectedRoute";

export function PlayerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Desktop Layout */}
        <div className="hidden lg:block fixed inset-7 rounded-4xl glass shadow-soft-1">
          <div className="flex gap-5 p-4.5 h-full overflow-hidden">
            <LeftRail user={user ? { name: user.name, image: user.image, role: user.role } : undefined} variant="learner" />
            <DesktopLayoutWrapper user={user ? { name: user.name, image: user.image, role: user.role } : undefined} variant="learner" showHeader={false}>
              {children}
            </DesktopLayoutWrapper>
          </div>
        </div>
        {/* Mobile Layout - Immersive player */}
        <div className="lg:hidden min-h-screen overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
          <main className="p-3 pb-4">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
