import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Banner } from '@/components/ui/banner';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { farmer, marketName } from '@/data/catalog';
import { formatDate } from '@/lib/format';

const pending = farmer(9)!;
const suspended = farmer(10)!;
/** Not modeled anywhere else — a one-off fact for this screen, same as the prototype's own literal date. */
const SUSPENDED_ON = new Date(2026, 8, 20);
/** "02/08/2026" (how the seeded stalls spell it) → the reader's date format */
const dmy = (s: string) => {
  const [d, m, y] = s.split('/').map(Number);
  return y ? formatDate(new Date(y, m - 1, d)) : s;
};

/** FR-071 — what a Farmer sees before approval, or after being suspended. */
const FarmerPendingPage = () => {
  const { t } = useTranslation('FarmerPending');
  const [preview, setPreview] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-overline text-ink-muted m-0">
            {preview
              ? t('overline.suspended', { stall: suspended.stall, date: formatDate(SUSPENDED_ON) })
              : t('overline.registered', { stall: pending.stall, date: dmy(pending.registered) })}
          </p>
          <h1 className="font-hand text-h1">{preview ? t('title.suspended') : t('title.pending')}</h1>
        </div>
        <Chip pressed={preview} onClick={() => setPreview((v) => !v)}>
          {t('previewToggle')}
        </Chip>
      </div>

      {!preview ? (
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
                  components={{ link: <Link to="/farmer/stall" className="text-brand underline" /> }}
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
              <dd className="m-0">{pending.stall}</dd>
              <dt className="text-ink-muted">{t('details.contact')}</dt>
              <dd className="m-0">
                {pending.person} · {pending.phone}
              </dd>
              <dt className="text-ink-muted">{t('details.email')}</dt>
              <dd className="m-0">{pending.email}</dd>
              <dt className="text-ink-muted">{t('details.market')}</dt>
              <dd className="m-0">{marketName(pending.markets[0])}</dd>
            </dl>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Banner variant="danger" title={t('suspended.title', { date: formatDate(SUSPENDED_ON) })}>
            {t('suspended.text', { reason: suspended.suspendedReason })}
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
                components={{ link: <Link to="/contact" className="text-brand underline" /> }}
              />
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FarmerPendingPage;
