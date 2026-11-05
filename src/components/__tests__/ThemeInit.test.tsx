import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import ThemeInit from '../ThemeInit';
import { THEME_INIT_SCRIPT } from '@/lib/theme-script';

describe('ThemeInit', () => {
  it('renders an inline script with the theme init code on the server', () => {
    const html = renderToStaticMarkup(<ThemeInit />);

    expect(html).toContain('id="theme-init"');
    expect(html).toContain(THEME_INIT_SCRIPT);
  });

  it('drops the script node after mounting so later re-renders never create a new one', async () => {
    const { container } = render(<ThemeInit />);

    await waitFor(() => {
      expect(container.querySelector('script#theme-init')).toBeNull();
    });
  });
});
