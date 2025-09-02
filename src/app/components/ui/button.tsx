'use client';

import React from 'react';
import { cn } from './utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'link';
    size?: 'sm' | 'md' | 'lg' | 'icon';
};

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
    const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    const variants: Record<string, string> = {
        default: 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500',
        secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)] focus-visible:ring-[var(--muted-foreground)]',
        destructive: 'bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-800 focus-visible:ring-red-600 dark:focus-visible:ring-red-500',
        ghost: 'bg-transparent hover:bg-[var(--muted)] text-[var(--foreground)]',
        link: 'bg-transparent underline-offset-4 hover:underline text-blue-600 dark:text-blue-400'
    };
    const sizes: Record<string, string> = {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10'
    };
    return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}


