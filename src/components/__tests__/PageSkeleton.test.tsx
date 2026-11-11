import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageSkeleton from '../PageSkeleton';
import Loading from '../../app/[locale]/loading';

/**
 * The loading state of a locale page. It shows the same anchors as the finished homepage so that jump
 * targets do not run into the void while loading – and it must not be mistaken for content that was
 * already operable.
 */

describe('PageSkeleton', () => {
  it('tells the browser that content is still coming', () => {
    const { container } = render(<PageSkeleton />);

    const root = container.firstElementChild;

    expect(root?.getAttribute('aria-busy')).toBe('true');
    expect(root?.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('matches the anchors of the homepage', () => {
    const { container } = render(<PageSkeleton />);

    for (const anchor of ['home', 'services', 'demo']) {
      expect(container.querySelector(`#${anchor}`), `#${anchor}`).not.toBeNull();
    }
  });

  it('is pure decoration without any operation', () => {
    const { container } = render(<PageSkeleton />);

    expect(container.querySelectorAll('button, a, input, select')).toHaveLength(0);

    const bars = Array.from(container.querySelectorAll('[aria-hidden="true"]'));
    expect(bars.length).toBeGreaterThan(10);
  });
});

describe('loading.tsx', () => {
  it('passes the skeleton through with its reveal class', () => {
    const { container } = render(<Loading />);

    expect(container.querySelector('.fallback-reveal')).not.toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
