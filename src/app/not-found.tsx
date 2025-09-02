'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-dvh grid place-items-center p-6 text-center bg-[var(--background)] text-[var(--foreground)]">
            <div>
                <h1 className="text-2xl font-semibold">Page not found</h1>
                <p className="text-[var(--muted-foreground)] mt-2">The page you requested does not exist.</p>
                <div className="mt-4">
                    <Link href="/" className="underline hover:no-underline transition-all">Go home</Link>
                </div>
            </div>
        </div>
    );
}


