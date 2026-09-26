import { useTranslation } from 'react-i18next';
import SettingsApi from '@/api-requests/settings.requests';
import SettingsRow from '@/components/SettingsRow';
import ThemePicker from '@/components/ThemePicker';
import { Card } from '@/components/ui/card';
import { SelectField } from '@/components/ui/input';
import useSettings from '@/hooks/useSettings';
import SettingsStore, { LANGUAGES, type Settings, type Theme } from '@/lib/settings';

/**
 * The Appearance & Language settings frame right on the Account page, matching the experience in Farmer and Admin
 * settings.
 */
const AppearanceCard = () => {
  const { t } = useTranslation();
  const settings = useSettings();

  const handleThemeChange = (theme: Theme) => {
    SettingsStore.set({ theme });
    SettingsApi.save({ ...SettingsStore.get(), theme }).catch(() => undefined);
  };

  const handleLanguageChange = (language: Settings['language']) => {
    SettingsStore.set({ language });
    SettingsApi.save({ ...SettingsStore.get(), language }).catch(() => undefined);
  };

  return (
    <Card as="section" aria-labelledby="set-appearance" className="flex flex-col gap-4 p-6">
      <h2 id="set-appearance" className="text-h3">
        {t('settings.appearance')}
      </h2>
      <ul className="m-0 flex flex-col p-0">
        <SettingsRow title={t('settings.theme')} note={t('settings.themeNote')}>
          <ThemePicker value={settings.theme} onChange={handleThemeChange} />
        </SettingsRow>
        <SettingsRow title={t('settings.language')} note={t('settings.languageNote')}>
          <SelectField
            id="set-language"
            label={t('settings.language')}
            hideLabel
            lang={settings.language}
            value={settings.language}
            onChange={(e) => handleLanguageChange(e.target.value as Settings['language'])}
            options={LANGUAGES.map((l) => ({
              value: l.code,
              label: l.code === 'en' ? l.name : `${l.name} · ${l.english}`,
            }))}
          />
        </SettingsRow>
      </ul>
    </Card>
  );
};

export default AppearanceCard;
