import './globals.css';

export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white dark:bg-[#0f1511] text-gray-900 dark:text-gray-100 text-center px-4"
        suppressHydrationWarning
      >
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p>The page you requested doesn&apos;t exist or has been moved.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-not-found renders outside the router, next/link is unavailable here */}
        <a
          href="/"
          className="text-sm px-4 py-2 rounded-md bg-[#59a305] text-white hover:opacity-90 transition-opacity"
        >
          Back to homepage
        </a>
      </body>
    </html>
  );
}
