import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';
import FarmerApi from '@/api-requests/farmer.requests';
import StallApi from '@/api-requests/stall.requests';
import { Banner } from '@/components/ui/banner';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/data-state';
import useRequest from '@/hooks/useRequest';
import useSession from '@/hooks/useSession';
import { formatDate } from '@/lib/format';

/**
 * FR-071 — what a Farmer sees before approval, once rejected, or once suspended. `approved` never renders here: the
 * Farmer already has the full dashboard, so this route sends them there instead.
 *
 * The application (`GET /farmer/apply`) is the source of truth for `approvalStatus`, the stall name, contact, and the
 * reject/suspend reason: it answers for an account still on the `customer` role, which is every Farmer who has not yet
 * been approved. `GET /farmer/profile` is Farmer-role only and 403s for that same account (checked against the live
 * API), so it is read only as a bonus for the one extra fact it has that the application does not — the first market —
 * and its absence never blocks the page. In practice that bonus only ever loads for a _suspended_ account (they were
 * approved once, so they already hold the Farmer role); `pending` and `rejected` are normally intercepted by
 * `RequireAuth` before this route is even reached, since those accounts are still customers, but this page still
 * handles them defensively for a stale session or a direct link.
 */
const FarmerPendingPage = () => {
  const { t } = useTranslation('FarmerPending');
  const { t: tc } = useTranslation();
  const { user } = useSession();

  const { state: appLoad, retry: retryApp } = useRequest('farmer-pending-application', () => FarmerApi.myApplication());
  const { state: profileLoad } = useRequest('farmer-pending-profile', () => StallApi.myProfile());

  if (appLoad.kind === 'loading') {
    return (
      <p role="status" className="text-ink-muted">
        {tc('notify.list.loading')}
      </p>
    );
  }
  if (appLoad.kind === 'error') {
    return <LoadError noun={t('error.noun')} onRetry={retryApp} />;
  }

  const application = appLoad.data.data;
  // A Farmer account always has an application on record; if it is somehow missing there is nothing to review yet.
  if (!application) {
    return <Navigate to="/become-farmer" replace />;
  }
  if (application.approvalStatus === 'approved') {
    return <Navigate to="/farmer" replace />;
  }

  const stall = profileLoad.kind === 'ready' ? profileLoad.data : null;
  const firstMarket = stall?.markets[0]?.marketName ?? null;
  const registeredOn = formatDate(new Date(application.createdAt));

  const title =
    application.approvalStatus === 'rejected'
      ? t('title.rejected')
      : application.approvalStatus === 'suspended'
        ? t('title.suspended')
        : t('title.pending');

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-overline text-ink-muted m-0">
          {t(application.approvalStatus === 'suspended' ? 'overline.suspended' : 'overline.registered', {
            stall: application.stallName,
            date: registeredOn,
          })}
        </p>
        <h1 className="text-h1 text-ink font-bold">{title}</h1>
      </div>

      {application.approvalStatus === 'pending' && (
        <div className="flex flex-col gap-6">
          <Banner variant="info" title={t('reviewing.title')}>
            {t('reviewing.text')}
          </Banner>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('now.title')}</h2>
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[16px]">
              <li>
                <Trans
                  t={t}
                  i18nKey="now.details"
                  components={{ a: <Link to="/farmer/stall" className="text-brand underline" /> }}
                />
              </li>
              <li>{t('now.pin')}</li>
              <li>{t('now.products')}</li>
            </ul>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('details.title')}</h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
              <dt className="text-ink-muted">{t('details.stall')}</dt>
              <dd className="m-0">{application.stallName}</dd>
              <dt className="text-ink-muted">{t('details.contact')}</dt>
              <dd className="m-0">{application.contactPerson}</dd>
              <dt className="text-ink-muted">{t('details.email')}</dt>
              <dd className="m-0">{user?.email ?? ''}</dd>
              {firstMarket && (
                <>
                  <dt className="text-ink-muted">{t('details.market')}</dt>
                  <dd className="m-0">{firstMarket}</dd>
                </>
              )}
            </dl>
          </Card>
        </div>
      )}

      {application.approvalStatus === 'rejected' && (
        <div className="flex flex-col gap-6">
          <Banner variant="danger" title={t('rejected.bannerTitle')}>
            {application.rejectReason ?? t('rejected.noReason')}
          </Banner>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('rejected.again.title')}</h2>
            <p className="text-[16px]">{t('rejected.again.text')}</p>
            <ButtonLink to="/become-farmer" className="self-start">
              {t('rejected.again.link')}
            </ButtonLink>
          </Card>
        </div>
      )}

      {application.approvalStatus === 'suspended' && (
        <div className="flex flex-col gap-6">
          <Banner variant="danger" title={t('suspended.bannerTitle')}>
            {application.suspendReason ?? t('suspended.noReason')}
          </Banner>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('running.title')}</h2>
            <p className="text-[16px]">{t('running.text')}</p>
            <ButtonLink to="/farmer/orders" className="self-start">
              {t('running.link')}
            </ButtonLink>
          </Card>

          <Card className="flex flex-col gap-3 p-6">
            <h2 className="text-h3">{t('reinstate.title')}</h2>
            <p className="text-[15px]">
              <Trans
                t={t}
                i18nKey="reinstate.text"
                components={{ a: <Link to="/contact" className="text-brand underline" /> }}
              />
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FarmerPendingPage;
