import { useTranslation } from 'react-i18next';
import SettingsPanel from '@/components/settings/SettingsPanel';

/**
 * Farmer settings, inside the stall panel shell: only the shared panel. The stall's own selling settings live where
 * they take effect: the order cutoff on Stall & pickup (FR-067), slot length and orders per slot in Generate slots.
 */
const FarmerSettingsPage = () => {
  const { t } = useTranslation('FarmerSettings');
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 text-ink font-bold">{t('title')}</h1>
        <p className="text-body-lg text-ink-muted">{t('intro')}</p>
      </div>

      <SettingsPanel role="farmer" />
    </div>
  );
};

export default FarmerSettingsPage;
