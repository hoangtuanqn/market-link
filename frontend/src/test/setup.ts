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

/**
 * Jsdom does not implement `<dialog>.showModal()` / `.close()`, which the design system's Dialog calls — without this,
 * any test that renders a Dialog dies in a passive effect. The shim only keeps the `open` attribute in sync, which is
 * what the accessibility tree (and therefore getByRole) reads.
 */
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// Loads the real i18n so tests assert on the English text, not on key names
await import('@/i18n');
