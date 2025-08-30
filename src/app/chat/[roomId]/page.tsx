'use client';

import React, { useEffect, useMemo, use } from 'react';
import { ensureAnonSession, sendMessage } from '@/app/lib/appwrite';
import { useRealtimeMessages } from '@/app/hooks/useRealtimeMessages';
import MessageBubble from '@/app/components/MessageBubble';
import MessageInput from '@/app/components/MessageInput';

function dedupeMessages(msgs: any[]) {
    const seen = new Set<string>();
    return msgs.filter((m) => {
        if (seen.has(m.$id)) return false;
        seen.add(m.$id);
        return true;
    });
}

export default function ChatRoom({ params }: { params: Promise<{ roomId: string }> }) {
    // ✅ unwrap params (Next.js 15+)
    const { roomId } = use(params);

    // Generate or load user ID
    const userId = useMemo(
        () =>
            typeof window !== 'undefined'
                ? localStorage.getItem('uid') || crypto.randomUUID()
                : '',
        []
    );

    // Ensure Appwrite session + store user ID
    useEffect(() => {
        (async () => {
            await ensureAnonSession();
            localStorage.setItem('uid', userId);
        })();
    }, [userId]);

    const { messages, setMessages } = useRealtimeMessages(roomId);

    // ✅ Safe optimistic send (dedupes with realtime)
    const onSend = async (text: string) => {
        const tempId = `temp-${Date.now()}`;
        const optimistic = {
            $id: tempId,
            $createdAt: new Date().toISOString(),
            text,
            userId,
            roomId,
        } as any;

        // Add optimistic
        setMessages((prev) => dedupeMessages([...prev, optimistic]));

        try {
            const real = await sendMessage(roomId, userId, text);

            setMessages((prev) => {
                const withoutTemp = prev.filter((m) => m.$id !== tempId);
                return dedupeMessages([...withoutTemp, real as any]);
            });
        } catch (e) {
            // rollback if failed
            setMessages((prev) => prev.filter((m) => m.$id !== tempId));
            alert('Failed to send message');
        }
    };

    return (
        <div className="flex h-dvh flex-col">
            <header className="p-4 border-b flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-600 text-white grid place-items-center">💬</div>
                <h1 className="text-lg font-semibold">Room: {roomId}</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4 flex flex-col">
                {dedupeMessages(messages).map((m) => (
                    <MessageBubble key={m.$id} text={m.text} mine={m.userId === userId} />
                ))}
            </main>

            <MessageInput onSend={onSend} />
        </div>
    );
}
