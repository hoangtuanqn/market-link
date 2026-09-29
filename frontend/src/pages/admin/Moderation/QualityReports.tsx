import { isAxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QualityReportApi, {
  type AdminQualityFilter,
  type QualityReportDto,
} from '@/api-requests/quality-report.requests';
import MarketCardSkeleton from '@/components/MarketCardSkeleton';
import QualityReportFacts from '@/components/QualityReportFacts';
import { stockDay } from '@/components/stockDay';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { DataState, LoadError } from '@/components/ui/data-state';
import { Dialog } from '@/components/ui/dialog';
import { ADMIN_FARMERS_PATH } from '@/constants/nav';
import useRequest from '@/hooks/useRequest';
import { STRIKE_WINDOW_DAYS, STRIKES_TO_LOCK } from '@/lib/spoilage';
import Helper from '@/utils/helper';
import Notification from '@/utils/notification';

const FILTERS = ['needs', 'open', 'decided'] as const;
type Filter = (typeof FILTERS)[number];

const QUERY: Record<Filter, AdminQualityFilter> = {
  needs: { status: 'open', escalated: true, pageSize: 50 },
  open: { status: 'open', pageSize: 50 },
  decided: { status: 'decided', pageSize: 50 },
};

type Deciding = { report: QualityReportDto; kind: 'confirm' | 'dismiss' };

export default function QualityReports() {
  const { t } = useTranslation('AdminModeration');
  const { t: tc } = useTranslation();
  const [filter, setFilter] = useState<Filter>('needs');
  const { state, retry, mutate } = useRequest(`admin-quality:${filter}`, () =>
    QualityReportApi.adminList(QUERY[filter]).then((result) => result.items),
  );
  const [deciding, setDeciding] = useState<Deciding | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const open = (report: QualityReportDto, kind: Deciding['kind']) => {
    setDeciding({ report, kind });
    setNote('');
    setNoteError(undefined);
  };

  const decide = async () => {
    if (!deciding) return;
    const text = note.trim();
    if (deciding.kind === 'dismiss' && !text) {
      setNoteError(t('quality.noteRequired'));
      return;
    }
    setBusy(true);
    try {
      const updated =
        deciding.kind === 'confirm'
          ? await QualityReportApi.confirm(deciding.report.id, text || undefined)
          : await QualityReportApi.dismiss(deciding.report.id, text);
      mutate((items) => items.map((r) => (r.id === updated.id ? updated : r)));
      Notification.success({ text: t('quality.done') });
      setDeciding(null);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        Notification.info({ text: t('quality.alreadyDecided') });
        setDeciding(null);
        retry();
      } else {
        const fields = Helper.getFieldErrors(error);
        if (fields.note) setNoteError(fields.note);
        else Notification.error({ text: Helper.getErrorMessage(error, tc('errors.network')) });
      }
    } finally {
      setBusy(false);
    }
  };

  const strikeFollows =
    deciding?.kind === 'confirm' && deciding.report.shelfLifeExtended && deciding.report.beforePromise;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-muted max-w-160">{t('quality.boundary')}</p>
      <div role="group" aria-label={t('quality.filterLabel')} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
            {t(`quality.filter.${f}`)}
          </Chip>
        ))}
      </div>

      {state.kind === 'loading' ? (
        <MarketCardSkeleton count={2} />
      ) : state.kind === 'error' ? (
        <LoadError noun={t('quality.noun')} onRetry={retry} />
      ) : state.data.length === 0 ? (
        <DataState title={t('quality.emptyTitle')} text={t('quality.emptyText')} />
      ) : (
        <div className="flex flex-col gap-4">
          {state.data.map((r) => (
            <Card as="article" key={r.id} aria-labelledby={`quality-${r.id}`} className="flex flex-col gap-2 p-4">
              <h3 id={`quality-${r.id}`} className="text-[17px] font-bold">
                {t('quality.line', { code: r.orderCode, product: r.productName, stall: r.stallName })}
              </h3>
              <QualityReportFacts
                problem={r.problem}
                note={r.note}
                shelfLifeExtended={r.shelfLifeExtended}
                extendedByDays={r.extendedByDays}
                photoUrl={r.photoUrl}
                photoAlt={t('quality.photoAlt')}
                dates={t('quality.details', {
                  customer: r.customerName,
                  pickup: stockDay(r.pickupDate),
                  bestBefore: stockDay(r.bestBefore) ?? '—',
                  spoiled: stockDay(r.spoiledOn),
                  when: tc(r.beforePromise ? 'spoilage.beforePromise' : 'spoilage.afterPromise'),
                })}
              />
              <p className="text-small">
                {r.farmerResponse ? t('quality.reply', { text: r.farmerResponse }) : t('quality.noReply')}
              </p>
              <p className="text-small font-bold">
                {tc('spoilage.strikes', {
                  count: r.stallActiveStrikes,
                  limit: STRIKES_TO_LOCK,
                  days: STRIKE_WINDOW_DAYS,
                })}
              </p>
              {r.status === 'open' ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => open(r, 'dismiss')}>
                    {t('quality.dismiss')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => open(r, 'confirm')}>
                    {t('quality.confirm')}
                  </Button>
                </div>
              ) : (
                <p className="text-small">
                  <b>{tc(`spoilage.status.${r.status}`)}</b>
                  {r.decisionNote ? ` · ${t('quality.decisionNote', { text: r.decisionNote })}` : ''}
                </p>
              )}
              {r.stallActiveStrikes >= STRIKES_TO_LOCK && r.stallStatus === 'approved' && (
                <ButtonLink
                  to={`${ADMIN_FARMERS_PATH}/${r.farmerId}?suspend=shelfLifeViolations`}
                  variant="danger"
                  size="sm"
                  className="self-end"
                  aria-label={t('quality.suspendLabel', { stall: r.stallName })}
                >
                  {t('quality.suspend')}
                </ButtonLink>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={deciding !== null}
        tone={deciding?.kind === 'confirm' ? 'danger' : undefined}
        title={deciding ? t(deciding.kind === 'confirm' ? 'quality.confirmTitle' : 'quality.dismissTitle') : ''}
        onClose={() => setDeciding(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeciding(null)} disabled={busy}>
              {tc('actions.cancel')}
            </Button>
            <Button
              variant={deciding?.kind === 'confirm' ? 'dangerFill' : 'primary'}
              onClick={() => void decide()}
              disabled={busy}
            >
              {deciding?.kind === 'confirm' ? t('quality.confirm') : t('quality.dismiss')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>{deciding?.kind === 'confirm' ? t('quality.confirmText') : t('quality.dismissText')}</p>
          {strikeFollows && <p className="text-small font-bold">{t('quality.confirmStrike')}</p>}
          <div className="flex flex-col gap-1">
            <label htmlFor="quality-note" className="text-small font-bold">
              {deciding?.kind === 'dismiss' ? t('quality.noteLabel') : t('quality.noteOptional')}
            </label>
            <textarea
              id="quality-note"
              rows={3}
              maxLength={255}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteError(undefined);
              }}
              aria-invalid={!!noteError}
              aria-describedby={noteError ? 'quality-note-error' : undefined}
              className={Helper.cn(
                'bg-surface-raised text-body min-h-18 rounded-sm border-[1.5px] p-3',
                noteError ? 'border-danger' : 'border-line-strong',
              )}
            />
            {noteError && (
              <span id="quality-note-error" role="alert" className="text-danger text-[13px] font-bold">
                {noteError}
              </span>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
