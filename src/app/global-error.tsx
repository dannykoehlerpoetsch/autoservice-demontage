'use client';

import { useEffect } from 'react';
import { sans } from '@/lib/fonts';
import './globals.css';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
      }
    } catch {
      // localStorage may be unavailable (e.g. privacy mode) - fall back to light mode
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.className} flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4`}
        suppressHydrationWarning
      >
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p>An unexpected error occurred. Please try again.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="text-sm px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 transition-colors cursor-pointer"
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error renders outside the router, next/link is unavailable here */}
          <a href="/" className="text-sm underline hover:text-brand">
            Back to homepage
          </a>
        </div>
      </body>
    </html>
  );
}
