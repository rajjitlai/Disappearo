'use client';
import React from 'react';
import clsx from 'clsx';


export default function MessageBubble({ text, mine }: { text: string; mine: boolean }) {
    return (
        <div className={clsx('max-w-[80%] rounded-2xl px-4 py-2 mb-2 shadow',
            mine ? 'bg-blue-600 text-white self-end' : 'bg-gray-100 text-gray-900 self-start')}
        >
            <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
    );
}