import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import QualityReportApi from '@/api-requests/quality-report.requests';
import { Banner } from '@/components/ui/banner';
import useRequest from '@/hooks/useRequest';
import { formatDate } from '@/lib/format';

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
