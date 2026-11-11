import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import messages from '../../../messages/de.json';
import DemoFlow from '../DemoFlow';

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

function renderDemoFlow() {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <DemoFlow />
    </NextIntlClientProvider>
  );
}

const steps = messages.DemoFlow.steps as { title: string; text: string }[];

describe('DemoFlow', () => {
  it('counts the steps in an ordered list', () => {
    renderDemoFlow();

    const list = screen.getByRole('list');

    expect(list.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(steps.length);
  });

  it('shows every step with title and text from the translations', () => {
    renderDemoFlow();

    for (const step of steps) {
      expect(screen.getByRole('heading', { name: step.title })).toBeInTheDocument();
      expect(screen.getByText(step.text)).toBeInTheDocument();
    }
  });

  it('passes the order on to the list and hides the number from screen readers', () => {
    renderDemoFlow();

    const numbers = screen.getAllByText(/^[\d]$/u);

    expect(numbers.length).toBeGreaterThan(0);
    for (const number of numbers) {
      expect(number).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('states that nothing is booked and nothing is sent', () => {
    renderDemoFlow();

    expect(screen.getByText(messages.DemoFlow.note)).toBeInTheDocument();
  });

  it('leads to the demo request without detours', () => {
    renderDemoFlow();

    const link = screen.getByRole('link', { name: messages.DemoFlow.cta });

    expect(link).toHaveAttribute('href', '/termin-anfrage');
  });
});
