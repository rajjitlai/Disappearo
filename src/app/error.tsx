'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);
    return (
        <html>
            <body>
                <div className="min-h-dvh grid place-items-center p-6 text-center bg-[var(--background)] text-[var(--foreground)]">
                    <div>
                        <h2 className="text-xl font-semibold">Something went wrong</h2>
                        <p className="text-[var(--muted-foreground)] mt-2">Please try again.</p>
                        <button onClick={() => reset()} className="mt-4 rounded-lg border border-[var(--border)] px-4 py-2 hover:bg-[var(--muted)] transition-colors">Try again</button>
                    </div>
                </div>
            </body>
        </html>
    );
}


