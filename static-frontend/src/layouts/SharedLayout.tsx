import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { MobileLayoutWrapper } from "@/components/shared/mobile-layout-wrapper";
import { DesktopLayoutWrapper } from "@/components/shared/desktop-layout-wrapper";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "./ProtectedRoute";

export function SharedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "CREATOR";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Desktop Layout */}
        <div className="hidden lg:block fixed inset-7 rounded-4xl glass shadow-soft-1">
          <div className="flex gap-4.5 p-4.5 h-full overflow-hidden">
            {isAdmin && <AdminSidebar user={user ? { name: user.name, image: user.image, role: user.role } : undefined} />}
            <DesktopLayoutWrapper
              user={user ? { name: user.name, image: user.image, role: user.role } : undefined}
              variant={isAdmin ? "admin" : "learner"}
              includeLeftRail={!isAdmin}
            >
              {children}
            </DesktopLayoutWrapper>
          </div>
        </div>
        {/* Mobile Layout */}
        <div className="lg:hidden">
          <MobileLayoutWrapper user={user ? { name: user.name, image: user.image, role: user.role } : undefined} variant={isAdmin ? "admin" : "learner"}>
            {children}
          </MobileLayoutWrapper>
        </div>
      </div>
    </ProtectedRoute>
  );
}
