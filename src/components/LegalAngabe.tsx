import { operatorValue, type OperatorField } from '@/lib/legal/operator';

/**
 * Two building blocks for the legal notice and the privacy policy – both pages name the same person.
 *
 * `OperatorValue` shows the entered value or, where none stands yet, a clear placeholder. The
 * marking through `data-rechts-platzhalter` is the anchor for the tests.
 */

/** Entered value – or the placeholder text for the still blank spot. */
export function FieldValue({
  field,
  placeholder,
}: {
  field: OperatorField;
  placeholder: (field: OperatorField) => string;
}) {
  const value = operatorValue(field);

  if (value === null) {
    return (
      <span data-rechts-platzhalter="true" className="text-gray-600 italic dark:text-gray-300">
        {placeholder(field)}
      </span>
    );
  }

  return <span data-rechts-wert="true">{value}</span>;
}

/**
 * Name and address of the person operating the site. Stands in an `address` element, because that
 * is what it is for; `not-italic` takes the block out of the browser's italic default.
 */
export function OperatorAddress({
  placeholder,
}: {
  placeholder: (field: OperatorField) => string;
}) {
  return (
    <address className="flex flex-col gap-0.5 text-sm leading-relaxed not-italic">
      <span className="font-semibold">
        <FieldValue field="name" placeholder={placeholder} />
      </span>
      <span>
        <FieldValue field="strasse" placeholder={placeholder} />
      </span>
      <span>
        <FieldValue field="ort" placeholder={placeholder} />
      </span>
    </address>
  );
}
