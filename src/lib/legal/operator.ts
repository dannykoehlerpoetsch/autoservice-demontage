/**
 * Operator details – the single place where the personal data for the legal notice and the
 * privacy policy is entered.
 *
 * The owner of the website is the natural person publishing this repository – not the entirely
 * invented car workshop whose name appears on the site. A field only holds what is true for the
 * person concerned; whatever is missing shows up at that spot as a clear placeholder.
 *
 * `phone` and `vatId` are optional respectively only required with an actual precondition: they
 * are rendered only when a value is entered. Further details (commercial register,
 * representation authority, supervisory authority, § 18 para. 2 MStV) are not provided here – they
 * presuppose a real condition that does not apply to this project.
 */

export type OperatorField = 'name' | 'strasse' | 'ort' | 'email' | 'telefon' | 'ustIdNr';

export const OPERATOR_DETAILS: Record<OperatorField, string> = {
  /** First and last name. */
  name: 'Danny Köhler-Poetsch',
  /** Street and house number. */
  strasse: 'Erich-Zeigner-Allee 89',
  /** Postal code and city. */
  ort: '04229 Leipzig',
  /** Reachable email address. */
  email: 'dakopo-coding@gmx.net',
  /** Optional – appears on the page only with a value. */
  telefon: '',
  /** Optional – only with a value, when a VAT ID has been issued. */
  ustIdNr: '',
};

/** Value of a field, or `null` when the field stayed empty. */
export function operatorValue(field: OperatorField): string | null {
  const value = OPERATOR_DETAILS[field]?.trim();
  return value ? value : null;
}
