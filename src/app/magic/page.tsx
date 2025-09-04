'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useAuth } from '@/app/state/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { account } from '@/app/lib/appwrite';

function MagicCallbackContent() {
    const router = useRouter();
    const search = useSearchParams();
    const [status, setStatus] = useState('Finalizing sign-in…');
    const onceRef = useRef(false);
    const { refresh } = useAuth();

    useEffect(() => {
        const userId = search.get('userId');
        const secret = search.get('secret');
        const failure = search.get('failure');

        if (failure) {
            setStatus('Link invalid or cancelled.');
            return;
        }
        if (!userId || !secret) {
            setStatus('Missing token in URL.');
            return;
        }

        if (onceRef.current) return;
        onceRef.current = true;
        (async () => {
            try {
                // Ensure no existing session blocks creating a new one
                try {
                    await account.deleteSessions();
                } catch {
                    // Ignore if no active session
                }
                // Complete login using the URL token
                await account.updateMagicURLSession({ userId, secret });
                // Sync auth context with new session
                try { await refresh(); } catch { }
                try {
                    const secure = location.protocol === 'https:' ? '; secure' : '';
                    document.cookie = `d_auth=1; path=/; max-age=86400; samesite=lax${secure}`;
                } catch { }
                router.replace('/dashboard');
            } catch (e: unknown) {
                const error = e as Error;
                setStatus(error?.message ?? 'Could not create session.');
            }
        })();
    }, [router, search, refresh]);

    return (
        <div className="min-h-dvh grid place-items-center p-3 sm:p-6 bg-[var(--background)] text-[var(--foreground)]">
            <div className="rounded-2xl border border-[var(--border)] p-4 sm:p-6 shadow-sm max-w-sm sm:max-w-md w-full bg-[var(--card-background)]">
                <p className="text-sm sm:text-base text-[var(--muted-foreground)] text-center">{status}</p>
            </div>
        </div>
    );
}

export default function MagicCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-dvh grid place-items-center p-6 bg-[var(--background)] text-[var(--foreground)]">
                <div className="rounded-2xl border border-[var(--border)] p-6 shadow-sm bg-[var(--card-background)]">
                    <p className="text-[var(--muted-foreground)]">Loading...</p>
                </div>
            </div>
        }>
            <MagicCallbackContent />
        </Suspense>
    );
}
