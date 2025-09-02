'use client';

import React from 'react';
import { cn } from './utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('rounded-xl border border-[var(--border)] shadow-sm bg-[var(--card-background)]', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('px-4 py-3 border-b border-[var(--border)]', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('px-4 py-4', className)} {...props} />;
}


