'use client';

import React from 'react';
import { cn } from './utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
    return (
        <input
            className={cn('w-full rounded-lg border border-gray-200 bg-white/80 backdrop-blur px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500', className)}
            {...props}
        />
    );
}


