'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { THEME_INIT_SCRIPT } from '@/lib/theme-script';

// Client-bundle module state: survives remounts of the root layout for the lifetime of
// the document. Mutated only from an effect, so every read is a pure function of this
// store (StrictMode double render stays consistent).
let scriptConsumed = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// After the first mount: the script has run while the browser parsed the document, so
// React no longer needs an element for it. During server render and hydration the
// element must be rendered, otherwise the markup would not match the streamed HTML.
function shouldRenderScript() {
  return !scriptConsumed;
}

function serverShouldRenderScript() {
  return true;
}

function consumeScript() {
  if (scriptConsumed) {
    return;
  }
  scriptConsumed = true;
  listeners.forEach((listener) => listener());
}

/**
 * Renders the theme init script that toggles the `dark` class before the first paint.
 *
 * Rendered into <head> by the root layouts (not via next/script, so that no React-owned
 * <script> sits in <body>, where a script injected by a browser extension could be
 * hydrated against it), and it never stays in the tree longer than necessary:
 *
 * - The root layout is remounted whenever the [locale] segment changes, and every
 *   client-side render of a <script> element makes ReactDOM log "Encountered a script
 *   tag while rendering React component".
 * - The script only ever has to run once per document; applyStoredOrSystemTheme()
 *   re-applies the class after locale changes (see ThemeToggle).
 *
 * Dropping the already executed <script> node from the DOM is harmless.
 */
export default function ThemeInit() {
  const pending = useSyncExternalStore(subscribe, shouldRenderScript, serverShouldRenderScript);

  useEffect(() => {
    consumeScript();
  }, []);

  if (!pending) {
    return null;
  }

  return (
    <script
      id="theme-init"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
