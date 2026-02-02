import { auth } from "@/lib/auth";
import { LeftRail } from "@/components/shared/left-rail";
import { MobileNav } from "@/components/shared/mobile-nav";
import { Logo } from "@/components/shared/logo";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-sm border-b border-border/50 z-50 flex items-center justify-between px-4">
        <Logo href="/courses" size="sm" />
        <MobileNav user={session?.user} variant="learner" />
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden lg:block fixed inset-7 rounded-4xl glass shadow-soft-1">
        <div className="flex gap-5 p-4.5 h-full overflow-hidden">
          <LeftRail user={session?.user} variant="learner" />
          <main className="flex-1 min-w-0 flex flex-col gap-3.5 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="lg:hidden pt-16 pb-4 px-4 min-h-screen">
        <main className="flex flex-col gap-3">
          {children}
        </main>
      </div>
    </div>
  );
}
