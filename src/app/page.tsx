"use client";
import Link from 'next/link';
import { useAuth } from '@/app/state/AuthContext';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && user) {
      window.location.replace('/dashboard');
    }
  }, [loading, user]);
  return (
    <main className="min-h-dvh grid place-items-center">
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold">Disappearo</h1>
        <p className="text-gray-600 mt-2">Ephemeral chat, safely.</p>
        <div className="mt-4 space-x-3">
          <Link href="/login" className="underline">Login</Link>
          <Link href="/dashboard" className="underline">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
