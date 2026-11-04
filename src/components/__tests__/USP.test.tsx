import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import USP from '../USP';
import messages from '../../../messages/de.json';

describe('USP', () => {
  it('renders all USP items from the translations', () => {
    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <USP />
      </NextIntlClientProvider>
    );

    for (const item of messages.USP.items) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });
});
