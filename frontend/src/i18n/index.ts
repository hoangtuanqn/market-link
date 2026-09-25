import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import SettingsStore, { type Language } from '@/lib/settings';
import { en, NAMESPACES } from './resources';

/** Ngôn ngữ khác English tải khi cần (mỗi ngôn ngữ một chunk), key thiếu thì hiện English. */
const bundles = import.meta.glob<Record<string, unknown>>(['../locales/*/*.json', '!../locales/en/*.json'], {
  import: 'default',
});

const loaded = new Set<string>(['en']);

const load = async (lng: Language) => {
  if (loaded.has(lng)) return;
  await Promise.all(
    NAMESPACES.map(async (ns) => {
      const file = bundles[`../locales/${lng}/${ns}.json`];
      if (!file) return;
      i18n.addResourceBundle(lng, ns, await file(), true, true);
    }),
  );
  loaded.add(lng);
};

i18n.use(initReactI18next).init({
  resources: { en },
  lng: 'en',
  fallbackLng: 'en',
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React tự escape
  returnNull: false,
});

/** Đổi ngôn ngữ giao diện: tải bản dịch rồi mới đổi, để không nháy chữ nửa nọ nửa kia. */
export const setLanguage = async (lng: Language) => {
  try {
    await load(lng);
  } catch {
    // mất mạng lúc tải chunk → vẫn đổi, key thiếu hiện English
  }
  await i18n.changeLanguage(lng);
  document.documentElement.lang = lng;
};

// Settings đổi ngôn ngữ (trang Settings, tab khác, bản từ server) → giao diện đổi theo
SettingsStore.subscribe(() => {
  const lng = SettingsStore.get().language;
  if (lng !== i18n.language) void setLanguage(lng);
});

/** Chạy trước khi render: người đã chọn tiếng khác không thấy English trước. */
export const i18nReady = setLanguage(SettingsStore.get().language);

export default i18n;
