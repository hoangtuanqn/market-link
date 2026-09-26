import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import SettingsRow from '@/components/SettingsRow';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { Card } from '@/components/ui/card';
import { SelectField } from '@/components/ui/input';
import { SHOW_WIP } from '@/config/wip';
import { markets } from '@/data/home';

const SLOTS = ['earliest', '06-07', '07-08', '08-09'] as const;

/** Customer settings: the shared panel plus Shopping (market you shop at most is used on Markets). */
const CustomerSettingsPage = () => {
  const { t } = useTranslation('CustomerSettings');
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/account" className="text-brand underline">
          {t('breadcrumbAccount')}
        </Link>{' '}
        · {t('title')}
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      <SettingsPanel role="customer">
        {(draft, set) => (
          <Card as="section" aria-labelledby="set-shopping" className="flex flex-col gap-4 p-6">
            <h2 id="set-shopping" className="text-h3">
              {t('shopping')}
            </h2>
            <ul className="m-0 flex flex-col p-0">
              {/* The market list here is still sample data (ids do not match real markets) → shown in dev only (config/wip.ts). */}
              {SHOW_WIP && (
                <SettingsRow title={t('market')} note={t('marketNote')}>
                  <SelectField
                    id="set-market"
                    label={t('market')}
                    hideLabel
                    value={draft.preferredMarket}
                    onChange={(e) => set({ preferredMarket: e.target.value })}
                    options={[
                      { value: '', label: t('marketNone') },
                      ...markets.map((m) => ({ value: String(m.id), label: m.name })),
                    ]}
                  />
                </SettingsRow>
              )}
              <SettingsRow title={t('slot')} note={t('slotNote')}>
                <SelectField
                  id="set-slot"
                  label={t('slot')}
                  hideLabel
                  value={draft.extras['pref.slot'] ?? 'earliest'}
                  onChange={(e) => set({ extras: { ...draft.extras, 'pref.slot': e.target.value } })}
                  options={SLOTS.map((s) => ({ value: s, label: t(`slots.${s}`) }))}
                />
              </SettingsRow>
            </ul>
          </Card>
        )}
      </SettingsPanel>
    </div>
  );
};

export default CustomerSettingsPage;
