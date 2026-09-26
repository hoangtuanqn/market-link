/**
 * Display preferences (the Settings page of all three roles). A copy lives in localStorage so a guest who has not
 * signed in keeps them too and the theme is set before the page paints (the script in index.html reads the same key).
 * Once signed in the server copy (GET/PUT /auth/me/settings) wins. The list of values matches the backend's
 * UpdateSettingsRequest.
 */

export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English' },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'zh', name: '中文（简体）', english: 'Chinese (Simplified)' },
  { code: 'ja', name: '日本語', english: 'Japanese' },
  { code: 'ko', name: '한국어', english: 'Korean' },
  { code: 'fr', name: 'Français', english: 'French' },
  { code: 'es', name: 'Español', english: 'Spanish' },
  { code: 'de', name: 'Deutsch', english: 'German' },
  { code: 'th', name: 'ไทย', english: 'Thai' },
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];
export type Theme = 'light' | 'dark' | 'system';
export type Currency = 'VND' | 'USD' | 'EUR' | 'JPY';
export type Units = 'metric' | 'imperial';
export type DateFormat = 'dmy' | 'mdy' | 'iso';
export type Clock = 'h24' | 'h12';

export type Settings = {
  theme: Theme;
  language: Language;
  currency: Currency;
  units: Units;
  dateFormat: DateFormat;
  clock: Clock;
  /** Market id in the markets list, '' = not chosen */
  preferredMarket: string;
  /** Notifications and each role's own block: saved, no feature uses them yet. */
  extras: Record<string, string>;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  language: 'en',
  currency: 'VND',
  units: 'metric',
  dateFormat: 'dmy',
  clock: 'h24',
  preferredMarket: '',
  extras: {},
};

/** Same key as the anti-flash script in index.html. */
export const STORAGE_KEY = 'ml-settings';

const THEMES: readonly Theme[] = ['light', 'dark', 'system'];
const CURRENCIES: readonly Currency[] = ['VND', 'USD', 'EUR', 'JPY'];
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/**
 * An unknown value (an old copy, hand-edited localStorage, the server returned it incomplete) falls back to the default
 * per field.
 */
export const normalize = (raw: Partial<Settings> | null | undefined): Settings => ({
  theme: pick(raw?.theme, THEMES, DEFAULT_SETTINGS.theme),
  language: pick(
    raw?.language,
    LANGUAGES.map((l) => l.code),
    DEFAULT_SETTINGS.language,
  ),
  currency: pick(raw?.currency, CURRENCIES, DEFAULT_SETTINGS.currency),
  units: pick(raw?.units, ['metric', 'imperial'] as const, DEFAULT_SETTINGS.units),
  dateFormat: pick(raw?.dateFormat, ['dmy', 'mdy', 'iso'] as const, DEFAULT_SETTINGS.dateFormat),
  clock: pick(raw?.clock, ['h24', 'h12'] as const, DEFAULT_SETTINGS.clock),
  preferredMarket: typeof raw?.preferredMarket === 'string' ? raw.preferredMarket : '',
  extras: raw?.extras && typeof raw.extras === 'object' ? { ...raw.extras } : {},
});

/** First visit (nothing saved): take the browser language if it is in the list, otherwise English. */
const browserLanguage = (): Language => {
  const codes = LANGUAGES.map((l) => l.code) as string[];
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.toLowerCase().split('-')[0];
    if (base && codes.includes(base)) return base as Language;
  }
  return 'en';
};

const read = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // private window / corrupt JSON → default
  }
  return { ...DEFAULT_SETTINGS, language: browserLanguage() };
};

let current: Settings = read();
const listeners = new Set<() => void>();

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // if it cannot be saved it is still used for this session
  }
};

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Set data-theme on <html>; "system" follows the operating system. */
export const applyTheme = (theme: Theme = current.theme) => {
  const dark = theme === 'dark' || (theme === 'system' && darkQuery().matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
};

// The machine switches light/dark while the page is open: only affects those who chose "Match device"
darkQuery().addEventListener('change', () => {
  if (current.theme === 'system') applyTheme();
});

// Another tab changes settings → sync this tab
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  current = read();
  applyTheme();
  listeners.forEach((l) => l());
});

const SettingsStore = {
  get: (): Settings => current,

  set(next: Partial<Settings>) {
    current = normalize({ ...current, ...next });
    persist();
    applyTheme();
    listeners.forEach((l) => l());
  },

  /**
   * Temporarily set settings without saving, without telling anyone: only to preview the draft's formats
   * (SettingsPanel).
   */
  peek(next: Settings) {
    current = next;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

applyTheme();

export default SettingsStore;
