import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { stubSystemTheme } from './src/test-utils';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Helles System als Ausgangslage; Tests, die Dunkelmodus wollen, rufen später im Testkörper
// `stubSystemTheme(true)` auf und überschreiben damit diesen Stub.
beforeEach(() => {
  stubSystemTheme(false);
});
