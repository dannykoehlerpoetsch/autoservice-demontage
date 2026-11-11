import type { Metadata } from 'next';
import { sans } from '@/lib/fonts';
import ThemeInit from '@/components/ThemeInit';
import './globals.css';

export const metadata: Metadata = {
  title: 'Page not found',
  description: "The page you requested doesn't exist or has been moved.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline theme init in <head>, see src/app/[locale]/layout.tsx for the reason */}
        <ThemeInit />
      </head>
      <body
        className={`${sans.className} flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4`}
        suppressHydrationWarning
      >
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p>The page you requested doesn&apos;t exist or has been moved.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-not-found renders outside the router, next/link is unavailable here */}
        <a
          href="/"
          className="text-sm px-4 py-2 rounded-md bg-brand-strong text-white hover:bg-brand-strong/90 transition-colors"
        >
          Back to homepage
        </a>
      </body>
    </html>
  );
}
