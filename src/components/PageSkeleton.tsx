function Bar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
      aria-hidden="true"
    />
  );
}

export default function PageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>

      <section className="flex flex-col items-start m-auto md:items-center" id="home">
        <Bar className="relative w-full md:max-w-[70vw] h-[15vh] md:h-[25vh] mx-auto md:mt-8" />
        <Bar className="h-9 w-3/4 max-w-md mt-6 mb-4 md:mx-auto" />
        <Bar className="h-7 w-2/3 max-w-sm mb-4 md:mx-auto" />
        <Bar className="h-4 w-full max-w-lg mb-2" />
        <Bar className="h-4 w-1/2 max-w-xs mb-2 self-center" />
        <Bar className="h-8 w-40 rounded-md self-center" />
      </section>

      <section className="flex flex-col items-start md:px-4 py-4 mx-auto md:mt-10">
        <Bar className="h-7 w-56 mb-4 self-center" />
        <Bar className="h-4 w-full max-w-2xl mb-2" />
        <Bar className="h-4 w-5/6 max-w-xl mb-6" />
        <div className="flex flex-col items-start py-4 gap-3 w-full">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-5 w-2/3 max-w-sm" />
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start md:px-4 py-4 mx-auto md:mt-10" id="services">
        <Bar className="h-7 w-56 mb-4 self-center" />
        <Bar className="h-5 w-64 mb-2" />
        <Bar className="h-4 w-full max-w-4xl mb-6" />
        <div className="grid gap-4 md:grid-cols-2 w-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bar key={i} className="min-h-50 w-full" />
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start md:px-4 py-4 mx-auto md:mt-10" id="anfahrt">
        <Bar className="h-7 w-48 mb-4 self-center" />
        <Bar className="h-[50vh] w-full" />
      </section>
    </div>
  );
}
