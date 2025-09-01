'use client';
import { useEffect, useState } from 'react';
import { client, ids, listMessages } from '@/app/lib/appwrite';


type MessageDoc = {
    $id: string;
    sessionId: string;
    sender: string;
    text: string;
};

export function useRealtimeMessages(sessionId: string) {
    const [messages, setMessages] = useState<MessageDoc[]>([]);

    useEffect(() => {
        let unsubscribe: (() => void) | null = null;


        const run = async () => {
            const initial = await listMessages(sessionId);
            // listMessages returns a document list; normalize to array of docs
            // @ts-expect-error runtime shape from Appwrite SDK
            setMessages(initial.documents ?? initial);


            const sub = client.subscribe(
                `databases.${ids.db}.collections.${ids.messages}.documents`,
                (event) => {
                    const payload = event.payload as MessageDoc;
                    if (payload.sessionId !== sessionId) return;


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
    }, [sessionId]);


    return { messages, setMessages };
}