'use client';

import { useEffect, useState } from 'react';
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
            await account.createMagicURLToken(ID.unique(), email, url);
            setSent(true);
        } catch (e: any) {
            setErr(e?.message ?? 'Failed to send magic link');
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
        <div className="min-h-dvh grid place-items-center p-6 bg-gradient-to-b from-gray-50 to-white">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <h1 className="text-xl font-semibold">Sign in</h1>
                    <p className="text-sm text-gray-500 mt-1">Secure magic link to your inbox.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-3">
                        <Input
                            type="email"
                            required
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button disabled={sending} className="w-full">
                            {sending ? 'Sending…' : 'Send magic link'}
                        </Button>
                    </form>
                    {sent && (
                        <div className="mt-4 text-sm text-green-600">
                            Check your email for the sign-in link.
                        </div>
                    )}
                    {err && <div className="mt-4 text-sm text-red-600">{err}</div>}
                </CardContent>
            </Card>
        </div>
    );
}
