import { useTranslation } from 'react-i18next';
import SettingsRow from '@/components/SettingsRow';
import SettingsPanel from '@/components/settings/SettingsPanel';
import { Card } from '@/components/ui/card';
import { SelectField } from '@/components/ui/input';

/** Selling defaults (prototype farmer/settings.html): saved with the account, used once slot generation exists. */
const DEFAULTS = [
  {
    key: 'sell.cutoff',
    label: 'cutoff',
    note: 'cutoffNote',
    values: ['6', '12', '18', '24'],
    fallback: '12',
    unit: 'hours',
  },
  { key: 'sell.slot', label: 'slot', note: 'slotNote', values: ['15', '30', '60'], fallback: '30', unit: 'minutes' },
  { key: 'sell.max', label: 'max', note: undefined, values: ['3', '5', '8', '10'], fallback: '5', unit: 'orders' },
] as const;

/**
 * Farmer settings, inside the stall panel shell. Not in the SRS, and the Selling defaults overlap FR-060, FR-061 and
 * FR-067, which put cutoff and slot settings on the stall profile: ask LEAD/FE1 which screen owns them.
 */
const FarmerSettingsPage = () => {
  const { t } = useTranslation('FarmerSettings');
  return (
    <div className="flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{t('title')}</h1>
        <p className="text-body-lg">{t('intro')}</p>
      </div>

      <SettingsPanel role="farmer">
        {(draft, set) => (
          <Card as="section" aria-labelledby="set-selling" className="flex flex-col gap-4 p-6">
            <h2 id="set-selling" className="text-h3">
              {t('selling')}
            </h2>
            <p className="text-small text-ink-muted">{t('sellingNote')}</p>
            <ul className="m-0 flex flex-col p-0">
              {DEFAULTS.map((d) => (
                <SettingsRow key={d.key} title={t(d.label)} note={d.note && t(d.note)}>
                  <SelectField
                    id={`set-${d.label}`}
                    label={t(d.label)}
                    hideLabel
                    value={draft.extras[d.key] ?? d.fallback}
                    onChange={(e) => set({ extras: { ...draft.extras, [d.key]: e.target.value } })}
                    options={d.values.map((v) => ({ value: v, label: t(d.unit, { count: Number(v) }) }))}
                  />
                </SettingsRow>
              ))}
            </ul>
          </Card>
        )}
      </SettingsPanel>
    </div>
  );
};

export default FarmerSettingsPage;
