'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function ResponsiveNav() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <header className="border-b border-[var(--border)] bg-[var(--card-background)] shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="text-xl font-bold text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        Disappearo
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="/" className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Home</Link>
                        <Link href="/about" className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">About</Link>
                        <Link href="/contact" className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Contact</Link>
                        <Link href="/faq" className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">FAQ</Link>
                        <Link href="/privacy" className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Terms</Link>
                    </nav>

                    {/* Right side - Theme toggle and mobile menu button */}
                    <div className="flex items-center gap-4">
                        <ThemeToggle />

                        {/* Mobile menu button */}
                        <button
                            onClick={toggleMenu}
                            className="md:hidden p-2 rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <nav className="md:hidden mt-4 pb-4 border-t border-[var(--border)]">
                        <div className="flex flex-col gap-3 pt-4">
                            <Link
                                href="/"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                href="/about"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            >
                                About
                            </Link>
                            <Link
                                href="/contact"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            >
                                Contact
                            </Link>
                            <Link
                                href="/faq"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            >
                                FAQ
                            </Link>
                            <Link
                                href="/privacy"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            >
                                Privacy
                            </Link>
                            <Link
                                href="/terms"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[var(--foreground)] hover:text-blue-600 dark:hover:text-blue-400 font-medium py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                            >
                                Terms
                            </Link>
                        </div>
                    </nav>
                )}
            </div>
        </header>
    );
}
