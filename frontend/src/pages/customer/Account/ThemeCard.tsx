import { useTranslation } from 'react-i18next';
import SettingsApi from '@/api-requests/settings.requests';
import ThemePicker from '@/components/ThemePicker';
import { Card } from '@/components/ui/card';
import useSettings from '@/hooks/useSettings';
import SettingsStore, { type Theme } from '@/lib/settings';

/**
 * Khung cài đặt Giao diện (Theme) trực tiếp trên trang Account của Customer, tương tự như trải nghiệm chọn theme ở các
 * phần cài đặt khác.
 */
const ThemeCard = () => {
  const { t } = useTranslation();
  const settings = useSettings();

  const handleThemeChange = (theme: Theme) => {
    SettingsStore.set({ theme });
    // Đồng bộ theme lên server
    SettingsApi.save({ ...SettingsStore.get(), theme }).catch(() => undefined);
  };

  return (
    <Card as="section" aria-labelledby="theme-settings-title" className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 id="theme-settings-title" className="text-h3">
          {t('settings.appearance')}
        </h2>
        <p className="text-small text-ink-muted">{t('settings.themeNote')}</p>
      </div>

      <div className="pt-1">
        <ThemePicker value={settings.theme} onChange={handleThemeChange} />
      </div>
    </Card>
  );
};

export default ThemeCard;
