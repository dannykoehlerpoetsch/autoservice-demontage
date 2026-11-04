export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export function applyStoredOrSystemTheme() {
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle(
      'dark',
      stored === 'dark' || (!stored && prefersDark)
    );
  } catch {
    // localStorage may be unavailable (e.g. privacy mode) - fall back to light mode
  }
}
