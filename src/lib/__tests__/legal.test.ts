import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { OPERATOR_DETAILS, operatorValue, type OperatorField } from '../legal/operator';

/**
 * The operator details are the details of the person who operates this website. The checks therefore
 * do not rely on their content but only on the behaviour: an empty field and a field of nothing but
 * whitespace count as "missing" – the placeholder on both legal pages depends on that.
 */

const FIELD_LABELS = Object.keys(OPERATOR_DETAILS) as OperatorField[];

const ORIGINAL_OPERATOR: Record<OperatorField, string> = { ...OPERATOR_DETAILS };

beforeEach(() => {
  for (const field of FIELD_LABELS) {
    OPERATOR_DETAILS[field] = '';
  }
});

afterAll(() => {
  Object.assign(OPERATOR_DETAILS, ORIGINAL_OPERATOR);
});

describe('Operator details', () => {
  it('knows exactly six fields', () => {
    expect(FIELD_LABELS).toEqual(['name', 'strasse', 'ort', 'email', 'telefon', 'ustIdNr']);
  });

  it('treats an empty field as not entered', () => {
    expect(operatorValue('name')).toBeNull();
  });

  it('treats whitespace as not entered', () => {
    OPERATOR_DETAILS.email = '   \n ';

    expect(operatorValue('email')).toBeNull();
  });

  it('returns an entered value without surrounding whitespace', () => {
    OPERATOR_DETAILS.name = '  Erika Beispiel  ';

    expect(operatorValue('name')).toBe('Erika Beispiel');
  });

  it('checks every field individually', () => {
    OPERATOR_DETAILS.telefon = '+49 30 1234567';

    expect(operatorValue('telefon')).toBe('+49 30 1234567');
    expect(operatorValue('name')).toBeNull();
  });
});
