import { auth } from "@/lib/auth";
import { LeftRail } from "@/components/shared/left-rail";
import { DesktopLayoutWrapper } from "@/components/shared/desktop-layout-wrapper";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout - Full page with left rail and header */}
      <div className="hidden lg:block fixed inset-7 rounded-4xl glass shadow-soft-1">
        <div className="flex gap-5 p-4.5 h-full overflow-hidden">
          <LeftRail user={session?.user} variant="learner" />
          <DesktopLayoutWrapper user={session?.user} variant="learner">
            {children}
          </DesktopLayoutWrapper>
        </div>
      </div>
      
      {/* Mobile Layout - Immersive player without bottom nav */}
      <div 
        className="lg:hidden min-h-screen overflow-x-hidden"
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }}
      >
        <main className="p-3 pb-4">
          {children}
        </main>
      </div>
    </div>
  );
}
