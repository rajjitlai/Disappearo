import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from './providers/ClientProviders';

import Footer from './components/Footer';
import { Toaster } from 'react-hot-toast';
import ResponsiveNav from './components/ResponsiveNav';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disappearo",
  description: " Ephemeral, privacy-first chat. Messages vanish, exports require consent, and AI keeps things clean.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme ASAP to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var m=localStorage.getItem('theme');if(!m){var c=document.cookie.match(/(?:^|; )theme=([^;]+)/);m=c?decodeURIComponent(c[1]):null;}var t=m||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(_){}})();` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh flex flex-col bg-[var(--background)] text-[var(--foreground)]`}
      >
        <ClientProviders>
          <ResponsiveNav />
          <main className="flex-1">
            {children}
          </main>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--card-background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)'
              },
              success: { iconTheme: { primary: '#16a34a', secondary: 'white' } },
              error: { iconTheme: { primary: '#dc2626', secondary: 'white' } }
            }}
          />
          <Footer />
        </ClientProviders>
      </body>
    </html>
  );
}
