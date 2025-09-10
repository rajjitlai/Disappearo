'use client';

import { useState } from 'react';
import { account } from '@/app/lib/appwrite';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { ID } from 'appwrite';
import { useAuth } from '@/app/state/AuthContext';

export default function LoginPage() {
    const { user, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState('');

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setErr('');
        try {
            const url = `${window.location.origin}/magic`;
            await account.createMagicURLToken({ userId: ID.unique(), email, url });
            setSent(true);
        } catch (e: unknown) {
            const error = e as Error;
            setErr(error?.message ?? 'Failed to send magic link');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="min-h-dvh grid place-items-center p-6">Loading…</div>;
    if (user) {
        if (typeof window !== 'undefined') {
            window.location.replace('/dashboard');
        }
        return null;
    }

    return (
        <div className="min-h-dvh grid place-items-center p-3 sm:p-6 bg-[var(--background)] text-[var(--foreground)]">
            <Card className="w-full max-w-sm sm:max-w-md">
                <CardHeader className="pb-4">
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold">Sign in</h1>
                        <p className="text-xs sm:text-sm text-[var(--foreground)]/70 mt-1">Secure magic link to your inbox.</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-3">
                        <Input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-sm sm:text-base"
                        />
                        <Button disabled={sending} className="w-full text-sm sm:text-base">
                            {sending ? 'Sending…' : 'Send magic link'}
                        </Button>
                    </form>
                    {sent && (
                        <div className="mt-4 text-xs sm:text-sm text-green-600">
                            Check your email for the sign-in link. (It may take a few minutes to arrive and be sure to check your spam folder.)
                        </div>
                    )}
                    {err && <div className="mt-4 text-xs sm:text-sm text-red-600">{err}</div>}
                </CardContent>
            </Card>
        </div>
    );
}
