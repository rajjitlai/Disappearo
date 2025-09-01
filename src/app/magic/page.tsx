'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { account } from '@/app/lib/appwrite';

export default function MagicCallback() {
    const router = useRouter();
    const search = useSearchParams();
    const [status, setStatus] = useState('Finalizing sign-in…');

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

        (async () => {
            try {
                // Complete login using the URL token
                await account.updateMagicURLSession(userId, secret);
                router.replace('/dashboard');
            } catch (e: any) {
                setStatus(e?.message ?? 'Could not create session.');
            }
        })();
    }, [router, search]);

    return (
        <div className="min-h-dvh grid place-items-center p-6">
            <div className="rounded-2xl border p-6 shadow-sm">
                <p className="text-gray-700">{status}</p>
            </div>
        </div>
    );
}
