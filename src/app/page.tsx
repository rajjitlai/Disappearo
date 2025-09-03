"use client";
import Link from 'next/link';
import { useAuth } from '@/app/state/AuthContext';
import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import logo from '../../public/disappearo.png';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  return (
    <main className="min-h-dvh grid place-items-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 sm:p-8 text-center max-w-3xl mx-auto">
        {/* Hero Section */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="mx-auto">
              <Image
                src={logo}
                alt="Disappearo"
                width={200}
                height={200}
                className="mx-auto rounded-full"
                priority
              />
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-[var(--foreground)] leading-tight">
              Disappearo
            </h1>
            <p className="text-lg sm:text-xl text-[var(--foreground)] max-w-2xl mx-auto leading-relaxed">
              Ephemeral, privacy-first chat. Messages vanish, exports require consent, and AI keeps things clean.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
            <div className="p-4 rounded-xl bg-[var(--card-background)]/80 backdrop-blur-sm border border-[var(--border)]">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[var(--foreground)] text-sm">Privacy First</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Messages vanish automatically</p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--card-background)]/80 backdrop-blur-sm border border-[var(--border)]">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[var(--foreground)] text-sm">AI Moderation</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Keeps conversations safe</p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--card-background)]/80 backdrop-blur-sm border border-[var(--border)]">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[var(--foreground)] text-sm">Real-time</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Instant messaging experience</p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto bg-blue-600 dark:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <Link
                href="/about"
                className="w-full sm:w-auto border-2 border-[var(--border)] px-8 py-4 rounded-xl text-lg font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] hover:border-[var(--muted-foreground)] transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Join thousands of users who trust Disappearo for secure communication
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
