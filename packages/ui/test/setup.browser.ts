import '@testing-library/jest-dom/vitest';
// The real global stylesheet (cascade layers, Astryx, the built theme, Tailwind), as the apps load it.
import '../styles/globals.css';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
