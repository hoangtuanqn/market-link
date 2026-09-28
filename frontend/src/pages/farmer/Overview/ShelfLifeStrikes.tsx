import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import QualityReportApi from '@/api-requests/quality-report.requests';
import { Banner } from '@/components/ui/banner';
import useRequest from '@/hooks/useRequest';
import { formatDate } from '@/lib/format';

/**
 * FR-123 (spec §4.4.4) — "Shelf-life strikes: 2 of 3 in 90 days" on the Farmer overview, only when the stall has
 * strikes. A secondary notice (Ruling 14): nothing while loading or when the read fails; the full list with its four
 * states is the Reviews → Spoiled reports tab.
 */
export default function ShelfLifeStrikes() {
  const { t } = useTranslation('FarmerOverview');
  const { state } = useRequest('shelf-life-standing', () => QualityReportApi.standing());
  if (state.kind !== 'ready' || state.data.activeViolations === 0) return null;
  const s = state.data;
  return (
    <Banner
      variant={s.extensionLockedUntil ? 'danger' : 'warning'}
      title={t('strikes.title', { count: s.activeViolations, limit: s.limit, days: s.windowDays })}
    >
      {s.extensionLockedUntil
        ? t('strikes.locked', { date: formatDate(new Date(s.extensionLockedUntil)) })
        : t('strikes.text')}{' '}
      <Link to="/farmer/reviews?tab=spoiled" className="underline">
        {t('strikes.link')}
      </Link>
    </Banner>
  );
}
