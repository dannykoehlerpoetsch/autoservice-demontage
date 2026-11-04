import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Section from '../Section';

describe('Section', () => {
  it('renders children', () => {
    render(
      <Section>
        <p>Content</p>
      </Section>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies the given id to the section element', () => {
    render(
      <Section id="anfahrt">
        <p>Content</p>
      </Section>
    );
    expect(screen.getByText('Content').closest('section')).toHaveAttribute('id', 'anfahrt');
  });

  it('does not set an id when none is given', () => {
    render(
      <Section>
        <p>Content</p>
      </Section>
    );
    expect(screen.getByText('Content').closest('section')).not.toHaveAttribute('id');
  });
});
