function NewsCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden border border-border rounded-2xl bg-surface/40">
      <div className="flex flex-col p-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mb-3 h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function NewsLoading() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <div className="mx-auto mb-4 h-4 w-24 animate-pulse rounded-full bg-muted" />
          <div className="mx-auto mb-3 h-10 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="mx-auto h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
