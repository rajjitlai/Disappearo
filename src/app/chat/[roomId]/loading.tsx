'use client';

export default function LoadingChat() {
    return (
        <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
            <div className="max-w-5xl mx-auto p-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`h-12 w-2/3 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse ${i % 2 ? 'ml-auto' : 'mr-auto'}`} />
                ))}
            </div>
        </div>
    );
}


