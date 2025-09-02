'use client';

export default function LoadingDashboard() {
    return (
        <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
            <div className="max-w-5xl mx-auto p-6 space-y-4">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2 bg-white dark:bg-gray-800">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


