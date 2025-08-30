'use client';
import React, { useState } from 'react';


export default function MessageInput({ onSend }: { onSend: (text: string) => Promise<void> }) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);


    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSending(true);
        try { await onSend(text.trim()); setText(''); } finally { setSending(false); }
    };


    return (
        <form onSubmit={submit} className="flex gap-2 p-3 border-t">
            <input
                className="flex-1 rounded-2xl border px-4 py-3 outline-none focus:ring"
                placeholder="Type a message"
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <button
                className="rounded-2xl px-5 py-3 bg-blue-600 text-white disabled:opacity-50"
                disabled={sending}
                type="submit"
            >Send</button>
        </form>
    );
}