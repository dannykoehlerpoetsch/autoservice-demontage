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

// Light system as the starting point; tests that want dark mode call `stubSystemTheme(true)`
// later inside the test body and thereby override this stub.
beforeEach(() => {
  stubSystemTheme(false);
});
