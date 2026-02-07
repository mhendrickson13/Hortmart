import { auth } from "@/lib/auth";
import { MobileLayoutWrapper } from "@/components/shared/mobile-layout-wrapper";
import { DesktopLayoutWrapper } from "@/components/shared/desktop-layout-wrapper";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Layout */}
      <div className="hidden lg:block fixed inset-7 rounded-4xl glass shadow-soft-1">
        <div className="flex gap-5 p-4.5 h-full overflow-hidden">
          <DesktopLayoutWrapper user={session?.user} variant="learner" includeLeftRail>
            {children}
          </DesktopLayoutWrapper>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <MobileLayoutWrapper user={session?.user} variant="learner">
        {children}
      </MobileLayoutWrapper>
    </div>
  );
}
