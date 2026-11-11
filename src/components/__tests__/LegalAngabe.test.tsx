import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldValue, OperatorAddress } from '../LegalAngabe';
import { OPERATOR_DETAILS, type OperatorField } from '@/lib/legal/operator';

/**
 * The two building blocks of the legal pages. Their only task: show an entered value, otherwise a
 * clear placeholder – and make the address look the same in both places.
 */

const placeholder = (field: OperatorField) => `[noch eintragen: ${field}]`;

const FIELD_LABELS: OperatorField[] = ['name', 'strasse', 'ort', 'email', 'telefon', 'ustIdNr'];

// Every check starts from empty fields; afterwards the file's state stands there again.
const ORIGINAL_OPERATOR: Record<OperatorField, string> = { ...OPERATOR_DETAILS };

beforeEach(() => {
  for (const field of FIELD_LABELS) {
    OPERATOR_DETAILS[field] = '';
  }
});

afterAll(() => {
  Object.assign(OPERATOR_DETAILS, ORIGINAL_OPERATOR);
});

describe('OperatorValue', () => {
  it('shows the placeholder while the field is empty', () => {
    render(<FieldValue field="name" placeholder={placeholder} />);

    const element = screen.getByText('[noch eintragen: name]');

    expect(element).toBeInTheDocument();
    expect(element.getAttribute('data-rechts-platzhalter')).toBe('true');
    expect(element.getAttribute('data-rechts-wert')).toBeNull();
  });

  it('shows the entered value without any addition', () => {
    OPERATOR_DETAILS.name = 'Erika Beispiel';

    render(<FieldValue field="name" placeholder={placeholder} />);

    expect(screen.getByText('Erika Beispiel')).toBeInTheDocument();
    expect(screen.getByText('Erika Beispiel').getAttribute('data-rechts-wert')).toBe('true');
    expect(screen.queryByText('[noch eintragen: name]')).toBeNull();
  });
});

describe('Address block', () => {
  it('sits in an address element and names three lines', () => {
    const { container } = render(<OperatorAddress placeholder={placeholder} />);

    const addressBlock = container.querySelector('address');

    expect(addressBlock).not.toBeNull();
    expect(addressBlock?.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(3);
  });

  it('mixes filled and empty fields without changing the structure', () => {
    OPERATOR_DETAILS.name = 'Erika Beispiel';
    OPERATOR_DETAILS.ort = '12345 Beispielstadt';

    const { container } = render(<OperatorAddress placeholder={placeholder} />);

    const addressBlock = container.querySelector('address');

    expect(addressBlock?.querySelectorAll('[data-rechts-wert="true"]')).toHaveLength(2);
    expect(addressBlock?.querySelectorAll('[data-rechts-platzhalter="true"]')).toHaveLength(1);
    expect(addressBlock?.textContent).toContain('Erika Beispiel');
    expect(addressBlock?.textContent).toContain('[noch eintragen: strasse]');
  });

  it('overrides the italic default of address', () => {
    const { container } = render(<OperatorAddress placeholder={placeholder} />);

    expect(container.querySelector('address')?.getAttribute('class')).toContain('not-italic');
  });
});
