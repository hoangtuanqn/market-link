import '@testing-library/jest-dom/vitest';

/**
 * Jsdom has no matchMedia, and SettingsStore uses it to read prefers-color-scheme. Stub it before loading i18n, because
 * i18n pulls in SettingsStore at import time.
 */
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Loads the real i18n so tests assert on the English text, not on key names
await import('@/i18n');
