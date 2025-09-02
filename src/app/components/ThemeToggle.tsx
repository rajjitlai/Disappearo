'use client';

import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof document !== 'undefined') {
            return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
        }
        return 'light';
    });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch { }
        try {
            const secure = location.protocol === 'https:' ? '; secure' : '';
            document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax${secure}`;
        } catch { }
    }, [theme]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
            if (saved) setTheme(saved);
        } catch { }
        setMounted(true);
    }, []);

    return (
        <button
            suppressHydrationWarning
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-200 shadow-sm"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            aria-label="Toggle theme"
        >
            {mounted ? (
                theme === 'light' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                )
            ) : (
                <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
            )}
            <span suppressHydrationWarning className="text-sm font-medium">
                {mounted ? (theme === 'light' ? 'Dark' : 'Light') : 'Theme'}
            </span>
        </button>
    );
}


