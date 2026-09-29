import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QualityReportApi, { type QualityReportDto } from '@/api-requests/quality-report.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import QualityReportFacts from '@/components/QualityReportFacts';
import { stockDay } from '@/components/stockDay';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataState, LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import { formatDate } from '@/lib/format';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const REPLY_MAX = 500;

export default function QualityReports() {
  const { t } = useTranslation('FarmerReviews');
  const { t: tc } = useTranslation();
  const { state, retry, mutate } = useRequest('farmer-quality-reports', () => QualityReportApi.mine({ pageSize: 50 }));
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const save = async (report: QualityReportDto) => {
    const text = (drafts[report.id] ?? report.farmerResponse ?? '').trim();
    if (!text) return;
    setSaving(report.id);
    try {
      const updated = await QualityReportApi.respond(report.id, text);
      mutate((data) => ({
        ...data,
        reports: { ...data.reports, items: data.reports.items.map((r) => (r.id === updated.id ? updated : r)) },
      }));
      Notification.success({ text: t('spoiled.saved') });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        Notification.info({ text: t('spoiled.alreadyDecided') });
        retry();
      } else {
        Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      }
    } finally {
      setSaving(null);
    }
  };

  if (state.kind === 'loading') return <MarketCardSkeleton count={2} />;
  if (state.kind === 'error') return <LoadError noun={t('spoiled.noun')} onRetry={retry} />;

  const { standing, reports } = state.data;
  const lockedUntil = standing.extensionLockedUntil;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body max-w-160">{t('spoiled.intro')}</p>
      {standing.activeViolations > 0 && (
        <Banner
          variant={lockedUntil ? 'danger' : 'warning'}
          title={
            lockedUntil
              ? t('spoiled.lockTitle', { date: formatDate(new Date(lockedUntil)) })
              : tc('spoilage.strikes', {
                  count: standing.activeViolations,
                  limit: standing.limit,
                  days: standing.windowDays,
                })
          }
        >
          {lockedUntil ? t('spoiled.lockText') : t('spoiled.strikesText')}
        </Banner>
      )}
      {reports.items.length === 0 ? (
        <DataState title={t('spoiled.emptyTitle')} text={t('spoiled.emptyText')} />
      ) : (
        reports.items.map((r) => (
          <Card as="article" key={r.id} aria-labelledby={`report-${r.id}`} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 id={`report-${r.id}`} className="text-[17px] font-bold">
                {r.productName}
              </h3>
              <span className="bg-surface-sunken text-ink rounded-full px-2 text-[13px] font-bold">
                {tc(`spoilage.status.${r.status}`)}
              </span>
            </div>
            <p className="text-small text-ink-muted">
              {t('spoiled.line', { code: r.orderCode, customer: r.customerName })}
            </p>
            <QualityReportFacts
              problem={r.problem}
              note={r.note}
              shelfLifeExtended={r.shelfLifeExtended}
              extendedByDays={r.extendedByDays}
              photoUrl={r.photoUrl}
              photoAlt={t('spoiled.photoAlt')}
              dates={t('spoiled.dates', {
                pickup: stockDay(r.pickupDate),
                bestBefore: stockDay(r.bestBefore) ?? '—',
                spoiled: stockDay(r.spoiledOn),
                when: tc(r.beforePromise ? 'spoilage.beforePromise' : 'spoilage.afterPromise'),
              })}
            />
            {r.status === 'open' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save(r);
                }}
                className="flex flex-col gap-2"
              >
                <label htmlFor={`reply-${r.id}`} className="text-small font-bold">
                  {t('spoiled.replyLabel')}
                </label>
                <textarea
                  id={`reply-${r.id}`}
                  rows={2}
                  maxLength={REPLY_MAX}
                  value={drafts[r.id] ?? r.farmerResponse ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder={t('spoiled.replyPlaceholder')}
                  className="border-line-strong bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3"
                />
                <Button type="submit" size="sm" className="self-start" disabled={saving === r.id}>
                  {t('spoiled.save')}
                </Button>
              </form>
            ) : (
              <>
                {r.farmerResponse && <p className="text-small">{t('spoiled.yourReply', { text: r.farmerResponse })}</p>}
                {r.decisionNote && <p className="text-small">{t('spoiled.decisionNote', { text: r.decisionNote })}</p>}
              </>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
