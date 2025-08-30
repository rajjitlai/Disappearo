'use client';
import { useEffect, useState } from 'react';
import { client, ids, listMessages, ChatMessage } from '@/app/lib/appwrite';


export function useRealtimeMessages(roomId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;


        const run = async () => {
            const initial = await listMessages(roomId);
            setMessages(initial);


            const sub = client.subscribe(
                `databases.${ids.db}.collections.${ids.col}.documents`,
                (event) => {
                    const payload = event.payload as ChatMessage;
                    if (payload.roomId !== roomId) return;


                    if (event.events.some(e => e.endsWith('.create'))) {
                        setMessages((prev) => [...prev, payload]);
                    } else if (event.events.some(e => e.endsWith('.delete'))) {
                        setMessages((prev) => prev.filter(m => m.$id !== payload.$id));
                    } else if (event.events.some(e => e.endsWith('.update'))) {
                        setMessages((prev) => prev.map(m => m.$id === payload.$id ? payload : m));
                    }
                }
            );


            unsubscribe = () => sub();
        };


        run();


        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [roomId]);


    return { messages, setMessages };
}