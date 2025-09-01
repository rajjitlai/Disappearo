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
        default: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-600',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
        destructive: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-600',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-900',
        link: 'bg-transparent underline-offset-4 hover:underline text-indigo-600'
    };
    const sizes: Record<string, string> = {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10'
    };
    return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}


