import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ApplicationHistory } from '@/components/ApplicationHistory';
import { Banner } from '@/components/ui/banner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { VideoThumb } from '@/components/VideoThumb';
import { ORDER_STATUS_META } from '@/constants/orderStatus';
import { formatDate } from '@/lib/format';
import type { FarmerProfileType } from '@/types/farmer.types';
import { apiBase, TIMELINE } from './constants';

type ApplicationStatusProps = {
  data: FarmerProfileType;
  confirmWithdraw: boolean;
  isWithdrawing: boolean;
  onApplyAgain: () => void;
  onAskWithdraw: () => void;
  onCancelWithdraw: () => void;
  onWithdraw: () => void;
};

/** The application once it is sent: its content, where it stands, past attempts, and the way to withdraw or re-apply. */
const ApplicationStatus = ({
  data,
  confirmWithdraw,
  isWithdrawing,
  onApplyAgain,
  onAskWithdraw,
  onCancelWithdraw,
  onWithdraw,
}: ApplicationStatusProps) => {
  const { t } = useTranslation('CustomerBecomeFarmer');
  const copy =
    data.approvalStatus === 'pending'
      ? { title: t('sent.title'), text: t('sent.intro') }
      : { title: t(`approval.${data.approvalStatus}.title`), text: t(`approval.${data.approvalStatus}.text`) };
  const photoCount = data.photoUrls?.length ?? 0;
  const evidence = photoCount
    ? t(data.videoUrl ? 'sent.photosAndVideo' : 'sent.photos', { count: photoCount })
    : t(data.videoUrl ? 'sent.noPhotosVideo' : 'sent.noPhotos');
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <p className="text-small text-ink-muted">
        <Link to="/account" className="text-brand underline">
          {t('breadcrumbAccount')}
        </Link>{' '}
        · {t('breadcrumb')}
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="text-h1">{copy.title}</h1>
        <p className="text-body-lg">{copy.text}</p>
      </div>

      {data.approvalStatus === 'suspended' && (
        <Banner variant="warning" title={t('suspendedBanner.title')}>
          {/* The suspension reason is written by the Admin; if there is none it still says clearly what is happening. */}
          {data.suspendReason ?? t('suspendedBanner.text')}
        </Banner>
      )}

      {/* Being rejected without knowing why means the re-application will be wrong just the same. */}
      {data.approvalStatus === 'rejected' && (
        <Banner variant="danger" title={t('rejectedBanner.title')}>
          {data.rejectReason ?? t('rejectedBanner.noReason')}
        </Banner>
      )}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="text-h3">{t('sent.summary')}</h2>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
          <dt className="text-ink-muted">{t('sent.stall')}</dt>
          <dd className="m-0">{data.stallName}</dd>
          <dt className="text-ink-muted">{t('step1.person')}</dt>
          <dd className="m-0">{data.contactPerson}</dd>
          {data.description && (
            <>
              <dt className="text-ink-muted">{t('sent.about')}</dt>
              <dd className="m-0">{data.description}</dd>
            </>
          )}
          {(!!data.photoUrls?.length || data.videoUrl) && (
            <>
              <dt className="text-ink-muted">{t('sent.evidence')}</dt>
              <dd className="m-0">{evidence}</dd>
            </>
          )}
          <dt className="text-ink-muted">{t('sent.status')}</dt>
          <dd className="m-0">{t(`statusValue.${data.approvalStatus}`)}</dd>
          <dt className="text-ink-muted">{t('sent.sentOn')}</dt>
          <dd className="m-0">{formatDate(new Date(data.createdAt))}</dd>
        </dl>
        {(!!data.photoUrls?.length || data.videoUrl) && (
          <div className="flex flex-wrap items-center gap-2">
            {data.photoUrls?.map((url) => (
              <img
                key={url}
                src={`${apiBase()}${url}`}
                alt={t('sent.photoAlt')}
                className="border-line-strong size-20 rounded-sm border-[1.5px] object-cover"
              />
            ))}
            {data.videoUrl && <VideoThumb url={data.videoUrl} />}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {/* Only a rejected application can be re-submitted — the server blocks it exactly the same way. */}
          {data.approvalStatus === 'rejected' && <Button onClick={onApplyAgain}>{t('sent.applyAgain')}</Button>}
          {/* While pending they can still change their mind; once there is a result there is nothing left to withdraw. */}
          {data.approvalStatus === 'pending' && (
            <Button variant="danger" disabled={isWithdrawing} onClick={onAskWithdraw}>
              {t('sent.withdraw')}
            </Button>
          )}
          <ButtonLink to="/markets" variant="secondary">
            {t('sent.keepShopping')}
          </ButtonLink>
        </div>
      </Card>

      {data.history.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-h2">{t('sent.historyTitle')}</h2>
          <p className="text-body">{t('sent.historyText')}</p>
          <ApplicationHistory entries={data.history} statusLabel={(s) => t(`statusValue.${s}`)} />
        </section>
      )}

      <Dialog
        open={confirmWithdraw}
        tone="danger"
        title={t('withdrawDialog.title')}
        onClose={onCancelWithdraw}
        actions={
          <>
            <Button variant="secondary" disabled={isWithdrawing} onClick={onCancelWithdraw}>
              {t('withdrawDialog.keep')}
            </Button>
            <Button variant="dangerFill" disabled={isWithdrawing} onClick={onWithdraw}>
              {t('withdrawDialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('withdrawDialog.text')}</p>
      </Dialog>

      {data.approvalStatus === 'pending' && (
        <div className="flex flex-col gap-3">
          <h2 className="text-h2">{t('sent.progress')}</h2>
          <ol className="m-0 flex flex-col p-0">
            {TIMELINE.map((key, i) => (
              <li key={key} className="relative grid grid-cols-[28px_1fr] items-start gap-3 py-2">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="border-line-strong absolute -top-2 left-3.25 h-4 border-l-2 border-dotted"
                  />
                )}
                <span
                  className={`grid size-7 flex-none place-items-center rounded-full ${ORDER_STATUS_META[key].className} ${i > 0 ? 'opacity-45' : ''}`}
                >
                  {(() => {
                    const Icon = ORDER_STATUS_META[key].icon;
                    return <Icon size={14} />;
                  })()}
                </span>
                <div>
                  <b className="text-[15px]">{t(`timeline.${key}.title`)}</b>
                  <time className="text-ink-muted block text-[13px]">
                    {t(`timeline.${key}.note`)} · {t(`timeline.${key}.by`)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default ApplicationStatus;
