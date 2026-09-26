import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsApi from '@/api-requests/settings.requests';
import SettingsRow from '@/components/SettingsRow';
import ThemePicker from '@/components/ThemePicker';
import { Button } from '@/components/ui/button';
import NotificationSettingsCard from '@/components/notifications/NotificationSettingsCard';
import { Card } from '@/components/ui/card';
import { SelectField } from '@/components/ui/input';
import useSettings from '@/hooks/useSettings';
import { formatDate, formatTime, RATES_DATE, vnd } from '@/lib/format';
import SettingsStore, { LANGUAGES, type Settings, type Theme } from '@/lib/settings';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

export type SettingsRole = 'customer' | 'farmer' | 'admin';

const SAMPLE_DATE = new Date(2026, 11, 31, 19, 0);
const SAMPLE_PRICE = 45000;

type SettingsPanelProps = {
  /** Vai của trang (các trang vẫn truyền; nhóm thông báo giờ lấy từ API theo vai trên server). */
  role: SettingsRole;
  /** Khối riêng của vai (Shopping / Selling defaults / Platform defaults), đọc và sửa extras của bản nháp. */
  children?: (draft: Settings, set: (patch: Partial<Settings>) => void) => ReactNode;
};

/**
 * Trang Settings của cả ba vai (prototype `settings.html`). Theme đổi và lưu ngay khi bấm; các mục khác nằm trong bản
 * nháp tới khi bấm Save, rồi áp dụng cho toàn app (format.ts, bản dịch). Đăng nhập rồi nên lưu cả lên server.
 */
const SettingsPanel = ({ children }: SettingsPanelProps) => {
  const { t } = useTranslation();
  const saved = useSettings();
  const [draft, setDraft] = useState<Settings>(saved);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<Settings>) => setDraft((d) => ({ ...d, ...patch }));
  const pickTheme = (theme: Theme) => {
    set({ theme });
    SettingsStore.set({ theme });
    // Lưu luôn phần đã lưu + theme mới; bản nháp các mục khác vẫn chờ nút Save
    SettingsApi.save({ ...SettingsStore.get(), theme }).catch(() => undefined);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await SettingsApi.save(draft);
      Notification.success({ title: t('settings.savedTitle'), text: t('settings.savedText') });
      // Áp dụng sau cùng: trang được dựng lại theo ngôn ngữ / định dạng mới
      SettingsStore.set(response.data ?? draft);
    } catch (error) {
      Notification.error({ text: Helper.getErrorMessage(error, t('settings.saveError')) });
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card as="section" aria-labelledby="set-appearance" className="flex flex-col gap-4 p-6">
        <h2 id="set-appearance" className="text-h3">
          {t('settings.appearance')}
        </h2>
        <ul className="m-0 flex flex-col p-0">
          <SettingsRow title={t('settings.theme')} note={t('settings.themeNote')}>
            <ThemePicker value={draft.theme} onChange={pickTheme} />
          </SettingsRow>
          <SettingsRow title={t('settings.language')} note={t('settings.languageNote')}>
            <SelectField
              id="set-language"
              label={t('settings.language')}
              hideLabel
              lang={draft.language}
              value={draft.language}
              onChange={(e) => set({ language: e.target.value as Settings['language'] })}
              options={LANGUAGES.map((l) => ({
                value: l.code,
                label: l.code === 'en' ? l.name : `${l.name} · ${l.english}`,
              }))}
            />
          </SettingsRow>
        </ul>
      </Card>

      <Card as="section" aria-labelledby="set-format" className="flex flex-col gap-4 p-6">
        <h2 id="set-format" className="text-h3">
          {t('settings.format')}
        </h2>
        <ul className="m-0 flex flex-col p-0">
          <SettingsRow title={t('settings.currency')} note={t('settings.currencyNote', { date: RATES_DATE })}>
            <SelectField
              id="set-currency"
              label={t('settings.currency')}
              hideLabel
              value={draft.currency}
              onChange={(e) => set({ currency: e.target.value as Settings['currency'] })}
              options={(['VND', 'USD', 'EUR', 'JPY'] as const).map((c) => ({
                value: c,
                label: t(`settings.currencies.${c}`),
              }))}
            />
          </SettingsRow>
          <SettingsRow title={t('settings.units')} note={t('settings.unitsNote')}>
            <SelectField
              id="set-units"
              label={t('settings.units')}
              hideLabel
              value={draft.units}
              onChange={(e) => set({ units: e.target.value as Settings['units'] })}
              options={[
                { value: 'metric', label: t('settings.metric') },
                { value: 'imperial', label: t('settings.imperial') },
              ]}
            />
          </SettingsRow>
          <SettingsRow title={t('settings.date')}>
            <SelectField
              id="set-date"
              label={t('settings.date')}
              hideLabel
              value={draft.dateFormat}
              onChange={(e) => set({ dateFormat: e.target.value as Settings['dateFormat'] })}
              options={[
                { value: 'dmy', label: '31/12/2026' },
                { value: 'mdy', label: '12/31/2026' },
                { value: 'iso', label: '2026-12-31' },
              ]}
            />
          </SettingsRow>
          <SettingsRow title={t('settings.clock')}>
            <SelectField
              id="set-clock"
              label={t('settings.clock')}
              hideLabel
              value={draft.clock}
              onChange={(e) => set({ clock: e.target.value as Settings['clock'] })}
              options={[
                { value: 'h24', label: t('settings.clock24') },
                { value: 'h12', label: t('settings.clock12') },
              ]}
            />
          </SettingsRow>
        </ul>
        {/* Xem trước theo bản nháp, dùng định dạng đang áp dụng cho phần còn lại của app */}
        <p className="text-small text-ink-muted" aria-live="polite">
          {t('settings.preview', {
            date: withDraft(draft, () => formatDate(SAMPLE_DATE)),
            time: withDraft(draft, () => formatTime(SAMPLE_DATE)),
            price: withDraft(draft, () => vnd(SAMPLE_PRICE)),
          })}
        </p>
      </Card>

      <NotificationSettingsCard />

      {children?.(draft, set)}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? t('settings.saving') : t('settings.save')}
        </Button>
        <span className="text-small text-ink-muted">{t('settings.saveHint')}</span>
      </div>
    </div>
  );
};

/** Chạy một hàm format với bản nháp thay cho settings đang áp dụng (chỉ để xem trước, không đổi gì). */
const withDraft = (draft: Settings, fn: () => string) => {
  const live = SettingsStore.get();
  SettingsStore.peek(draft);
  try {
    return fn();
  } finally {
    SettingsStore.peek(live);
  }
};

export default SettingsPanel;
