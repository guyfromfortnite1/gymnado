// Grey shimmering placeholders shown while a page loads, instead of "Loading…".
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

/** A page-shaped placeholder: title + a few cards. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="card space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
