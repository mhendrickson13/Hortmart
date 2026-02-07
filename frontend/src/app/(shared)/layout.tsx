import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { MobileLayoutWrapper } from "@/components/shared/mobile-layout-wrapper";
import { DesktopLayoutWrapper } from "@/components/shared/desktop-layout-wrapper";

export default async function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "CREATOR";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:block fixed inset-7 rounded-4xl glass shadow-soft-1">
        <div className="flex gap-4.5 p-4.5 h-full overflow-hidden">
          {isAdmin && <AdminSidebar user={session.user} />}
          <DesktopLayoutWrapper 
            user={session.user} 
            variant={isAdmin ? "admin" : "learner"}
            includeLeftRail={!isAdmin}
          >
            {children}
          </DesktopLayoutWrapper>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <MobileLayoutWrapper user={session.user} variant={isAdmin ? "admin" : "learner"}>
        {children}
      </MobileLayoutWrapper>
    </div>
  );
}
