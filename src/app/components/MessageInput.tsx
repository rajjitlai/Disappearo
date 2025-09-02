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
        <form onSubmit={submit} className="flex gap-2 p-3 border-t border-[var(--border)] bg-[var(--card-background)]">
            <input
                className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--muted-foreground)] transition-colors"
                placeholder="Type a message"
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <button
                className="rounded-2xl px-5 py-3 bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
                disabled={sending}
                type="submit"
            >Send</button>
        </form>
    );
}