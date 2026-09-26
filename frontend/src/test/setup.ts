import '@testing-library/jest-dom/vitest';

/**
 * Jsdom không có matchMedia, mà SettingsStore dùng nó để đọc prefers-color-scheme. Stub trước khi nạp i18n, vì i18n kéo
 * theo SettingsStore lúc import.
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

// Nạp i18n thật để test khẳng định trên câu chữ tiếng Anh, không phải tên key
await import('@/i18n');
