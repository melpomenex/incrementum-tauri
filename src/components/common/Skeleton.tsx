/**
 * Skeleton loading components
 * For showing placeholder content while data loads
 */

import { cn } from "../../utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "card" | "text" | "circle" | "avatar";
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({
  className,
  variant = "default",
  width,
  height,
  count = 1,
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-muted rounded-md";

  const variantStyles = {
    default: "",
    card: "rounded-xl",
    text: "rounded",
    circle: "rounded-full",
    avatar: "rounded-full",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(baseStyles, variantStyles[variant], className)}
          style={style}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

// Pre-built skeleton patterns for common use cases

export function DocumentCardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-lg bg-card">
      <div className="flex items-start gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="70%" height={16} />
          <Skeleton width="40%" height={12} />
          <div className="flex gap-2 pt-1">
            <Skeleton width={60} height={20} />
            <Skeleton width={60} height={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-2 border border-border rounded-md">
          <Skeleton variant="card" className="aspect-[2/3] w-full mb-2" />
          <Skeleton width="80%" height={12} />
          <Skeleton width="40%" height={10} className="mt-1" />
        </div>
      ))}
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton variant="circle" width={24} height={24} />
        <Skeleton width={80} height={14} />
      </div>
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <Skeleton width={120} height={14} />
        <Skeleton count={3} height={16} />
        <div className="pt-4 border-t border-border">
          <Skeleton width={100} height={14} />
          <Skeleton count={2} height={14} className="mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={80} variant="card" />
        ))}
      </div>
    </div>
  );
}

export function ImportDialogSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton variant="card" height={80} />
      <div className="space-y-3">
        <Skeleton width={100} height={14} />
        <Skeleton height={40} />
      </div>
      <div className="space-y-3">
        <Skeleton width={100} height={14} />
        <div className="flex flex-wrap gap-2">
          <Skeleton width={60} height={28} />
          <Skeleton width={80} height={28} />
        </div>
        <Skeleton height={40} />
      </div>
      <div className="space-y-3">
        <Skeleton width={150} height={14} />
        <div className="space-y-2">
          <Skeleton height={24} />
          <Skeleton height={24} />
          <Skeleton height={24} />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={80} height={12} />
          <Skeleton width={60} height={28} />
        </div>
        <Skeleton variant="circle" width={40} height={40} />
      </div>
    </div>
  );
}

export function QueueListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 border border-border rounded-lg flex items-center gap-3">
          <Skeleton variant="circle" width={32} height={32} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={80} height={24} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
