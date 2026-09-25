import { useTranslation } from 'react-i18next';
import SettingsRow from '@/components/SettingsRow';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { Card } from '@/components/ui/card';
import { SelectField } from '@/components/ui/input';

/**
 * Admin settings (prototype admin/settings.html). Platform defaults are saved on the admin's own account for now:
 * whether a changed default reaches stalls that never set their own is still an open question in the prototype.
 */
const AdminSettingsPage = () => {
  const { t } = useTranslation('AdminSettings');
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      <SettingsPanel role="admin">
        {(draft, set) => (
          <Card as="section" aria-labelledby="set-platform" className="flex flex-col gap-4 p-6">
            <h2 id="set-platform" className="text-h3">
              {t('platform')}
            </h2>
            <p className="text-small text-ink-muted">{t('platformNote')}</p>
            <ul className="m-0 flex flex-col p-0">
              <SettingsRow title={t('cutoff')}>
                <SelectField
                  id="set-dcut"
                  label={t('cutoff')}
                  hideLabel
                  value={draft.extras['platform.cutoff'] ?? '12'}
                  onChange={(e) => set({ extras: { ...draft.extras, 'platform.cutoff': e.target.value } })}
                  options={['6', '12', '24'].map((v) => ({ value: v, label: t('hours', { count: Number(v) }) }))}
                />
              </SettingsRow>
              <SettingsRow title={t('max')}>
                <SelectField
                  id="set-dmax"
                  label={t('max')}
                  hideLabel
                  value={draft.extras['platform.max'] ?? '5'}
                  onChange={(e) => set({ extras: { ...draft.extras, 'platform.max': e.target.value } })}
                  options={['3', '5', '8'].map((v) => ({ value: v, label: t('orders', { count: Number(v) }) }))}
                />
              </SettingsRow>
              <SettingsRow title={t('timezone')} note={t('timezoneNote')}>
                <SelectField
                  id="set-tz"
                  label={t('timezone')}
                  hideLabel
                  value="Asia/Ho_Chi_Minh"
                  disabled
                  options={['Asia/Ho_Chi_Minh']}
                />
              </SettingsRow>
            </ul>
          </Card>
        )}
      </SettingsPanel>
    </div>
  );
};

export default AdminSettingsPage;
