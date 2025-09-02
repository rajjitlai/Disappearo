'use client';
import React from 'react';
import clsx from 'clsx';

export default function MessageBubble({ text, mine }: { text: string; mine: boolean }) {
    return (
        <div className={clsx('max-w-[80%] rounded-2xl px-4 py-2 mb-2 shadow-sm',
            mine
                ? 'bg-blue-600 dark:bg-blue-700 text-white self-end'
                : 'bg-[var(--card-background)] text-[var(--foreground)] self-start border border-[var(--border)]'
        )}>
            <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
    );
}