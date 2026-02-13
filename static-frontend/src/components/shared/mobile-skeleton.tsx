import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Shimmer({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%]",
        className
      )}
    />
  );
}

export function MobileCourseCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      {/* Cover */}
      <Shimmer className="aspect-video rounded-none" />
      
      {/* Content */}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-3 w-12" />
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

export function MobileCourseCardCompactSkeleton() {
  return (
    <div className="mobile-card flex gap-3">
      <Shimmer className="w-20 h-20 rounded-xl flex-shrink-0" />
      <div className="flex-1 py-0.5 space-y-2">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-2 w-full mt-2" />
      </div>
    </div>
  );
}

export function MobileListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
      </div>
      <Shimmer className="w-6 h-6 rounded-full" />
    </div>
  );
}

export function MobileStatCardSkeleton() {
  return (
    <div className="mobile-card">
      <div className="flex items-center gap-3">
        <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

export function MobileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-4 w-32" />
      </div>
      <Shimmer className="w-10 h-10 rounded-xl" />
      <Shimmer className="w-10 h-10 rounded-xl" />
    </div>
  );
}

export function MobileVideoPlayerSkeleton() {
  return (
    <div className="space-y-3">
      <Shimmer className="aspect-video rounded-2xl" />
      <div className="mobile-card">
        <div className="flex items-start gap-3">
          <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-4 w-full" />
          </div>
          <div className="text-right">
            <Shimmer className="h-6 w-12 mb-1" />
            <Shimmer className="h-2 w-14" />
          </div>
        </div>
        <Shimmer className="h-2 w-full mt-3 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Shimmer className="h-11 flex-1 rounded-xl" />
        <Shimmer className="h-11 w-11 rounded-xl" />
        <Shimmer className="h-11 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

export function MobileUserCardSkeleton() {
  return (
    <div className="mobile-card flex items-center gap-3">
      <Shimmer className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-3 w-24" />
      </div>
      <Shimmer className="h-8 w-20 rounded-lg" />
    </div>
  );
}

// Grid of course cards
export function MobileCourseGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MobileCourseCardSkeleton key={i} />
      ))}
    </div>
  );
}

// List of items
export function MobileListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: count }).map((_, i) => (
        <MobileListItemSkeleton key={i} />
      ))}
    </div>
  );
}
