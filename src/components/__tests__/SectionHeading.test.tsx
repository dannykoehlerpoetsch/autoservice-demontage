import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionHeading from '../SectionHeading';

describe('SectionHeading', () => {
  it('renders the children as an h2', () => {
    render(<SectionHeading>Warum Autoservice Demontage?</SectionHeading>);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Warum Autoservice Demontage?');
  });
});
