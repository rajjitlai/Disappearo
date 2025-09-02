'use client';

import React from 'react';
import { cn } from './utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
    return (
        <input
            className={cn('w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--muted-foreground)] transition-colors', className)}
            {...props}
        />
    );
}


